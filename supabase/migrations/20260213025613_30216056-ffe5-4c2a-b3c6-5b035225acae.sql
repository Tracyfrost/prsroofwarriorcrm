
-- Fix sitecam_media RLS: replace permissive policies with job-scoped access
DROP POLICY IF EXISTS "Authenticated users can view sitecam media" ON public.sitecam_media;
DROP POLICY IF EXISTS "Authenticated users can insert sitecam media" ON public.sitecam_media;
DROP POLICY IF EXISTS "Authenticated users can update sitecam media" ON public.sitecam_media;
DROP POLICY IF EXISTS "Authenticated users can delete sitecam media" ON public.sitecam_media;

CREATE POLICY "Job-scoped sitecam media read"
  ON public.sitecam_media FOR SELECT
  USING (
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
      )
    )
    OR is_public = true
  );

CREATE POLICY "Job-scoped sitecam media insert"
  ON public.sitecam_media FOR INSERT
  WITH CHECK (
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
      )
    )
  );

CREATE POLICY "Job-scoped sitecam media update"
  ON public.sitecam_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_media.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Job-scoped sitecam media delete"
  ON public.sitecam_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_media.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );

-- Fix sitecam_pages RLS similarly
DROP POLICY IF EXISTS "Authenticated users can view sitecam pages" ON public.sitecam_pages;
DROP POLICY IF EXISTS "Authenticated users can insert sitecam pages" ON public.sitecam_pages;
DROP POLICY IF EXISTS "Authenticated users can update sitecam pages" ON public.sitecam_pages;
DROP POLICY IF EXISTS "Authenticated users can delete sitecam pages" ON public.sitecam_pages;

CREATE POLICY "Job-scoped sitecam pages read"
  ON public.sitecam_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_pages.job_id
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

CREATE POLICY "Job-scoped sitecam pages insert"
  ON public.sitecam_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_pages.job_id
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

CREATE POLICY "Job-scoped sitecam pages update"
  ON public.sitecam_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_pages.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Job-scoped sitecam pages delete"
  ON public.sitecam_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_pages.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );

-- Make sitecam storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'sitecam';

-- Fix storage policies
DROP POLICY IF EXISTS "Anyone can view sitecam files" ON storage.objects;

CREATE POLICY "Authenticated users can view sitecam files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sitecam'
    AND auth.uid() IS NOT NULL
  );
