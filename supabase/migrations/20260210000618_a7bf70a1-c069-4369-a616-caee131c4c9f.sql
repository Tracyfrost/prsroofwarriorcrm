
-- ============================================
-- Phase 7: Production Module Database Tables
-- ============================================

-- 1) production_status enum
CREATE TYPE public.production_status AS ENUM (
  'draft', 'ready', 'scheduled', 'in_progress', 'on_hold', 'complete', 'billed'
);

-- 2) trade_types table (admin-managed list)
CREATE TABLE public.trade_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit_type text NOT NULL DEFAULT 'EA',
  default_labor_cost_per_unit numeric NOT NULL DEFAULT 0,
  default_material_cost_per_unit numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read trade_types"
  ON public.trade_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage trade_types"
  ON public.trade_types FOR ALL
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_trade_types_updated_at
  BEFORE UPDATE ON public.trade_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) job_production_items table
CREATE TABLE public.job_production_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  trade_type_id uuid NOT NULL REFERENCES public.trade_types(id),
  scope_description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_type text NOT NULL DEFAULT 'EA',
  labor_cost numeric NOT NULL DEFAULT 0,
  material_cost numeric NOT NULL DEFAULT 0,
  labor_vendor text DEFAULT '',
  material_vendor text DEFAULT '',
  status production_status NOT NULL DEFAULT 'draft',
  scheduled_start_date date,
  scheduled_end_date date,
  completed_date date,
  assigned_to_user_id uuid,
  dependencies text DEFAULT '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_production_items ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full production_items access"
  ON public.job_production_items FOR ALL
  USING (is_admin(auth.uid()));

-- Office/manager/admin can insert
CREATE POLICY "Authenticated users insert production_items"
  ON public.job_production_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Reps see items on their jobs
CREATE POLICY "Reps read production_items on their jobs"
  ON public.job_production_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_production_items.job_id
        AND (jobs.sales_rep_id = auth.uid() OR is_admin(auth.uid()))
    )
    OR assigned_to_user_id = auth.uid()
  );

CREATE TRIGGER update_production_items_updated_at
  BEFORE UPDATE ON public.job_production_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) production_status_history (audit trail)
CREATE TABLE public.production_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_item_id uuid NOT NULL REFERENCES public.job_production_items(id) ON DELETE CASCADE,
  old_status production_status,
  new_status production_status NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text DEFAULT ''
);

ALTER TABLE public.production_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read production history"
  ON public.production_status_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert production history"
  ON public.production_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full production history access"
  ON public.production_status_history FOR ALL
  USING (is_admin(auth.uid()));

-- 5) Seed default trade types
INSERT INTO public.trade_types (name, unit_type, default_labor_cost_per_unit, default_material_cost_per_unit, sort_order) VALUES
  ('Roof', 'Squares', 150, 250, 1),
  ('Gutters', 'LF', 8, 6, 2),
  ('Pergola', 'EA', 2000, 1500, 3),
  ('Shed', 'EA', 1500, 1000, 4),
  ('Patio', 'SF', 12, 8, 5),
  ('Windows/Screens', 'EA', 200, 350, 6),
  ('Garage Doors', 'EA', 500, 800, 7),
  ('Interior Bathroom', 'Job', 3000, 2000, 8),
  ('Fence Wood', 'LF', 25, 15, 9),
  ('Fence Stain', 'LF', 10, 5, 10),
  ('Siding', 'Squares', 120, 200, 11),
  ('Paint', 'SF', 3, 1, 12);

-- 6) Trigger for production status change audit
CREATE OR REPLACE FUNCTION public.log_production_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.production_status_history (production_item_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_production_status_audit
  AFTER UPDATE ON public.job_production_items
  FOR EACH ROW EXECUTE FUNCTION public.log_production_status_change();
