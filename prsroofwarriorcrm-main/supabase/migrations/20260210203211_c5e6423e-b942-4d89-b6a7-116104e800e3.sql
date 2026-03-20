
-- Phase 17 & 18: Customer numbering & Job ID format overhaul

-- 1. Add customer_number to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- 2. Generate customer numbers for existing customers
DO $$
DECLARE
  rec RECORD;
  day_date DATE;
  seq INT;
BEGIN
  FOR rec IN SELECT id, created_at FROM public.customers ORDER BY created_at ASC
  LOOP
    day_date := rec.created_at::date;
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 'PRS\d{6}-(\d{3})') AS INT)), 0) + 1
    INTO seq FROM public.customers WHERE customer_number IS NOT NULL AND created_at::date = day_date;
    UPDATE public.customers SET customer_number = 'PRS' || TO_CHAR(day_date, 'YYMMDD') || '-' || LPAD(seq::text, 3, '0') WHERE id = rec.id;
  END LOOP;
END $$;

-- Make customer_number NOT NULL after backfill
ALTER TABLE public.customers ALTER COLUMN customer_number SET NOT NULL;

-- 3. Trigger to auto-generate customer_number on INSERT
CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 'PRS\d{6}-(\d{3})') AS INT)), 0) + 1
  INTO seq FROM public.customers WHERE created_at::date = today AND customer_number IS NOT NULL;
  NEW.customer_number := 'PRS' || TO_CHAR(today, 'YYMMDD') || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_customer_number
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.generate_customer_number();

-- 4. Update generate_job_id to use new format: [customer_number]-[claim#]-[seq]
CREATE OR REPLACE FUNCTION public.generate_job_id()
RETURNS TRIGGER AS $$
DECLARE
  cust_num TEXT;
  parent_claim TEXT;
  max_seq INT;
BEGIN
  SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;

  IF NEW.parent_job_id IS NULL THEN
    -- Main Job
    IF NEW.claim_number IS NOT NULL AND NEW.claim_number != '' THEN
      NEW.job_id := cust_num || '-' || NEW.claim_number || '-1';
    ELSE
      -- Auto-generate claim number from sequence
      NEW.job_id := 'PRS-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.job_seq')::text, 3, '0');
      NEW.claim_number := SUBSTRING(NEW.job_id FROM 5);
    END IF;
    NEW.sub_number := NULL;
  ELSE
    -- Sub Job: inherit customer_id and claim from parent
    SELECT claim_number, customer_id INTO parent_claim, NEW.customer_id
    FROM public.jobs WHERE id = NEW.parent_job_id;

    SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;

    NEW.sub_number := (SELECT COALESCE(MAX(sub_number), 0) + 1 FROM public.jobs WHERE parent_job_id = NEW.parent_job_id);
    NEW.claim_number := parent_claim;
    
    -- Sub jobs get seq = sub_number + 1 (main is 1)
    NEW.job_id := cust_num || '-' || parent_claim || '-' || (NEW.sub_number + 1)::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. Claim# validation: 5-20 chars, alphanumeric + -_.
-- Using a validation trigger instead of CHECK constraint for flexibility
CREATE OR REPLACE FUNCTION public.validate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for main jobs with a claim number
  IF NEW.parent_job_id IS NULL AND NEW.claim_number IS NOT NULL AND NEW.claim_number != '' THEN
    IF LENGTH(NEW.claim_number) < 5 OR LENGTH(NEW.claim_number) > 20 THEN
      RAISE EXCEPTION 'Claim number must be between 5 and 20 characters';
    END IF;
    IF NEW.claim_number !~ '^[A-Za-z0-9_.\-]+$' THEN
      RAISE EXCEPTION 'Claim number can only contain letters, numbers, dashes, underscores, and periods';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_claim
BEFORE INSERT OR UPDATE OF claim_number ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_claim_number();

-- 6. Unique claim per customer for main jobs
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_claim 
ON public.jobs (customer_id, claim_number) 
WHERE parent_job_id IS NULL AND claim_number IS NOT NULL;

-- 7. Cascade claim edit trigger
CREATE OR REPLACE FUNCTION public.cascade_claim_edit()
RETURNS TRIGGER AS $$
DECLARE
  cust_num TEXT;
BEGIN
  IF NEW.claim_number IS DISTINCT FROM OLD.claim_number AND OLD.parent_job_id IS NULL THEN
    SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;
    
    -- Update main job's own job_id
    NEW.job_id := cust_num || '-' || NEW.claim_number || '-1';
    
    -- Update all sub jobs
    UPDATE public.jobs SET 
      claim_number = NEW.claim_number,
      job_id = cust_num || '-' || NEW.claim_number || '-' || (sub_number + 1)::text
    WHERE parent_job_id = OLD.id;
    
    -- Audit log
    INSERT INTO public.audits (user_id, entity_type, entity_id, action, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'job', OLD.id, 'claim_edit_cascade',
      jsonb_build_object('old_claim', OLD.claim_number, 'new_claim', NEW.claim_number)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_claim_edit
BEFORE UPDATE OF claim_number ON public.jobs
FOR EACH ROW WHEN (OLD.parent_job_id IS NULL)
EXECUTE FUNCTION public.cascade_claim_edit();
