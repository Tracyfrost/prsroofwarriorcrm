-- Extend appointments with normalized appointment status and assignment metadata.
-- Non-destructive: adds columns and uses triggers to derive values.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS assigned_rep_id uuid NULL,
  ADD COLUMN IF NOT EXISTS assigned_manager_id uuid NULL;

-- Derive assignee/rep/manager and appointment status on appointment creation/update.
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
  -- Always ensure a valid appointment_status
  IF NEW.appointment_status IS NULL OR NEW.appointment_status = '' THEN
    NEW.appointment_status := 'scheduled';
  END IF;

  -- If this was created from the authenticated client, capture creator.
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Ensure assignee_id exists for RLS visibility policies.
  IF NEW.assignee_id IS NULL THEN
    SELECT j.sales_rep_id
    INTO rep_user
    FROM public.jobs j
    WHERE j.id = NEW.job_id
    LIMIT 1;

    NEW.assignee_id := rep_user;
  END IF;

  NEW.assigned_rep_id := NEW.assignee_id;

  -- Derive manager from profiles hierarchy.
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
BEFORE INSERT OR UPDATE OF assignee_id, job_id
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.derive_appointment_assignment_fields();

-- Backfill existing rows so appointments become visible to assignees.
-- 1) Populate missing assignee_id from jobs.sales_rep_id
UPDATE public.appointments a
SET assignee_id = j.sales_rep_id
FROM public.jobs j
WHERE a.assignee_id IS NULL
  AND a.job_id = j.id;

-- 2) Populate assigned_rep_id from assignee_id
UPDATE public.appointments
SET assigned_rep_id = assignee_id
WHERE assigned_rep_id IS NULL;

-- 3) Populate assigned_manager_id from assigned_rep_id -> profiles.manager_id
UPDATE public.appointments a
SET assigned_manager_id = m.user_id
FROM public.profiles rep
JOIN public.profiles m
  ON m.id = rep.manager_id
WHERE a.assigned_rep_id = rep.user_id
  AND rep.manager_id IS NOT NULL
  AND a.assigned_manager_id IS NULL;

-- 4) Ensure appointment_status is set
UPDATE public.appointments
SET appointment_status = 'scheduled'
WHERE appointment_status IS NULL;

