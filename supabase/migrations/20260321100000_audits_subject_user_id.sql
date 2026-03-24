-- Link audits to the user account the event is about (separate from actor user_id).
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audits_subject_user_id ON public.audits(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_audits_actor_subject ON public.audits(user_id, subject_user_id);

COMMENT ON COLUMN public.audits.subject_user_id IS 'Auth user id this event concerns (target account); user_id remains the actor.';

DROP POLICY IF EXISTS "Users read own or admin audits" ON public.audits;

CREATE POLICY "Users read relevant audits" ON public.audits
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = subject_user_id
    OR public.is_admin(auth.uid())
  );
