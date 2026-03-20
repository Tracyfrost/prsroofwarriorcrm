
-- Production Milestones Table
CREATE TABLE public.production_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage production_milestones"
  ON public.production_milestones FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated read production_milestones"
  ON public.production_milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Global Settings Table
CREATE TABLE public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage global_settings"
  ON public.global_settings FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated read global_settings"
  ON public.global_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_production_milestones_updated_at
  BEFORE UPDATE ON public.production_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed production milestones from existing hardcoded MILESTONE_KEYS
INSERT INTO public.production_milestones (name, display_name, sequence) VALUES
  ('date_lead', 'Lead Date', 1),
  ('date_inspection', 'Inspection', 2),
  ('date_contract_signed', 'Contract Signed', 3),
  ('date_adjuster_meeting', 'Adjuster Meeting', 4),
  ('date_to_install', 'Scheduled Install', 5),
  ('date_of_install', 'Actual Install', 6),
  ('date_of_completion', 'Completion', 7);

-- Seed global settings
INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('use_job_id_on_invoices', 'true'::jsonb, 'Display Job ID on invoices and documents', 'invoices'),
  ('auto_increment_job_number', 'true'::jsonb, 'Auto-generate sequential job numbers', 'defaults'),
  ('require_claim_number', 'false'::jsonb, 'Require claim number when creating jobs', 'defaults'),
  ('overhead_percentage', '10'::jsonb, 'Default overhead percentage for cost calculations', 'financials'),
  ('enable_ai_predictions', 'false'::jsonb, 'Enable AI-powered claim predictions', 'ai'),
  ('default_commission_rate', '0.10'::jsonb, 'Default commission rate for new reps', 'financials'),
  ('notify_on_job_complete', 'true'::jsonb, 'Send notifications when jobs are completed', 'notifications'),
  ('notify_on_new_lead', 'true'::jsonb, 'Send notifications for new leads', 'notifications');
