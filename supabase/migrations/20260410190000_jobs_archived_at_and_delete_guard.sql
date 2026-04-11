-- Archived jobs: visible in listings with UI treatment; distinct from soft-delete (deleted_at).

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_archived_at ON public.jobs (archived_at)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.jobs.archived_at IS 'When set, job is archived (still visible); use for non-admin hide-from-active-work.';

-- Restrict who may set or clear deleted_at (aligns with app delete_job: not plain managers).
CREATE OR REPLACE FUNCTION public.can_delete_job_row(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.level IN ('highest'::public.user_level, 'admin'::public.user_level)
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role IN ('owner', 'office_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.jobs_enforce_deleted_at_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    IF NOT public.can_delete_job_row(auth.uid()) THEN
      RAISE EXCEPTION 'not authorized to change deleted_at on jobs';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_enforce_deleted_at ON public.jobs;
CREATE TRIGGER trg_jobs_enforce_deleted_at
  BEFORE UPDATE OF deleted_at ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.jobs_enforce_deleted_at_policy();
