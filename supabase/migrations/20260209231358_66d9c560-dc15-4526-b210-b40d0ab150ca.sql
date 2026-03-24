
-- Document type enum
CREATE TYPE public.doc_type AS ENUM ('contract', 'invoice', 'photo', 'other');

-- Commission status enum
CREATE TYPE public.commission_status AS ENUM ('earned', 'paid');

-- Documents table
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type doc_type NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_size bigint DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Commissions table
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL DEFAULT 0,
  status commission_status NOT NULL DEFAULT 'earned',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Documents RLS: admins full access, sales rep on their jobs can read
CREATE POLICY "Admins full document access"
ON public.documents FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users insert documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users read documents on their jobs"
ON public.documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = documents.job_id
    AND (jobs.sales_rep_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Commissions RLS: admins full, reps read own
CREATE POLICY "Admins full commission access"
ON public.commissions FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Reps read own commissions"
ON public.commissions FOR SELECT
USING (auth.uid() = rep_id);

-- Storage bucket for job documents
INSERT INTO storage.buckets (id, name, public) VALUES ('job-documents', 'job-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users upload job documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view job documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-documents');

CREATE POLICY "Admins delete job documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-documents' AND is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_documents_job_id ON public.documents(job_id);
CREATE INDEX idx_commissions_rep_id ON public.commissions(rep_id);
CREATE INDEX idx_commissions_job_id ON public.commissions(job_id);
