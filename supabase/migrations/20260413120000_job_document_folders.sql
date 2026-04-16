-- Job Files: nested folders for Photos and Docs tabs (logical only; storage paths unchanged)

CREATE TYPE public.job_document_folder_scope AS ENUM ('photos', 'documents');

CREATE TABLE public.job_document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.job_document_folders(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  scope public.job_document_folder_scope NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_document_folders_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX job_document_folders_job_scope_root_name_unique
  ON public.job_document_folders (job_id, scope, lower(trim(name)))
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX job_document_folders_job_scope_parent_name_unique
  ON public.job_document_folders (job_id, parent_id, lower(trim(name)))
  WHERE parent_id IS NOT NULL;

CREATE INDEX job_document_folders_job_scope_parent_idx
  ON public.job_document_folders (job_id, scope, parent_id);

CREATE TRIGGER update_job_document_folders_updated_at
  BEFORE UPDATE ON public.job_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.job_document_folders_parent_job_scope_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.job_document_folders p
      WHERE p.id = NEW.parent_id
        AND p.job_id = NEW.job_id
        AND p.scope = NEW.scope
    ) THEN
      RAISE EXCEPTION 'job_document_folders.parent_id must be same job and scope';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_document_folders_parent_job_scope_check_trg
  BEFORE INSERT OR UPDATE OF parent_id, job_id, scope ON public.job_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.job_document_folders_parent_job_scope_check();

ALTER TABLE public.documents
  ADD COLUMN folder_id UUID REFERENCES public.job_document_folders(id) ON DELETE SET NULL;

CREATE INDEX documents_folder_id_idx ON public.documents (folder_id);

CREATE OR REPLACE FUNCTION public.documents_folder_scope_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  f RECORD;
BEGIN
  IF NEW.folder_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT job_id, scope INTO f FROM public.job_document_folders WHERE id = NEW.folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'documents.folder_id is invalid';
  END IF;
  IF f.job_id IS DISTINCT FROM NEW.job_id THEN
    RAISE EXCEPTION 'documents.folder_id must belong to the same job';
  END IF;
  IF f.scope = 'photos'::public.job_document_folder_scope AND NEW.type IS DISTINCT FROM 'photo' THEN
    RAISE EXCEPTION 'Only photo documents may be placed in Photos folders';
  END IF;
  IF f.scope = 'documents'::public.job_document_folder_scope AND NEW.type NOT IN ('contract', 'invoice', 'other') THEN
    RAISE EXCEPTION 'Only contract, invoice, or other documents may be placed in Docs folders';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_folder_scope_check_trg
  BEFORE INSERT OR UPDATE OF folder_id, type, job_id ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.documents_folder_scope_check();

ALTER TABLE public.job_document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full job_document_folders access"
  ON public.job_document_folders FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read job_document_folders on their jobs"
  ON public.job_document_folders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_document_folders.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users insert job_document_folders on their jobs"
  ON public.job_document_folders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_document_folders.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users update job_document_folders on their jobs"
  ON public.job_document_folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_document_folders.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_document_folders.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users delete job_document_folders on their jobs"
  ON public.job_document_folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_document_folders.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users update documents on their jobs"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = documents.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = documents.job_id
        AND (jobs.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
