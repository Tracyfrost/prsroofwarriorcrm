
-- Keep sitecam bucket public for URL accessibility but the storage RLS policy
-- already restricts SELECT to authenticated users only.
-- The previous migration made it private which breaks image loading.
UPDATE storage.buckets SET public = true WHERE id = 'sitecam';
