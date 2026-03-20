-- Run this in Supabase SQL Editor after migration push to validate schema.
-- forge-ops-crm (jpwameqbirjeomwhxfyh)

-- 1) Public tables (expect many; list names)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2) Enums in public
SELECT t.typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
ORDER BY t.typname;

-- 3) Views in public
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4) Functions in public (names only)
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 5) jobs table exists and has expected columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'jobs'
ORDER BY ordinal_position;

-- 6) saved_reports table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'saved_reports'
ORDER BY ordinal_position;

-- 7) jobs squares columns (Option B)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'jobs'
  AND column_name IN ('squares_estimated', 'squares_actual_installed', 'squares_final');
