
-- Create draws table for tracking advances/draws against commissions
CREATE TABLE public.draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  type TEXT NOT NULL DEFAULT 'Contract Signed' CHECK (type IN ('Contract Signed', 'ACV/First Check', 'ADV on Commission')),
  amount NUMERIC NOT NULL DEFAULT 0,
  draw_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  deducted_from UUID REFERENCES public.commissions(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins full draws access"
  ON public.draws FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users insert draws"
  ON public.draws FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users read draws on their jobs"
  ON public.draws FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = draws.job_id
      AND (j.sales_rep_id = auth.uid() OR is_admin(auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM job_assignments ja
      WHERE ja.job_id = draws.job_id AND ja.user_id = auth.uid()
    )
  );
