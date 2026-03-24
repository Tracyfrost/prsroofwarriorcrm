
-- Job status enum
CREATE TYPE public.job_status AS ENUM ('lead', 'inspected', 'approved', 'scheduled', 'completed', 'closed');

-- Sequence for job IDs
CREATE SEQUENCE public.job_seq START 1;

-- Jobs table
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  trade_types text[] NOT NULL DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'lead',
  sales_rep_id uuid,
  dates jsonb NOT NULL DEFAULT '{}'::jsonb,
  financials jsonb NOT NULL DEFAULT '{"acv": 0, "rcv": 0}'::jsonb,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to generate job_id
CREATE OR REPLACE FUNCTION public.generate_job_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.job_id = 'PRS-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.job_seq')::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_id
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.generate_job_id();

-- Updated_at trigger for jobs
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Appointments table
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  date_time timestamptz NOT NULL,
  assignee_id uuid,
  outcome text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Jobs RLS: admins full access, assigned sales rep can read
CREATE POLICY "Admins full job access"
ON public.jobs FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sales reps read assigned jobs"
ON public.jobs FOR SELECT
USING (auth.uid() = sales_rep_id);

CREATE POLICY "Authenticated users insert jobs"
ON public.jobs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Appointments RLS: admins full access, assignee can read
CREATE POLICY "Admins full appointment access"
ON public.appointments FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Assignees read own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = assignee_id);

CREATE POLICY "Authenticated users insert appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- Indexes
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_sales_rep_id ON public.jobs(sales_rep_id);
CREATE INDEX idx_appointments_job_id ON public.appointments(job_id);
CREATE INDEX idx_appointments_assignee_id ON public.appointments(assignee_id);
CREATE INDEX idx_appointments_date_time ON public.appointments(date_time);
