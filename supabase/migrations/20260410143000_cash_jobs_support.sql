-- Cash jobs support: explicit job type + estimate amount
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'insurance',
ADD COLUMN IF NOT EXISTS estimate_amount numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS jobs_job_type_check;

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN ('insurance', 'cash'));

CREATE SEQUENCE IF NOT EXISTS public.cash_job_seq START 1;

-- Ensure estimate mirrors ACV for cash jobs.
CREATE OR REPLACE FUNCTION public.sync_cash_estimate_acv()
RETURNS TRIGGER AS $$
DECLARE
  acv_value numeric;
BEGIN
  IF NEW.job_type = 'cash' THEN
    acv_value := COALESCE(NEW.estimate_amount, (NEW.financials->>'acv')::numeric, 0);
    NEW.estimate_amount := acv_value;
    NEW.financials := jsonb_set(COALESCE(NEW.financials, '{}'::jsonb), '{acv}', to_jsonb(acv_value));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_cash_estimate_acv ON public.jobs;
CREATE TRIGGER trg_sync_cash_estimate_acv
BEFORE INSERT OR UPDATE OF job_type, estimate_amount, financials ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_cash_estimate_acv();

-- Extend job id generation to support cash job references.
CREATE OR REPLACE FUNCTION public.generate_job_id()
RETURNS TRIGGER AS $$
DECLARE
  cust_num TEXT;
  parent_claim TEXT;
  parent_job_type TEXT;
  generated_cash_ref TEXT;
BEGIN
  SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;

  IF NEW.parent_job_id IS NULL THEN
    IF NEW.job_type = 'cash' THEN
      generated_cash_ref := 'CSH-' || LPAD(nextval('public.cash_job_seq')::text, 4, '0');
      NEW.claim_number := generated_cash_ref;
      NEW.job_id := cust_num || '-' || generated_cash_ref || '-1';
    ELSE
      IF NEW.claim_number IS NOT NULL AND NEW.claim_number != '' THEN
        NEW.job_id := cust_num || '-' || NEW.claim_number || '-1';
      ELSE
        NEW.job_id := 'PRS-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.job_seq')::text, 3, '0');
        NEW.claim_number := SUBSTRING(NEW.job_id FROM 5);
      END IF;
    END IF;
    NEW.sub_number := NULL;
  ELSE
    SELECT claim_number, customer_id, job_type INTO parent_claim, NEW.customer_id, parent_job_type
    FROM public.jobs WHERE id = NEW.parent_job_id;

    SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;

    NEW.sub_number := (SELECT COALESCE(MAX(sub_number), 0) + 1 FROM public.jobs WHERE parent_job_id = NEW.parent_job_id);
    NEW.claim_number := parent_claim;
    NEW.job_type := COALESCE(NEW.job_type, parent_job_type, 'insurance');
    NEW.job_id := cust_num || '-' || parent_claim || '-' || (NEW.sub_number + 1)::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Validate claim format only for insurance main jobs.
CREATE OR REPLACE FUNCTION public.validate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_job_id IS NULL
     AND NEW.job_type = 'insurance'
     AND NEW.claim_number IS NOT NULL
     AND NEW.claim_number != '' THEN
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

DROP TRIGGER IF EXISTS trg_validate_claim ON public.jobs;
CREATE TRIGGER trg_validate_claim
BEFORE INSERT OR UPDATE OF claim_number, job_type ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_claim_number();

-- Keep cascade behavior for insurance only.
CREATE OR REPLACE FUNCTION public.cascade_claim_edit()
RETURNS TRIGGER AS $$
DECLARE
  cust_num TEXT;
BEGIN
  IF NEW.job_type = 'insurance'
     AND NEW.claim_number IS DISTINCT FROM OLD.claim_number
     AND OLD.parent_job_id IS NULL THEN
    SELECT customer_number INTO cust_num FROM public.customers WHERE id = NEW.customer_id;
    NEW.job_id := cust_num || '-' || NEW.claim_number || '-1';

    UPDATE public.jobs SET
      claim_number = NEW.claim_number,
      job_id = cust_num || '-' || NEW.claim_number || '-' || (sub_number + 1)::text
    WHERE parent_job_id = OLD.id;

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
