
-- Master Leads status enum
CREATE TYPE public.master_lead_status AS ENUM ('new','called','bad','follow_up','appointment_set','converted','dead');

-- Master Leads table
CREATE TABLE public.master_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  lead_source_id uuid REFERENCES public.lead_sources(id),
  status public.master_lead_status NOT NULL DEFAULT 'new',
  homeowner_present boolean NOT NULL DEFAULT false,
  has_insurance boolean NOT NULL DEFAULT false,
  allows_inspection boolean NOT NULL DEFAULT false,
  is_qualified boolean GENERATED ALWAYS AS (homeowner_present AND has_insurance AND allows_inspection) STORED,
  assigned_setter_id uuid,
  assigned_date date,
  appointment_date timestamptz,
  notes text DEFAULT '',
  customer_id uuid REFERENCES public.customers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.master_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full master_leads access" ON public.master_leads FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Setters read own master_leads" ON public.master_leads FOR SELECT USING (auth.uid() = assigned_setter_id);
CREATE POLICY "Setters update own master_leads" ON public.master_leads FOR UPDATE USING (auth.uid() = assigned_setter_id);
CREATE POLICY "Authenticated insert master_leads" ON public.master_leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Lead Segments
CREATE TABLE public.lead_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filter_type text NOT NULL DEFAULT 'zip',
  filter_value text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full lead_segments access" ON public.lead_segments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read lead_segments" ON public.lead_segments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Setter Assignments
CREATE TABLE public.setter_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid REFERENCES public.lead_segments(id),
  setter_user_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.setter_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full setter_assignments access" ON public.setter_assignments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Setters read own setter_assignments" ON public.setter_assignments FOR SELECT USING (auth.uid() = setter_user_id);

-- Call Logs (CYA Audit Trail)
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_lead_id uuid NOT NULL REFERENCES public.master_leads(id),
  setter_id uuid NOT NULL,
  call_time timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full call_logs access" ON public.call_logs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Setters read own call_logs" ON public.call_logs FOR SELECT USING (auth.uid() = setter_id);
CREATE POLICY "Authenticated insert call_logs" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;

-- Updated_at triggers
CREATE TRIGGER update_master_leads_updated_at BEFORE UPDATE ON public.master_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lead_segments_updated_at BEFORE UPDATE ON public.lead_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
