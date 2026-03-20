
-- Inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  job_allocations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full inventory access" ON public.inventory FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users read inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-commission trigger: when job status changes to 'completed', create earned commission
CREATE OR REPLACE FUNCTION public.auto_commission_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.sales_rep_id IS NOT NULL THEN
    INSERT INTO public.commissions (rep_id, job_id, amount, status, notes)
    VALUES (
      NEW.sales_rep_id,
      NEW.id,
      COALESCE((NEW.financials->>'acv')::numeric * 0.10, 0),
      'earned',
      'Auto-generated on job completion (10% of ACV)'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_commission_trigger
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.auto_commission_on_complete();
