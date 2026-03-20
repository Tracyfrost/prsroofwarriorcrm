
-- Add color column to lead_sources table
ALTER TABLE public.lead_sources ADD COLUMN color TEXT NOT NULL DEFAULT '#6B7280';

-- Add index for color lookups
CREATE INDEX idx_lead_sources_color ON public.lead_sources(color);
