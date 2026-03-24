
-- Phase 8: Customer & Job Model Refinements

-- Drop dependent policy FIRST before dropping assigned_to column
DROP POLICY IF EXISTS "Assigned users read customers" ON public.customers;

-- Drop the already-created type/columns/table from partial first attempt (idempotent)
DROP TYPE IF EXISTS public.assignment_role CASCADE;

-- 1. New enum for job assignment roles
CREATE TYPE public.assignment_role AS ENUM ('primary_rep', 'assistant_rep', 'manager_override', 'field_tech');

-- 2. Customer model: add contact_info jsonb, rename address → main_address
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT '{"phones":[],"emails":[]}'::jsonb;

-- Rename address to main_address (may already be done from partial migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='address') THEN
    ALTER TABLE public.customers RENAME COLUMN address TO main_address;
  END IF;
END $$;

-- Migrate existing phone/email into contact_info
UPDATE public.customers SET contact_info = jsonb_build_object(
  'phones', CASE WHEN phone IS NOT NULL AND phone != '' THEN jsonb_build_array(jsonb_build_object('type', 'primary', 'number', phone)) ELSE '[]'::jsonb END,
  'emails', CASE WHEN email IS NOT NULL AND email != '' THEN jsonb_build_array(jsonb_build_object('type', 'primary', 'address', email)) ELSE '[]'::jsonb END
)
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='phone');

-- Drop legacy columns
ALTER TABLE public.customers DROP COLUMN IF EXISTS phone;
ALTER TABLE public.customers DROP COLUMN IF EXISTS email;
ALTER TABLE public.customers DROP COLUMN IF EXISTS assigned_to;

-- 3. Jobs: add site_address
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS site_address jsonb DEFAULT '{}'::jsonb;

-- 4. Create job_assignments junction table
CREATE TABLE IF NOT EXISTS public.job_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assignment_role public.assignment_role NOT NULL DEFAULT 'primary_rep',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  UNIQUE(job_id, user_id, assignment_role)
);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON public.job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON public.job_assignments(user_id);

-- 5. Migrate existing sales_rep_id to job_assignments as primary_rep
INSERT INTO public.job_assignments (job_id, user_id, assignment_role)
SELECT id, sales_rep_id, 'primary_rep'
FROM public.jobs
WHERE sales_rep_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. RLS for job_assignments
CREATE POLICY "Admins full job_assignments access"
ON public.job_assignments FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read own assignments"
ON public.job_assignments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users read team assignments"
ON public.job_assignments FOR SELECT
USING (user_id IN (SELECT public.get_team_user_ids(auth.uid())));

CREATE POLICY "Authenticated insert assignments"
ON public.job_assignments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Update jobs RLS to include job_assignments access
DROP POLICY IF EXISTS "Reps and managers read jobs" ON public.jobs;
CREATE POLICY "Reps and managers read jobs"
ON public.jobs FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = sales_rep_id
  OR EXISTS (SELECT 1 FROM public.job_assignments WHERE job_id = id AND user_id = auth.uid())
  OR sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.job_assignments WHERE job_id = id AND user_id IN (SELECT public.get_team_user_ids(auth.uid())))
);

-- 8. Customers RLS - visible via job assignments, legacy sales_rep, or created_by
CREATE POLICY "Users read customers via jobs"
ON public.customers FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    INNER JOIN public.job_assignments ja ON ja.job_id = j.id
    WHERE j.customer_id = customers.id
    AND (ja.user_id = auth.uid() OR ja.user_id IN (SELECT public.get_team_user_ids(auth.uid())))
  )
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.customer_id = customers.id
    AND (j.sales_rep_id = auth.uid() OR j.sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid())))
  )
);

-- 9. Update commission trigger to use job_assignments primary_rep with fallback
CREATE OR REPLACE FUNCTION public.auto_commission_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rep_record RECORD;
  rep_rate numeric;
  mgr_profile_id uuid;
  mgr_user_id uuid;
  mgr_override numeric;
  acv_val numeric;
  has_primary boolean;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    acv_val := COALESCE((NEW.financials->>'acv')::numeric, 0);
    has_primary := false;

    FOR rep_record IN
      SELECT ja.user_id FROM public.job_assignments ja
      WHERE ja.job_id = NEW.id AND ja.assignment_role = 'primary_rep'
    LOOP
      has_primary := true;
      SELECT commission_rate INTO rep_rate FROM public.profiles WHERE user_id = rep_record.user_id;
      rep_rate := COALESCE(rep_rate, 0);

      INSERT INTO public.commissions (rep_id, job_id, amount, status, notes, base_rep_id)
      VALUES (rep_record.user_id, NEW.id, acv_val * rep_rate, 'earned',
        'Auto (' || (rep_rate * 100)::text || '% of ACV)', NULL)
      ON CONFLICT DO NOTHING;

      SELECT p.manager_id INTO mgr_profile_id FROM public.profiles p WHERE p.user_id = rep_record.user_id;
      IF mgr_profile_id IS NOT NULL THEN
        SELECT user_id, override_rate INTO mgr_user_id, mgr_override FROM public.profiles WHERE id = mgr_profile_id;
        mgr_override := COALESCE(mgr_override, 0);
        IF mgr_override > 0 THEN
          INSERT INTO public.commissions (rep_id, job_id, amount, override_amount, status, notes, base_rep_id)
          VALUES (mgr_user_id, NEW.id, 0, acv_val * mgr_override, 'earned',
            'Manager override (' || (mgr_override * 100)::text || '% of ACV)', rep_record.user_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END LOOP;

    -- Fallback to legacy sales_rep_id
    IF NOT has_primary AND NEW.sales_rep_id IS NOT NULL THEN
      SELECT commission_rate INTO rep_rate FROM public.profiles WHERE user_id = NEW.sales_rep_id;
      rep_rate := COALESCE(rep_rate, 0);
      INSERT INTO public.commissions (rep_id, job_id, amount, status, notes, base_rep_id)
      VALUES (NEW.sales_rep_id, NEW.id, acv_val * rep_rate, 'earned',
        'Auto (' || (rep_rate * 100)::text || '% of ACV)', NULL)
      ON CONFLICT DO NOTHING;

      SELECT p.manager_id INTO mgr_profile_id FROM public.profiles p WHERE p.user_id = NEW.sales_rep_id;
      IF mgr_profile_id IS NOT NULL THEN
        SELECT user_id, override_rate INTO mgr_user_id, mgr_override FROM public.profiles WHERE id = mgr_profile_id;
        mgr_override := COALESCE(mgr_override, 0);
        IF mgr_override > 0 THEN
          INSERT INTO public.commissions (rep_id, job_id, amount, override_amount, status, notes, base_rep_id)
          VALUES (mgr_user_id, NEW.id, 0, acv_val * mgr_override, 'earned',
            'Manager override (' || (mgr_override * 100)::text || '% of ACV)', NEW.sales_rep_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
