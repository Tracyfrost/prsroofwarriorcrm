
-- Add baseline permissive authentication policies for profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add baseline permissive authentication policies for jobs table  
CREATE POLICY "Require authentication for jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
