-- Customer-only appointments, notification_settings JSON, XOR job/customer, RLS + trigger updates.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_id uuid NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.appointments
  ALTER COLUMN job_id DROP NOT NULL;

-- Exactly one of job_id or customer_id must be set.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS chk_appointments_job_xor_customer;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_job_xor_customer CHECK (
    (job_id IS NOT NULL AND customer_id IS NULL)
    OR (job_id IS NULL AND customer_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);

-- Derive assignee from job or customer when assignee_id is null.
CREATE OR REPLACE FUNCTION public.derive_appointment_assignment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rep_user uuid;
  manager_user uuid;
BEGIN
  IF NEW.appointment_status IS NULL OR NEW.appointment_status = '' THEN
    NEW.appointment_status := 'scheduled';
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.assignee_id IS NULL THEN
    IF NEW.job_id IS NOT NULL THEN
      SELECT j.sales_rep_id
      INTO rep_user
      FROM public.jobs j
      WHERE j.id = NEW.job_id
      LIMIT 1;
      NEW.assignee_id := rep_user;
    ELSIF NEW.customer_id IS NOT NULL THEN
      SELECT c.assigned_rep_id
      INTO rep_user
      FROM public.customers c
      WHERE c.id = NEW.customer_id
      LIMIT 1;
      NEW.assignee_id := rep_user;
    END IF;
  END IF;

  NEW.assigned_rep_id := NEW.assignee_id;

  NEW.assigned_manager_id := NULL;
  IF NEW.assigned_rep_id IS NOT NULL THEN
    SELECT m.user_id
    INTO manager_user
    FROM public.profiles rep
    JOIN public.profiles m
      ON m.id = rep.manager_id
    WHERE rep.user_id = NEW.assigned_rep_id
      AND rep.manager_id IS NOT NULL
    LIMIT 1;

    NEW.assigned_manager_id := manager_user;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_derive_appointment_assignment_fields ON public.appointments;

CREATE TRIGGER trg_derive_appointment_assignment_fields
BEFORE INSERT OR UPDATE OF assignee_id, job_id, customer_id
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.derive_appointment_assignment_fields();

-- Assignees: same as before for job-linked rows; customer-linked rows use customer visibility (+ assigned rep/manager).
DROP POLICY IF EXISTS "Assignees read authorized appointments" ON public.appointments;

CREATE POLICY "Assignees read authorized appointments"
ON public.appointments FOR SELECT
USING (
  auth.uid() = assignee_id
  AND (
    (
      job_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = appointments.job_id
        AND (
          jobs.sales_rep_id = auth.uid()
          OR public.is_admin(auth.uid())
          OR jobs.sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = jobs.id
            AND (
              ja.user_id = auth.uid()
              OR ja.user_id IN (SELECT public.get_team_user_ids(auth.uid()))
            )
          )
        )
      )
    )
    OR (
      customer_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = appointments.customer_id
        AND (
          public.is_admin(auth.uid())
          OR auth.uid() = c.created_by
          OR c.assigned_rep_id = auth.uid()
          OR c.assigned_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
          OR c.assigned_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            INNER JOIN public.job_assignments ja ON ja.job_id = j.id
            WHERE j.customer_id = c.id
            AND (
              ja.user_id = auth.uid()
              OR ja.user_id IN (SELECT public.get_team_user_ids(auth.uid()))
            )
          )
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.customer_id = c.id
            AND (
              j.sales_rep_id = auth.uid()
              OR j.sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
            )
          )
        )
      )
    )
  )
);
