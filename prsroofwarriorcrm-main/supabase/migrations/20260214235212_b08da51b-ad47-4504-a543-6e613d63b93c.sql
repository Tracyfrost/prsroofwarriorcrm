
-- Job Logs table for Notes/Diary/Action Reports (CYA system)
CREATE TABLE public.job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Note',
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  edited_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_job_logs_job_id ON public.job_logs(job_id);
CREATE INDEX idx_job_logs_user_id ON public.job_logs(user_id);
CREATE INDEX idx_job_logs_type ON public.job_logs(type);

-- Enable RLS
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read (hierarchy filtering done in app layer)
CREATE POLICY "Authenticated users can read job logs"
  ON public.job_logs FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: All authenticated users can create logs for their own user_id
CREATE POLICY "Users can create own job logs"
  ON public.job_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only highest/admin/owner/office_admin can edit
CREATE POLICY "Admins can update job logs"
  ON public.job_logs FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR public.is_highest(auth.uid())
  );

-- DELETE: Only highest/admin can hard delete (we use soft delete in app)
CREATE POLICY "Admins can delete job logs"
  ON public.job_logs FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR public.is_highest(auth.uid())
  );

-- Auto-log trigger: insert a log entry when job status changes
CREATE OR REPLACE FUNCTION public.auto_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_logs (job_id, type, content, user_id)
    VALUES (
      NEW.id,
      'Action',
      'Status changed from ' || COALESCE(OLD.status::text, 'none') || ' to ' || NEW.status::text,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_log_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_status_change();
