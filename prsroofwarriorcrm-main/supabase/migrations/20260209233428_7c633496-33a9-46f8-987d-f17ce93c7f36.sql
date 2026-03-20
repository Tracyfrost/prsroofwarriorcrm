
-- 1. Create user_level enum
CREATE TYPE public.user_level AS ENUM (
  'highest', 'admin', 'manager', 'lvl5', 'lvl4', 'lvl3', 'lvl2', 'lvl1'
);

-- 2. Add hierarchy columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN level public.user_level NOT NULL DEFAULT 'lvl1',
  ADD COLUMN manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN commission_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN override_rate numeric NOT NULL DEFAULT 0;

-- 3. Add override columns to commissions
ALTER TABLE public.commissions
  ADD COLUMN override_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN base_rep_id uuid;

-- 4. Create helper function to get user level
CREATE OR REPLACE FUNCTION public.get_user_level(_user_id uuid)
RETURNS public.user_level
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT level FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. Function to check if user manages another user
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _target_user_id
      AND manager_id = (SELECT id FROM public.profiles WHERE user_id = _manager_user_id LIMIT 1)
  )
$$;

-- 6. Recursive team member lookup
CREATE OR REPLACE FUNCTION public.get_team_user_ids(_manager_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE team AS (
    SELECT id, user_id FROM public.profiles
    WHERE manager_id = (SELECT id FROM public.profiles WHERE user_id = _manager_user_id LIMIT 1)
    UNION ALL
    SELECT p.id, p.user_id FROM public.profiles p
    INNER JOIN team t ON p.manager_id = t.id
  )
  SELECT user_id FROM team
$$;

-- 7. Update RLS on profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Hierarchical profiles read" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR public.get_user_level(auth.uid()) = 'highest'
  OR user_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

-- 8. Update RLS on jobs
DROP POLICY IF EXISTS "Sales reps read assigned jobs" ON public.jobs;
CREATE POLICY "Reps and managers read jobs" ON public.jobs
FOR SELECT USING (
  auth.uid() = sales_rep_id
  OR is_admin(auth.uid())
  OR sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

-- 9. Update RLS on commissions
DROP POLICY IF EXISTS "Reps read own commissions" ON public.commissions;
CREATE POLICY "Reps and managers read commissions" ON public.commissions
FOR SELECT USING (
  auth.uid() = rep_id
  OR is_admin(auth.uid())
  OR rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

-- 10. Drop old trigger+function with CASCADE, recreate hierarchy-aware version
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.jobs;
DROP FUNCTION IF EXISTS public.auto_commission_on_complete() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_commission_on_complete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rep_rate numeric;
  mgr_profile_id uuid;
  mgr_user_id uuid;
  mgr_override numeric;
  acv_val numeric;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.sales_rep_id IS NOT NULL THEN
    SELECT commission_rate INTO rep_rate FROM public.profiles WHERE user_id = NEW.sales_rep_id;
    rep_rate := COALESCE(rep_rate, 0);
    acv_val := COALESCE((NEW.financials->>'acv')::numeric, 0);

    INSERT INTO public.commissions (rep_id, job_id, amount, status, notes, base_rep_id)
    VALUES (
      NEW.sales_rep_id, NEW.id, acv_val * rep_rate, 'earned',
      'Auto (' || (rep_rate * 100)::text || '% of ACV)', NULL
    ) ON CONFLICT DO NOTHING;

    SELECT p.manager_id INTO mgr_profile_id FROM public.profiles p WHERE p.user_id = NEW.sales_rep_id;
    IF mgr_profile_id IS NOT NULL THEN
      SELECT user_id, override_rate INTO mgr_user_id, mgr_override FROM public.profiles WHERE id = mgr_profile_id;
      mgr_override := COALESCE(mgr_override, 0);
      IF mgr_override > 0 THEN
        INSERT INTO public.commissions (rep_id, job_id, amount, override_amount, status, notes, base_rep_id)
        VALUES (
          mgr_user_id, NEW.id, 0, acv_val * mgr_override, 'earned',
          'Manager override (' || (mgr_override * 100)::text || '% of ACV)', NEW.sales_rep_id
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_commission
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.auto_commission_on_complete();

-- 11. Update profiles UPDATE policy
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own or managed profiles" ON public.profiles
FOR UPDATE USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR public.get_user_level(auth.uid()) = 'highest'
);
