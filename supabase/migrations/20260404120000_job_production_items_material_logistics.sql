-- Per-line material PO / carrier / tracking (War Room delivery tracking)

ALTER TABLE public.job_production_items
  ADD COLUMN IF NOT EXISTS material_logistics jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.job_production_items.material_logistics IS 'Optional: po_number, carrier, tracking_number, tracking_url, notes';
