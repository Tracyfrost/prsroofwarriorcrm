
-- Lead Sources configuration table
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job Statuses configuration table
CREATE TABLE public.job_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed lead_sources from existing enum values
INSERT INTO public.lead_sources (name, display_name, sort_order) VALUES
  ('self_gen', 'Self Generated', 1),
  ('referral', 'Referral', 2),
  ('marketing', 'Marketing', 3),
  ('website', 'Website', 4),
  ('insurance', 'Insurance', 5),
  ('other', 'Other', 6);

-- Seed job_statuses from existing enum values
INSERT INTO public.job_statuses (name, display_name, sequence, color) VALUES
  ('lead', 'Lead', 1, '#6b7280'),
  ('inspected', 'Inspected', 2, '#3b82f6'),
  ('approved', 'Approved', 3, '#8b5cf6'),
  ('scheduled', 'Scheduled', 4, '#f59e0b'),
  ('completed', 'Completed', 5, '#22c55e'),
  ('closed', 'Closed', 6, '#ef4444');

-- RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead_sources" ON public.lead_sources FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read lead_sources" ON public.lead_sources FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage job_statuses" ON public.job_statuses FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read job_statuses" ON public.job_statuses FOR SELECT USING (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_lead_sources_updated_at
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_statuses_updated_at
  BEFORE UPDATE ON public.job_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
