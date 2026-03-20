-- Drop the trigger that references non-existent 'qualification' column on jobs table
DROP TRIGGER IF EXISTS update_qualification_variance ON public.jobs;

-- Also drop the milestone logging trigger if it references non-existent columns
DROP TRIGGER IF EXISTS log_milestone_change ON public.jobs;