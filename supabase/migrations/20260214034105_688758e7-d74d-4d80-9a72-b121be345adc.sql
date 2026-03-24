
-- Add new columns to expense_types for Phase 38
ALTER TABLE public.expense_types
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Miscellaneous',
  ADD COLUMN IF NOT EXISTS default_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_unit text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- Create view for expense type usage analytics
CREATE OR REPLACE VIEW public.expense_type_usage AS
SELECT 
  et.id as type_id,
  et.name,
  COUNT(je.id) as usage_count,
  COALESCE(AVG(je.amount), 0) as avg_amount,
  COALESCE(SUM(je.amount), 0) as total_amount
FROM public.expense_types et
LEFT JOIN public.job_expenses je ON je.expense_type_id = et.id
GROUP BY et.id, et.name;
