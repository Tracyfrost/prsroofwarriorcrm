
-- Create check type and status enums
DO $$ BEGIN
  CREATE TYPE public.check_type AS ENUM ('ACV', '2nd_ACV', 'Depreciation', 'Final', 'Supplement', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.check_status AS ENUM ('Pending', 'Received', 'Deposited', 'Disputed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create payment_checks table
CREATE TABLE IF NOT EXISTS public.payment_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type public.check_type NOT NULL DEFAULT 'ACV',
  date_received TIMESTAMPTZ,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status public.check_status NOT NULL DEFAULT 'Received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create check_history table
CREATE TABLE IF NOT EXISTS public.check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES public.payment_checks(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_history ENABLE ROW LEVEL SECURITY;

-- RLS for payment_checks
CREATE POLICY "Admins full payment_checks access" ON public.payment_checks FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read payment_checks on their jobs" ON public.payment_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = payment_checks.job_id
        AND (j.sales_rep_id = auth.uid() OR public.is_admin(auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja WHERE ja.job_id = payment_checks.job_id AND ja.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users insert payment_checks" ON public.payment_checks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for check_history
CREATE POLICY "Admins full check_history access" ON public.check_history FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users read check_history" ON public.check_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert check_history" ON public.check_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Updated_at trigger for payment_checks
CREATE TRIGGER update_payment_checks_updated_at
  BEFORE UPDATE ON public.payment_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History trigger for check changes
CREATE OR REPLACE FUNCTION public.log_check_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO public.check_history (check_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'amount', OLD.amount::text, NEW.amount::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    INSERT INTO public.check_history (check_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'type', OLD.type::text, NEW.type::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.check_history (check_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status::text, NEW.status::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
  IF OLD.date_received IS DISTINCT FROM NEW.date_received THEN
    INSERT INTO public.check_history (check_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'date_received', OLD.date_received::text, NEW.date_received::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_check_history
  BEFORE UPDATE ON public.payment_checks
  FOR EACH ROW EXECUTE FUNCTION public.log_check_change();
