
-- Add new enums
CREATE TYPE customer_type AS ENUM ('residential', 'commercial');
CREATE TYPE lead_source AS ENUM ('self_gen', 'referral', 'marketing', 'website', 'insurance', 'other');

-- Add new columns to customers
ALTER TABLE public.customers
  ADD COLUMN customer_type customer_type DEFAULT 'residential',
  ADD COLUMN company_name TEXT DEFAULT '',
  ADD COLUMN assigned_rep_id UUID REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN lead_source lead_source DEFAULT NULL,
  ADD COLUMN referred_by TEXT DEFAULT '',
  ADD COLUMN prior_crm_location TEXT DEFAULT '',
  ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN billing_address JSONB DEFAULT NULL;

-- Validation trigger: require company_name for commercial customers
CREATE OR REPLACE FUNCTION public.validate_customer_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_type = 'commercial' AND (NEW.company_name IS NULL OR NEW.company_name = '') THEN
    RAISE EXCEPTION 'Company name is required for commercial customers';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_customer_type
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_customer_type();
