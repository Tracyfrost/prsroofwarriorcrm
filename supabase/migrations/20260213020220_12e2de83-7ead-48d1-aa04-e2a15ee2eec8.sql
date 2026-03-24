-- Add tooltip_phrases and theme_pack columns to white_label_config
ALTER TABLE public.white_label_config
  ADD COLUMN IF NOT EXISTS tooltip_phrases JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_pack TEXT DEFAULT 'warrior';