
-- Add missing columns to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS production_milestones JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qualification JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS number_of_squares NUMERIC DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create milestone_history table (referenced by existing trigger)
CREATE TABLE IF NOT EXISTS public.milestone_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  old_value TIMESTAMPTZ,
  new_value TIMESTAMPTZ,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestone_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full milestone_history access"
  ON public.milestone_history FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users read milestone_history"
  ON public.milestone_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert milestone_history"
  ON public.milestone_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster milestone history queries
CREATE INDEX IF NOT EXISTS idx_milestone_history_job_id ON public.milestone_history(job_id);

-- Add trigger for milestone change logging (re-create to ensure it works)
DROP TRIGGER IF EXISTS trg_log_milestone ON public.jobs;
CREATE TRIGGER trg_log_milestone
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_milestone_change();

-- Soft delete: update existing RLS to filter deleted jobs for non-admins
-- (Admins already have ALL access, so they can see deleted jobs)
-- We need to update the "Reps and managers read jobs" policy to exclude deleted
DROP POLICY IF EXISTS "Reps and managers read jobs" ON public.jobs;
CREATE POLICY "Reps and managers read jobs"
  ON public.jobs FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin(auth.uid()) OR
      auth.uid() = sales_rep_id OR
      EXISTS (SELECT 1 FROM job_assignments WHERE job_assignments.job_id = jobs.id AND job_assignments.user_id = auth.uid()) OR
      sales_rep_id IN (SELECT get_team_user_ids(auth.uid())) OR
      EXISTS (SELECT 1 FROM job_assignments WHERE job_assignments.job_id = jobs.id AND job_assignments.user_id IN (SELECT get_team_user_ids(auth.uid())))
    )
  );

-- Admins can see deleted jobs too
DROP POLICY IF EXISTS "Admins full job access" ON public.jobs;
CREATE POLICY "Admins full job access"
  ON public.jobs FOR ALL
  USING (is_admin(auth.uid()));
