-- Link Job Files documents copied from SiteCam for bidirectional title sync

ALTER TABLE public.documents
  ADD COLUMN sitecam_media_id uuid REFERENCES public.sitecam_media(id) ON DELETE SET NULL;

CREATE INDEX documents_sitecam_media_id_idx ON public.documents (sitecam_media_id)
  WHERE sitecam_media_id IS NOT NULL;

CREATE UNIQUE INDEX documents_sitecam_media_id_unique
  ON public.documents (sitecam_media_id)
  WHERE sitecam_media_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.documents_sitecam_media_job_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sitecam_media_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sitecam_media sm
    WHERE sm.id = NEW.sitecam_media_id
      AND sm.job_id = NEW.job_id
  ) THEN
    RAISE EXCEPTION 'documents.sitecam_media_id must reference sitecam_media on the same job';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_sitecam_media_job_check_trg
  BEFORE INSERT OR UPDATE OF sitecam_media_id, job_id ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.documents_sitecam_media_job_check();
