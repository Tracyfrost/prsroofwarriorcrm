
-- Add lead pool fields to lead_sources
ALTER TABLE public.lead_sources 
  ADD COLUMN IF NOT EXISTS default_cost_per_lead numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_pool boolean NOT NULL DEFAULT false;

-- Lead packages (purchased blocks of leads)
CREATE TABLE public.lead_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source_id uuid NOT NULL REFERENCES public.lead_sources(id),
  package_size integer NOT NULL CHECK (package_size > 0),
  cost_per_lead numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  leads_remaining integer NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full lead_packages access" ON public.lead_packages FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read lead_packages" ON public.lead_packages FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_lead_packages_updated_at BEFORE UPDATE ON public.lead_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lead assignments (individual lead tracking)
CREATE TYPE public.lead_assignment_status AS ENUM ('assigned', 'converted', 'dead', 'reallocated');

CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  lead_source_id uuid NOT NULL REFERENCES public.lead_sources(id),
  package_id uuid REFERENCES public.lead_packages(id),
  assigned_rep_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.lead_assignment_status NOT NULL DEFAULT 'assigned',
  job_id uuid REFERENCES public.jobs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full lead_assignments access" ON public.lead_assignments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Reps read own lead_assignments" ON public.lead_assignments FOR SELECT USING (auth.uid() = assigned_rep_id);
CREATE POLICY "Managers read team lead_assignments" ON public.lead_assignments FOR SELECT USING (assigned_rep_id IN (SELECT get_team_user_ids(auth.uid())));
CREATE POLICY "Authenticated insert lead_assignments" ON public.lead_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Lead distribution rules (company-wide settings)
CREATE TABLE public.lead_distribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_contracts_required integer NOT NULL DEFAULT 4,
  lead_batch_size integer NOT NULL DEFAULT 10,
  enforce_strict boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_distribution_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full lead_distribution_rules access" ON public.lead_distribution_rules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read lead_distribution_rules" ON public.lead_distribution_rules FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_lead_distribution_rules_updated_at BEFORE UPDATE ON public.lead_distribution_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default distribution rule
INSERT INTO public.lead_distribution_rules (min_contracts_required, lead_batch_size, enforce_strict)
VALUES (4, 10, true);

-- Function to auto-decrement leads_remaining
CREATE OR REPLACE FUNCTION public.decrement_lead_package()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    UPDATE public.lead_packages
    SET leads_remaining = GREATEST(leads_remaining - 1, 0)
    WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_assignment_decrement
  AFTER INSERT ON public.lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_lead_package();
