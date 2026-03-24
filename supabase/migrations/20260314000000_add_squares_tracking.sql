-- Option B: Squares tracking columns on jobs
-- Backward compatible: number_of_squares remains; new columns backfilled from it.

-- 1) Add new columns
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS squares_estimated numeric NULL,
  ADD COLUMN IF NOT EXISTS squares_actual_installed numeric NULL,
  ADD COLUMN IF NOT EXISTS squares_final numeric NULL;

-- 2) Backfill from legacy number_of_squares
UPDATE public.jobs
SET
  squares_actual_installed = COALESCE(squares_actual_installed, number_of_squares),
  squares_final = COALESCE(squares_final, number_of_squares)
WHERE number_of_squares IS NOT NULL;

-- 3) CHECK constraints (allow NULL; when set, must be >= 0)
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_squares_estimated_non_negative,
  DROP CONSTRAINT IF EXISTS jobs_squares_actual_installed_non_negative,
  DROP CONSTRAINT IF EXISTS jobs_squares_final_non_negative;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_squares_estimated_non_negative CHECK (squares_estimated IS NULL OR squares_estimated >= 0),
  ADD CONSTRAINT jobs_squares_actual_installed_non_negative CHECK (squares_actual_installed IS NULL OR squares_actual_installed >= 0),
  ADD CONSTRAINT jobs_squares_final_non_negative CHECK (squares_final IS NULL OR squares_final >= 0);

-- 4) Indexes for reporting (jobs has no tenant_id in schema; use sales_rep_id + created_at)
CREATE INDEX IF NOT EXISTS idx_jobs_squares_actual_installed
  ON public.jobs (sales_rep_id, squares_actual_installed)
  WHERE squares_actual_installed IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_created_at_rep
  ON public.jobs (sales_rep_id, created_at)
  WHERE deleted_at IS NULL;

-- saved_reports for Custom Reports v1 (saved configs)
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON public.saved_reports (user_id);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved reports"
  ON public.saved_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
