-- SiteCam virtual folders (metadata only; storage paths unchanged)

CREATE TABLE public.sitecam_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.sitecam_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sitecam_folders_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX sitecam_folders_job_root_name_unique
  ON public.sitecam_folders (job_id, name)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX sitecam_folders_job_parent_name_unique
  ON public.sitecam_folders (job_id, parent_id, name)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.sitecam_media
  ADD COLUMN folder_id UUID REFERENCES public.sitecam_folders(id) ON DELETE SET NULL;

CREATE INDEX sitecam_media_folder_id_idx ON public.sitecam_media (folder_id);

-- folder_id must reference a folder on the same job
CREATE OR REPLACE FUNCTION public.sitecam_media_folder_job_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.folder_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sitecam_folders sf
      WHERE sf.id = NEW.folder_id AND sf.job_id = NEW.job_id
    ) THEN
      RAISE EXCEPTION 'sitecam_media.folder_id must belong to the same job';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sitecam_media_folder_job_check_trg
  BEFORE INSERT OR UPDATE OF folder_id, job_id ON public.sitecam_media
  FOR EACH ROW
  EXECUTE FUNCTION public.sitecam_media_folder_job_check();

-- parent folder must be same job
CREATE OR REPLACE FUNCTION public.sitecam_folders_parent_job_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sitecam_folders p
      WHERE p.id = NEW.parent_id AND p.job_id = NEW.job_id
    ) THEN
      RAISE EXCEPTION 'sitecam_folders.parent_id must belong to the same job';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sitecam_folders_parent_job_check_trg
  BEFORE INSERT OR UPDATE OF parent_id, job_id ON public.sitecam_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.sitecam_folders_parent_job_check();

ALTER TABLE public.sitecam_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job-scoped sitecam folders read"
  ON public.sitecam_folders FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_folders.job_id
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

CREATE POLICY "Job-scoped sitecam folders insert"
  ON public.sitecam_folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_folders.job_id
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

CREATE POLICY "Job-scoped sitecam folders update"
  ON public.sitecam_folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_folders.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Job-scoped sitecam folders delete"
  ON public.sitecam_folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sitecam_folders.job_id
      AND (
        j.sales_rep_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
  );
