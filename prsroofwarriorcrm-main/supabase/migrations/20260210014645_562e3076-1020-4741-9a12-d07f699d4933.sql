
-- Replace overly permissive storage SELECT policy with job-scoped authorization
DROP POLICY IF EXISTS "Authenticated users view job documents" ON storage.objects;

CREATE POLICY "Job-scoped document downloads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.documents
    INNER JOIN public.jobs ON jobs.id = documents.job_id
    WHERE documents.file_path = name
    AND (
      jobs.sales_rep_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR jobs.sales_rep_id IN (SELECT public.get_team_user_ids(auth.uid()))
    )
  )
);
