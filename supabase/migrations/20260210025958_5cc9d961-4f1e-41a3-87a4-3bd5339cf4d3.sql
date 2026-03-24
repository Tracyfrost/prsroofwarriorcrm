
-- Add soft delete column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create function to check if user is "highest" level
CREATE OR REPLACE FUNCTION public.is_highest(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND level = 'highest'
  )
$$;

-- Update the profiles SELECT policy to exclude soft-deleted users for non-admins
DROP POLICY IF EXISTS "Hierarchical profiles read" ON public.profiles;
CREATE POLICY "Hierarchical profiles read"
ON public.profiles
FOR SELECT
USING (
  deleted_at IS NULL AND (
    (auth.uid() = user_id)
    OR is_admin(auth.uid())
    OR (get_user_level(auth.uid()) = 'highest'::user_level)
    OR (user_id IN (SELECT get_team_user_ids(auth.uid())))
  )
);

-- Admins can also see soft-deleted profiles for management
CREATE POLICY "Admins read deleted profiles"
ON public.profiles
FOR SELECT
USING (
  deleted_at IS NOT NULL AND (is_admin(auth.uid()) OR get_user_level(auth.uid()) = 'highest'::user_level)
);

-- Create function for soft delete with job reassignment
CREATE OR REPLACE FUNCTION public.soft_delete_user(
  _target_user_id uuid,
  _reassign_to_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft delete the profile
  UPDATE public.profiles
  SET deleted_at = NOW(), active = false
  WHERE user_id = _target_user_id;

  -- Reassign job assignments if a reassignment target is provided
  IF _reassign_to_user_id IS NOT NULL THEN
    UPDATE public.job_assignments
    SET user_id = _reassign_to_user_id
    WHERE user_id = _target_user_id;

    -- Update sales_rep_id on jobs
    UPDATE public.jobs
    SET sales_rep_id = _reassign_to_user_id
    WHERE sales_rep_id = _target_user_id;
  END IF;

  -- Remove subordinates' manager reference (set to null)
  UPDATE public.profiles
  SET manager_id = NULL
  WHERE manager_id = (SELECT id FROM public.profiles WHERE user_id = _target_user_id);
END;
$$;
