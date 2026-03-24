
-- Expense types (customizable per org)
CREATE TABLE public.expense_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'receipt',
  allows_negative boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage expense_types" ON public.expense_types FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated read expense_types" ON public.expense_types FOR SELECT USING (auth.uid() IS NOT NULL);

-- Job expenses (per-item tracking)
CREATE TABLE public.job_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  expense_type_id uuid NOT NULL REFERENCES public.expense_types(id),
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_id uuid REFERENCES public.vendors(id),
  sub_id uuid REFERENCES public.subs(id),
  reference_number text DEFAULT '',
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full job_expenses access" ON public.job_expenses FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users insert job_expenses" ON public.job_expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users read job_expenses on their jobs" ON public.job_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_expenses.job_id
        AND (j.sales_rep_id = auth.uid() OR is_admin(auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM job_assignments ja
      WHERE ja.job_id = job_expenses.job_id AND ja.user_id = auth.uid()
    )
  );

-- Seed default expense types
INSERT INTO public.expense_types (name, icon, allows_negative, sort_order) VALUES
  ('Materials', 'package', false, 1),
  ('Labor', 'hard-hat', false, 2),
  ('Other', 'receipt', false, 3),
  ('Returns', 'undo', true, 4);

-- Trigger for updated_at
CREATE TRIGGER update_expense_types_updated_at BEFORE UPDATE ON public.expense_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_expenses_updated_at BEFORE UPDATE ON public.job_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
