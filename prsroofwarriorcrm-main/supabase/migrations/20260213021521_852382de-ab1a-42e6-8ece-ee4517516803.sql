
-- Vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'material' CHECK (type IN ('material', 'labor', 'misc')),
  contact_info JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read vendors" ON public.vendors FOR SELECT USING (auth.uid() IS NOT NULL);

-- Subs (subcontractors) table
CREATE TABLE public.subs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  contact_info JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subs" ON public.subs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read subs" ON public.subs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add tracking jsonb to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tracking JSONB DEFAULT '{}'::jsonb;
