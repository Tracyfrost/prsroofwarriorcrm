
-- Fix insurance_claims RLS: replace overly permissive policies with job-scoped access

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can update insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can delete insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can insert insurance claims" ON public.insurance_claims;

-- Job-scoped SELECT: user must be assigned to the job, be the sales rep, or be admin
CREATE POLICY "Job-scoped insurance claims read"
  ON public.insurance_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = insurance_claims.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.job_assignments ja
          WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
        )
        OR j.sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
      )
    )
  );

-- Job-scoped INSERT: must be authenticated and linked to the job
CREATE POLICY "Job-scoped insurance claims insert"
  ON public.insurance_claims FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = insurance_claims.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.job_assignments ja
          WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
        )
      )
    )
  );

-- Job-scoped UPDATE: sales rep, assigned user, or admin
CREATE POLICY "Job-scoped insurance claims update"
  ON public.insurance_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = insurance_claims.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.job_assignments ja
          WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
        )
      )
    )
  );

-- DELETE: admins only
CREATE POLICY "Admins can delete insurance claims"
  ON public.insurance_claims FOR DELETE
  USING (public.is_admin(auth.uid()));
