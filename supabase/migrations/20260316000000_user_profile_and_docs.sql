-- User profile page: new profile columns, user_documents, time_off_requests, user-documents bucket

-- 1. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_link TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_text TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. user_document_type for user_documents.document_type
CREATE TYPE public.user_document_type AS ENUM (
  'document', 'w2', 'dl', 'misc', 'profile_pic'
);

-- 3. user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type public.user_document_type NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id_type ON public.user_documents(user_id, document_type);

-- RLS: user can do everything on own rows; admins/highest and team (managers) can SELECT
CREATE POLICY "Users full access own user_documents"
ON public.user_documents FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and team read user_documents"
ON public.user_documents FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR public.get_user_level(auth.uid()) = 'highest'::public.user_level
  OR user_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

-- 4. time_off_request_status enum
CREATE TYPE public.time_off_request_status AS ENUM ('pending', 'approved', 'denied');

-- 5. time_off_requests table
CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.time_off_request_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_time_off_requests_user_id ON public.time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON public.time_off_requests(start_date, end_date);

-- RLS: user can SELECT/INSERT own; managers/admins can SELECT team and UPDATE (approve/deny)
CREATE POLICY "Users read own time_off_requests"
ON public.time_off_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins read team time_off_requests"
ON public.time_off_requests FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.get_user_level(auth.uid()) = 'highest'::public.user_level
  OR user_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

CREATE POLICY "Users insert own time_off_requests"
ON public.time_off_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own time_off_requests"
ON public.time_off_requests FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins update time_off_requests"
ON public.time_off_requests FOR UPDATE
USING (
  public.is_admin(auth.uid())
  OR public.get_user_level(auth.uid()) = 'highest'::public.user_level
  OR user_id IN (SELECT public.get_team_user_ids(auth.uid()))
);

-- 6. user-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path format {user_id}/{document_type}/{filename}
-- Allow SELECT for own path or admin/highest or path user_id in team
CREATE POLICY "User-documents SELECT own and team"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-documents'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR public.get_user_level(auth.uid()) = 'highest'::public.user_level
    OR (storage.foldername(name))[1]::uuid IN (SELECT public.get_team_user_ids(auth.uid()))
  )
);

CREATE POLICY "User-documents INSERT own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User-documents UPDATE own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User-documents DELETE own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
