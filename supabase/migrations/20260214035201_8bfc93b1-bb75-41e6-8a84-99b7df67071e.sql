
-- Insurance Claims table for rich claim tracking per job
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL DEFAULT '',
  adjuster_contact JSONB DEFAULT '{"name":"","phones":[],"emails":[]}'::jsonb,
  claim_number TEXT,
  filed_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Denied', 'Settled')),
  policy_number TEXT,
  notes TEXT,
  is_out_of_scope BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One claim per job
CREATE UNIQUE INDEX idx_insurance_claims_job_id ON public.insurance_claims(job_id);

-- Enable RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies - same pattern as other job-related tables
CREATE POLICY "Users can view insurance claims" ON public.insurance_claims
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert insurance claims" ON public.insurance_claims
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update insurance claims" ON public.insurance_claims
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete insurance claims" ON public.insurance_claims
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
