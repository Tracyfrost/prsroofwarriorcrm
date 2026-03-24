
-- Add last_login column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;
