
-- White-label configuration table
CREATE TABLE public.white_label_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Warrior Command',
  logo_url TEXT,
  colors JSONB NOT NULL DEFAULT '{"command_slate": "210 30% 15%", "command_olive": "85 30% 35%", "command_amber": "38 92% 50%", "command_iron": "210 15% 40%"}'::jsonb,
  icon_style TEXT NOT NULL DEFAULT 'knot-shield',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.white_label_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config" ON public.white_label_config
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Highest can manage config" ON public.white_label_config
  FOR ALL USING (public.is_highest(auth.uid()));

CREATE TRIGGER update_white_label_config_updated_at
  BEFORE UPDATE ON public.white_label_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
