-- Consolidated flow configuration: custom_flows + flow_stages (single source of truth).
-- Seeds from job_statuses, production_item_statuses, production_milestones; migrates jobs.status off enum.

-- 1) Core tables
CREATE TABLE public.custom_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enforce_sequence BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.flow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.custom_flows (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  sequence INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flow_id, name),
  UNIQUE (flow_id, sequence)
);

CREATE INDEX idx_flow_stages_flow_sequence ON public.flow_stages (flow_id, sequence);
CREATE INDEX idx_flow_stages_name ON public.flow_stages (name);

CREATE TRIGGER update_custom_flows_updated_at
  BEFORE UPDATE ON public.custom_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flow_stages_updated_at
  BEFORE UPDATE ON public.flow_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Seed flows
INSERT INTO public.custom_flows (flow_type, name, description) VALUES
  ('job_status', 'Job Workflow', 'Sales / job lifecycle statuses on jobs.status'),
  ('production_status', 'Production Pipeline', 'Statuses on job_production_items.status'),
  ('milestone', 'Production milestones', 'Date keys on jobs.production_milestones');

-- 3) Seed stages from legacy config tables
INSERT INTO public.flow_stages (flow_id, name, display_name, sequence, color, active, is_milestone)
SELECT cf.id, js.name, js.display_name, js.sequence, js.color, js.active, FALSE
FROM public.job_statuses js
CROSS JOIN public.custom_flows cf
WHERE cf.flow_type = 'job_status';

INSERT INTO public.flow_stages (flow_id, name, display_name, sequence, color, active, is_milestone)
SELECT cf.id, pis.name, pis.display_name, pis.sequence, pis.color, pis.active, FALSE
FROM public.production_item_statuses pis
CROSS JOIN public.custom_flows cf
WHERE cf.flow_type = 'production_status';

INSERT INTO public.flow_stages (flow_id, name, display_name, sequence, color, active, is_milestone)
SELECT cf.id, pm.name, pm.display_name, pm.sequence, '#6b7280', pm.active, TRUE
FROM public.production_milestones pm
CROSS JOIN public.custom_flows cf
WHERE cf.flow_type = 'milestone';

-- 4) Optional: milestone keys present on jobs JSONB but missing from config
INSERT INTO public.flow_stages (flow_id, name, display_name, sequence, color, active, is_milestone)
SELECT
  cf.id,
  dx.k,
  initcap(replace(dx.k, '_', ' ')),
  base.max_seq + dx.ord,
  '#6b7280',
  FALSE,
  TRUE
FROM public.custom_flows cf
CROSS JOIN LATERAL (
  SELECT u.k, row_number() OVER (ORDER BY u.k) AS ord
  FROM (
    SELECT DISTINCT t.k
    FROM public.jobs j
    CROSS JOIN LATERAL jsonb_object_keys(j.production_milestones) AS t (k)
    WHERE j.production_milestones IS NOT NULL
      AND j.production_milestones <> '{}'::jsonb
  ) u
) dx
CROSS JOIN LATERAL (
  SELECT COALESCE(MAX(fs.sequence), 0)::integer AS max_seq
  FROM public.flow_stages fs
  WHERE fs.flow_id = cf.id
) base
WHERE cf.flow_type = 'milestone'
  AND NOT EXISTS (
    SELECT 1
    FROM public.flow_stages fs2
    WHERE fs2.flow_id = cf.id
      AND fs2.name = dx.k
  );

-- 5) RLS (match existing config tables: is_admin + authenticated read)
ALTER TABLE public.custom_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom_flows"
  ON public.custom_flows
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read custom_flows"
  ON public.custom_flows
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage flow_stages"
  ON public.flow_stages
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read flow_stages"
  ON public.flow_stages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6) jobs.status: enum -> text (values unchanged: lead, inspected, …)
ALTER TABLE public.jobs
  ALTER COLUMN status TYPE text
  USING (status::text);

ALTER TABLE public.jobs
  ALTER COLUMN status SET DEFAULT 'lead';

DROP TYPE public.job_status;

-- Verification (manual): SELECT flow_type, COUNT(*) FROM custom_flows c JOIN flow_stages s ON s.flow_id = c.id GROUP BY 1;
