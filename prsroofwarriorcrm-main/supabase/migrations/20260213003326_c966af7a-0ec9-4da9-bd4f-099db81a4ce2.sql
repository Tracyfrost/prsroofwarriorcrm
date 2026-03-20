
-- Add override columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS overridden_by UUID,
  ADD COLUMN IF NOT EXISTS override_notes TEXT;

-- Create RLS policy for highest-level users to update any subscription
CREATE POLICY "Highest can override subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (is_highest(auth.uid()))
  WITH CHECK (is_highest(auth.uid()));

-- Allow highest to insert subscriptions for any user
CREATE POLICY "Highest can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_highest(auth.uid()) OR auth.uid() = user_id);
