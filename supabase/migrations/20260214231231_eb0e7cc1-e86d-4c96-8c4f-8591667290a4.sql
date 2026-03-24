
-- Make sitecam bucket private
UPDATE storage.buckets SET public = false WHERE id = 'sitecam';

-- Drop the overly permissive public SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can view sitecam files" ON storage.objects;
