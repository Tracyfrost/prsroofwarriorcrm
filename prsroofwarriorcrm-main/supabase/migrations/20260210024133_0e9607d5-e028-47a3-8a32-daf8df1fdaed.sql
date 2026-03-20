
-- Fix: Appointment assignees should only see appointments for jobs they're authorized to access
DROP POLICY IF EXISTS "Assignees read own appointments" ON public.appointments;

CREATE POLICY "Assignees read authorized appointments"
ON public.appointments FOR SELECT
USING (
  auth.uid() = assignee_id
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = appointments.job_id
    AND (
      jobs.sales_rep_id = auth.uid()
      OR is_admin(auth.uid())
      OR jobs.sales_rep_id IN (SELECT get_team_user_ids(auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.job_assignments ja
        WHERE ja.job_id = jobs.id
        AND (ja.user_id = auth.uid() OR ja.user_id IN (SELECT get_team_user_ids(auth.uid())))
      )
    )
  )
);
