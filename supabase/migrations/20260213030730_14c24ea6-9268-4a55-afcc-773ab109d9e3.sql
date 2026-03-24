
-- Create allies table merging vendors + subs with expanded fields
CREATE TABLE public.allies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Vendor' CHECK (type IN ('Vendor', 'Sub')),
  ein TEXT,
  contact_info JSONB DEFAULT '{"phones":[],"emails":[]}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index on EIN (partial - only non-null/non-empty)
CREATE UNIQUE INDEX allies_ein_unique ON public.allies (ein) WHERE ein IS NOT NULL AND ein != '';

-- Enable RLS
ALTER TABLE public.allies ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can CRUD
CREATE POLICY "Admins can manage allies" ON public.allies
  FOR ALL USING (public.is_admin(auth.uid()));

-- Authenticated users can read
CREATE POLICY "Authenticated users can read allies" ON public.allies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Migrate existing vendors into allies
INSERT INTO public.allies (id, name, type, contact_info, active, created_at, updated_at)
SELECT id, name, 'Vendor', COALESCE(contact_info, '{"phones":[],"emails":[]}'::jsonb), active, created_at, updated_at
FROM public.vendors;

-- Migrate existing subs into allies
INSERT INTO public.allies (id, name, type, contact_info, active, created_at, updated_at)
SELECT id, name, 'Sub', COALESCE(contact_info, '{"phones":[],"emails":[]}'::jsonb), active, created_at, updated_at
FROM public.subs;

-- Add ally_id to job_expenses
ALTER TABLE public.job_expenses ADD COLUMN ally_id UUID REFERENCES public.allies(id);

-- Backfill ally_id from existing vendor_id / sub_id
UPDATE public.job_expenses SET ally_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE public.job_expenses SET ally_id = sub_id WHERE sub_id IS NOT NULL AND ally_id IS NULL;

-- Add updated_at trigger
CREATE TRIGGER update_allies_updated_at
  BEFORE UPDATE ON public.allies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample allies
INSERT INTO public.allies (name, type, ein, contact_info, notes) VALUES
  ('ABC Materials', 'Vendor', '12-3456789', '{"phones":[{"type":"office","number":"555-100-1000"}],"emails":[{"type":"sales","address":"sales@abcmat.com"}]}', 'Primary material supplier'),
  ('Mendoza Roofing', 'Sub', '98-7654321', '{"phones":[{"type":"mobile","number":"555-200-2000"}],"emails":[{"type":"main","address":"mendoza@roof.com"}]}', 'Roofing specialist'),
  ('Juan Gutters LLC', 'Sub', '11-2233445', '{"phones":[{"type":"mobile","number":"555-300-3000"},{"type":"office","number":"555-300-3001"}],"emails":[{"type":"billing","address":"billing@juangutters.com"}]}', 'Gutters and downspouts');
