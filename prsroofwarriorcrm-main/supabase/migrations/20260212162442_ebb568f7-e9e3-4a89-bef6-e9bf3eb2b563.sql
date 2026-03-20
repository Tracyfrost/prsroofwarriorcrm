
-- SiteCam Media table
CREATE TABLE public.sitecam_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('photo', 'video')),
  original_path TEXT NOT NULL,
  annotated_path TEXT,
  thumbnail_path TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  annotations JSONB DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SiteCam Pages (digital notebooks / reports)
CREATE TABLE public.sitecam_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_order UUID[] DEFAULT '{}',
  layout JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sitecam_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitecam_pages ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can do all ops (job-level access managed at app layer)
CREATE POLICY "Authenticated users can view sitecam media"
  ON public.sitecam_media FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sitecam media"
  ON public.sitecam_media FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sitecam media"
  ON public.sitecam_media FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sitecam media"
  ON public.sitecam_media FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view sitecam pages"
  ON public.sitecam_pages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sitecam pages"
  ON public.sitecam_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sitecam pages"
  ON public.sitecam_pages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sitecam pages"
  ON public.sitecam_pages FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Public access for shared media (is_public = true)
CREATE POLICY "Public can view shared sitecam media"
  ON public.sitecam_media FOR SELECT
  USING (is_public = true);

-- Updated_at triggers
CREATE TRIGGER update_sitecam_media_updated_at
  BEFORE UPDATE ON public.sitecam_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sitecam_pages_updated_at
  BEFORE UPDATE ON public.sitecam_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for sitecam
INSERT INTO storage.buckets (id, name, public) VALUES ('sitecam', 'sitecam', true);

-- Storage policies
CREATE POLICY "Anyone can view sitecam files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sitecam');

CREATE POLICY "Authenticated users can upload sitecam files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sitecam' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sitecam files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sitecam' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sitecam files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sitecam' AND auth.uid() IS NOT NULL);

-- Enable realtime for sitecam_media
ALTER PUBLICATION supabase_realtime ADD TABLE public.sitecam_media;
