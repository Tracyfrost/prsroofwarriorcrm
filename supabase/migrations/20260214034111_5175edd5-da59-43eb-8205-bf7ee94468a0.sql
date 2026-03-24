
-- Fix: Change view to use SECURITY INVOKER (default for newer PG, but explicit here)
DROP VIEW IF EXISTS public.expense_type_usage;
CREATE VIEW public.expense_type_usage 
WITH (security_invoker = true)
AS
SELECT 
  et.id as type_id,
  et.name,
  COUNT(je.id) as usage_count,
  COALESCE(AVG(je.amount), 0) as avg_amount,
  COALESCE(SUM(je.amount), 0) as total_amount
FROM public.expense_types et
LEFT JOIN public.job_expenses je ON je.expense_type_id = et.id
GROUP BY et.id, et.name;
