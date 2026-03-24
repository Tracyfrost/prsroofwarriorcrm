
-- Add supplement tracking columns to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS has_supplement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS supplement_status TEXT;

-- Create status_branches table for customizable workflow branches
CREATE TABLE public.status_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  statuses UUID[] NOT NULL DEFAULT '{}',
  parent_branch_id UUID REFERENCES public.status_branches(id) ON DELETE SET NULL,
  branch_point_status TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.status_branches ENABLE ROW LEVEL SECURITY;

-- Everyone can read branches
CREATE POLICY "Branches readable by authenticated" ON public.status_branches
  FOR SELECT TO authenticated USING (true);

-- Only admins can manage branches
CREATE POLICY "Admins manage branches" ON public.status_branches
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_status_branches_updated_at
  BEFORE UPDATE ON public.status_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default branches
INSERT INTO public.status_branches (name, display_name, statuses, branch_point_status) VALUES
  ('main', 'Main Flow', '{}', NULL),
  ('supplement', 'Supplement Flow', '{}', 'inspected');
