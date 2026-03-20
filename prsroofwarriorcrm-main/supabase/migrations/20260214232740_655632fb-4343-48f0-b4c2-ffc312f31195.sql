
-- Fix 1: Remove is_public bypass from sitecam_media RLS
DROP POLICY IF EXISTS "Job-scoped sitecam media read" ON public.sitecam_media;

CREATE POLICY "Job-scoped sitecam media read"
  ON public.sitecam_media FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = sitecam_media.job_id
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
    )
  );

-- Fix 2: Tighten sitecam storage SELECT policy to job-scoped
DROP POLICY IF EXISTS "Authenticated users can view sitecam files" ON storage.objects;

CREATE POLICY "Job-scoped sitecam storage access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sitecam'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.sitecam_media sm
    INNER JOIN public.jobs j ON j.id = sm.job_id
    WHERE (sm.original_path = name OR sm.annotated_path = name OR sm.thumbnail_path = name)
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
