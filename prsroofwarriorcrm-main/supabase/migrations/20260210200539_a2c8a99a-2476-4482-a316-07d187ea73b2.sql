
-- Add claim hierarchy columns to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS claim_number TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES public.jobs(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sub_number INTEGER;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS aggregated_financials JSONB DEFAULT '{"acv": 0, "rcv": 0, "checks_received": 0, "depreciation": 0}'::jsonb;

-- Index for sub-job lookups
CREATE INDEX IF NOT EXISTS idx_jobs_parent_job_id ON public.jobs(parent_job_id);

-- Migrate existing jobs: extract claim number from job_id (PRS-2026-001 -> 2026-001)
UPDATE public.jobs SET claim_number = SUBSTRING(job_id FROM 5) WHERE parent_job_id IS NULL AND claim_number IS NULL;

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trg_job_id ON public.jobs;
DROP FUNCTION IF EXISTS public.generate_job_id();

-- New trigger function for claim-based job IDs
CREATE OR REPLACE FUNCTION public.generate_job_id()
RETURNS TRIGGER AS $$
DECLARE
  parent_claim TEXT;
BEGIN
  IF NEW.parent_job_id IS NULL THEN
    -- Main Job: use claim_number if provided, else fallback to sequence
    IF NEW.claim_number IS NOT NULL AND NEW.claim_number != '' THEN
      NEW.job_id = 'PRS-' || NEW.claim_number;
    ELSE
      NEW.job_id = 'PRS-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.job_seq')::text, 3, '0');
      NEW.claim_number = SUBSTRING(NEW.job_id FROM 5);
    END IF;
  ELSE
    -- Sub Job: inherit customer_id and claim from parent
    SELECT claim_number, customer_id INTO parent_claim, NEW.customer_id
    FROM public.jobs WHERE id = NEW.parent_job_id;
    
    NEW.sub_number = (SELECT COALESCE(MAX(sub_number), 0) + 1 FROM public.jobs WHERE parent_job_id = NEW.parent_job_id);
    NEW.job_id = 'PRS-' || parent_claim || '-' || NEW.sub_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_job_id BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.generate_job_id();

-- Financial rollup function: recalculate parent aggregated_financials from all subs
CREATE OR REPLACE FUNCTION public.rollup_financials()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  agg JSONB;
BEGIN
  parent_id := COALESCE(NEW.parent_job_id, OLD.parent_job_id);
  IF parent_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT jsonb_build_object(
    'acv', COALESCE(SUM((financials->>'acv')::numeric), 0),
    'rcv', COALESCE(SUM((financials->>'rcv')::numeric), 0)
  ) INTO agg
  FROM public.jobs WHERE parent_job_id = parent_id;

  UPDATE public.jobs SET aggregated_financials = agg WHERE id = parent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_financial_rollup
AFTER INSERT OR UPDATE OF financials ON public.jobs
FOR EACH ROW
WHEN (NEW.parent_job_id IS NOT NULL)
EXECUTE FUNCTION public.rollup_financials();

-- RLS: Sub jobs inherit access from parent
-- Existing policies already cover this since sub jobs have the same customer_id
-- and assignments are on the job level
