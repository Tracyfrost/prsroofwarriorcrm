
-- 1. Add name_json column to customers for structured name data
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS name_json jsonb DEFAULT '{}';

-- 2. Migrate existing name data into name_json (split on space: last word = last, rest = first)
UPDATE public.customers 
SET name_json = jsonb_build_object(
  'primary', jsonb_build_object(
    'first', CASE WHEN position(' ' in name) > 0 THEN trim(substring(name from 1 for length(name) - length(split_part(name, ' ', array_length(string_to_array(name, ' '), 1))))) ELSE name END,
    'last', CASE WHEN position(' ' in name) > 0 THEN split_part(name, ' ', array_length(string_to_array(name, ' '), 1)) ELSE '' END
  ),
  'spouse', null
)
WHERE name_json IS NULL OR name_json = '{}';

-- 3. Create trigger to auto-sync name from name_json on insert/update
CREATE OR REPLACE FUNCTION public.sync_customer_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name_json IS NOT NULL AND NEW.name_json != '{}'::jsonb THEN
    NEW.name := COALESCE(
      NULLIF(TRIM(
        COALESCE(NEW.name_json->'primary'->>'first', '') || ' ' || 
        COALESCE(NEW.name_json->'primary'->>'last', '')
      ), ''),
      NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_customer_name
BEFORE INSERT OR UPDATE OF name_json ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_name();

-- 4. Create import_logs table for tracking CSV imports
CREATE TABLE public.import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]',
  mappings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own import logs"
ON public.import_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full import_logs access"
ON public.import_logs FOR ALL
USING (is_admin(auth.uid()));
