-- Harden profile management policies:
-- - users can still update their own profile
-- - admins (manager/office_admin/owner via is_admin) can manage profiles
-- - admins can create profiles when needed

DROP POLICY IF EXISTS "Users update own or managed profiles" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage profiles"
ON public.profiles
FOR UPDATE
USING (
  public.is_admin(auth.uid())
  OR public.is_highest(auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.is_highest(auth.uid())
);

DROP POLICY IF EXISTS "System creates profiles" ON public.profiles;

CREATE POLICY "Admins create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR auth.uid() = user_id
);
