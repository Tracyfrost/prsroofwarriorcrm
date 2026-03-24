
-- Fix: Remove WHEN clause from qualification trigger (handle inside function body)
CREATE OR REPLACE FUNCTION public.update_qualification_variance()
RETURNS TRIGGER AS $$
DECLARE
  est_cost numeric;
  first_funds numeric;
  variance numeric;
  qual_status text;
BEGIN
  IF NEW.qualification IS NOT NULL AND NEW.qualification != '{}'::jsonb THEN
    est_cost := COALESCE((NEW.qualification->>'estimate_cost')::numeric, 0);
    first_funds := COALESCE((NEW.qualification->>'first_check_funds')::numeric, 0);
    variance := est_cost - first_funds;

    IF variance <= 0 THEN
      qual_status := 'Qualified';
    ELSIF variance < 10000 THEN
      qual_status := 'Review';
    ELSE
      qual_status := 'Underfunded';
    END IF;

    NEW.qualification := NEW.qualification || jsonb_build_object('variance', variance, 'status', qual_status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_qual_variance
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_qualification_variance();

-- Trigger: log milestone changes
CREATE OR REPLACE FUNCTION public.log_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
  key text;
  old_val timestamptz;
  new_val timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.production_milestones IS DISTINCT FROM OLD.production_milestones THEN
    FOR key IN SELECT jsonb_object_keys(NEW.production_milestones)
    LOOP
      old_val := (OLD.production_milestones->>key)::timestamptz;
      new_val := (NEW.production_milestones->>key)::timestamptz;
      IF new_val IS DISTINCT FROM old_val THEN
        INSERT INTO public.milestone_history (job_id, milestone_type, old_value, new_value, changed_by)
        VALUES (NEW.id, key, old_val, new_val, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_milestone_history
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_milestone_change();
