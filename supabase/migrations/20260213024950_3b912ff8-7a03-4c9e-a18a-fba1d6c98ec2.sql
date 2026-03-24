-- Drop the overly permissive "Require authentication for profiles" policy
-- The "Hierarchical profiles read" policy already properly scopes access
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Drop the overly permissive "Require authentication for jobs" policy
-- The "Reps and managers read jobs" policy already properly scopes access
DROP POLICY IF EXISTS "Require authentication for jobs" ON public.jobs;

-- Fix status_branches: replace USING (true) with proper auth check
DROP POLICY IF EXISTS "Branches readable by authenticated" ON public.status_branches;
CREATE POLICY "Branches readable by authenticated"
  ON public.status_branches
  FOR SELECT
  USING (auth.uid() IS NOT NULL);