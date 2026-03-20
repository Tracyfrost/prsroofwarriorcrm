
-- Add columns to appointments for calendar integrations
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS conflict_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Create integrations_config table
CREATE TABLE IF NOT EXISTS public.integrations_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on key + user_id
ALTER TABLE public.integrations_config ADD CONSTRAINT integrations_config_key_user_unique UNIQUE (key, user_id);

-- Enable RLS
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

-- RLS: users manage own configs, admins manage all
CREATE POLICY "Users manage own integration config"
  ON public.integrations_config FOR ALL
  USING (auth.uid() = user_id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- Conflict detection trigger
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER AS $$
BEGIN
  NEW.conflict_flag = EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id != NEW.id
      AND assignee_id IS NOT NULL
      AND assignee_id = NEW.assignee_id
      AND date_time >= NEW.date_time - (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval
      AND date_time < NEW.date_time + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_appointment_conflict
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_conflict();
