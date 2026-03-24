-- Seed additional lead sources for intake
-- (keeps existing sources intact; uses WHERE NOT EXISTS for safety)

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'door_knock'::text,
  'Door Knock'::text,
  7::int,
  '#f97316'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'door_knock');

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'telemarketing_vendor'::text,
  'Telemarketing Vendor'::text,
  8::int,
  '#3b82f6'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'telemarketing_vendor');

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'affiliate'::text,
  'Affiliate'::text,
  9::int,
  '#8b5cf6'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'affiliate');

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'facebook'::text,
  'Facebook'::text,
  10::int,
  '#2563eb'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'facebook');

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'google'::text,
  'Google'::text,
  11::int,
  '#22c55e'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'google');

INSERT INTO public.lead_sources (name, display_name, sort_order, color, active, requires_pool, default_cost_per_lead)
SELECT
  'yard_sign'::text,
  'Yard Sign'::text,
  12::int,
  '#10b981'::text,
  true,
  false,
  0::numeric
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'yard_sign');

