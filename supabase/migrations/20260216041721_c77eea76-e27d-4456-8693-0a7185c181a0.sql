
-- Trigger: sync customer assigned_rep_id to linked jobs' sales_rep_id and job_assignments
CREATE OR REPLACE FUNCTION public.sync_customer_rep_to_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assigned_rep_id IS DISTINCT FROM OLD.assigned_rep_id AND NEW.assigned_rep_id IS NOT NULL THEN
    -- Update legacy sales_rep_id on all linked jobs
    UPDATE public.jobs
    SET sales_rep_id = NEW.assigned_rep_id
    WHERE customer_id = NEW.id AND deleted_at IS NULL;

    -- Upsert primary_rep assignment for each linked job
    INSERT INTO public.job_assignments (job_id, user_id, assignment_role, notes)
    SELECT j.id, NEW.assigned_rep_id, 'primary_rep', 'Auto-synced from customer assignment'
    FROM public.jobs j
    WHERE j.customer_id = NEW.id AND j.deleted_at IS NULL
    ON CONFLICT (job_id, user_id, assignment_role) DO NOTHING;

    -- Remove old primary_rep assignments for the previous rep
    IF OLD.assigned_rep_id IS NOT NULL THEN
      DELETE FROM public.job_assignments
      WHERE user_id = OLD.assigned_rep_id
        AND assignment_role = 'primary_rep'
        AND notes = 'Auto-synced from customer assignment'
        AND job_id IN (SELECT id FROM public.jobs WHERE customer_id = NEW.id);
    END IF;

    -- Audit log
    INSERT INTO public.audits (user_id, entity_type, entity_id, action, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'customer', NEW.id::text, 'rep_sync_to_jobs',
      jsonb_build_object('old_rep', OLD.assigned_rep_id, 'new_rep', NEW.assigned_rep_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_customer_rep
AFTER UPDATE OF assigned_rep_id ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_rep_to_jobs();

-- Add unique constraint on job_assignments to support ON CONFLICT
-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_job_user_role_unique'
  ) THEN
    ALTER TABLE public.job_assignments
    ADD CONSTRAINT job_assignments_job_user_role_unique UNIQUE (job_id, user_id, assignment_role);
  END IF;
END $$;
