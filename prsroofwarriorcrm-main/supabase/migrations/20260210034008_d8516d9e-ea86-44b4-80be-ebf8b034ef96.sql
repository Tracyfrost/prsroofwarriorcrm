-- Drop triggers referencing non-existent columns
DROP TRIGGER IF EXISTS trg_qual_variance ON public.jobs;
DROP TRIGGER IF EXISTS trg_milestone_history ON public.jobs;