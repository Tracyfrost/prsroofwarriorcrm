
-- Add missing columns to master_leads
ALTER TABLE public.master_leads
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS do_not_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wireless boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dwelling_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dwelling_type_desc text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS homeowner_indicator_desc text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS appointment_time text NOT NULL DEFAULT '';
