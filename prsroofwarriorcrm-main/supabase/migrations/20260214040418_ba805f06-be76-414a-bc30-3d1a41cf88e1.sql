
-- Add missing global settings for Claim/Ally/Expense configuration
INSERT INTO public.global_settings (key, value, description, category)
VALUES 
  ('auto_propagate_claim_to_subs', 'true', 'Automatically propagate claim number from Main Job to linked Sub Jobs', 'defaults'),
  ('require_ein_on_allies', 'false', 'Require EIN (Tax ID) when adding new Allies', 'defaults'),
  ('require_adjuster_contact', 'false', 'Require adjuster contact info when saving insurance claims', 'defaults'),
  ('auto_fill_carrier_from_customer', 'true', 'Auto-fill carrier from customer insurance_carrier on new claims', 'defaults'),
  ('default_expense_category', '"Miscellaneous"', 'Default category for new expense types', 'financials'),
  ('enable_expense_analytics', 'true', 'Show usage analytics columns in Expense Types grid', 'financials')
ON CONFLICT (key) DO NOTHING;
