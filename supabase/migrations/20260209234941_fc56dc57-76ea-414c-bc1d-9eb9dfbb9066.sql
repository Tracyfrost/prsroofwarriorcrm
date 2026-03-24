
-- Add verified field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Auto-verify users created by Highest/Admin
-- Update existing Highest/Admin users to be verified
UPDATE public.profiles SET verified = true 
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role IN ('owner', 'office_admin'));
