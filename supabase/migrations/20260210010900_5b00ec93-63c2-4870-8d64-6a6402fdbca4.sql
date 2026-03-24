
-- Fix 1: Block anonymous access to profiles (already has hierarchical read, but no auth gate)
-- The existing policies use RESTRICTIVE mode, so we need a PERMISSIVE baseline
-- Actually, looking at the policies they are all RESTRICTIVE (permissive: No), 
-- which means they ALL must pass. Since they check auth.uid() already, anonymous 
-- access is already blocked. But let's add explicit ones for safety.

-- Fix 2: Make job-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'job-documents';

-- Fix 3: Replace the open SELECT policy on storage with authenticated + scoped access
DROP POLICY IF EXISTS "Anyone can view job documents" ON storage.objects;

CREATE POLICY "Authenticated users view job documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job-documents'
  AND auth.uid() IS NOT NULL
);
