
-- Create production_item_statuses config table
CREATE TABLE public.production_item_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_item_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage production_item_statuses"
  ON public.production_item_statuses FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated read production_item_statuses"
  ON public.production_item_statuses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed with current enum values
INSERT INTO public.production_item_statuses (name, display_name, sequence, color) VALUES
  ('draft',       'Draft',       1, '#6b7280'),
  ('ready',       'Ready',       2, '#3b82f6'),
  ('scheduled',   'Scheduled',   3, '#8b5cf6'),
  ('in_progress', 'In Progress', 4, '#f59e0b'),
  ('on_hold',     'On Hold',     5, '#ef4444'),
  ('complete',    'Complete',     6, '#22c55e'),
  ('billed',      'Billed',      7, '#64748b');

-- Convert production_status enum columns to text for flexibility
ALTER TABLE public.job_production_items 
  ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.job_production_items 
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.production_status_history 
  ALTER COLUMN old_status TYPE text USING old_status::text;
ALTER TABLE public.production_status_history 
  ALTER COLUMN new_status TYPE text USING new_status::text;

-- Drop the old enum type
DROP TYPE IF EXISTS public.production_status;

-- Add updated_at trigger
CREATE TRIGGER update_production_item_statuses_updated_at
  BEFORE UPDATE ON public.production_item_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
