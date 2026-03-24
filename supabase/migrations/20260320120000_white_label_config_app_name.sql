-- Browser tab title suffix for usePageTitle / Branding (Settings → App Name)
ALTER TABLE public.white_label_config
  ADD COLUMN IF NOT EXISTS app_name TEXT;
