-- Production War Room: per-line qualification, pre-production, scope metadata

ALTER TABLE public.job_production_items
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS estimate_per_sq numeric NULL,
  ADD COLUMN IF NOT EXISTS pre_draw_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS recoverable_depreciation numeric NULL,
  ADD COLUMN IF NOT EXISTS material_order_status text NOT NULL DEFAULT 'Not Ordered',
  ADD COLUMN IF NOT EXISTS delivery_date timestamptz NULL,
  ADD COLUMN IF NOT EXISTS drop_location text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS crew_assigned jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sol_notes text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.job_production_items
  DROP CONSTRAINT IF EXISTS job_production_items_qualification_status_check,
  DROP CONSTRAINT IF EXISTS job_production_items_material_order_status_check;

ALTER TABLE public.job_production_items
  ADD CONSTRAINT job_production_items_qualification_status_check
    CHECK (qualification_status IN ('Pending', 'Go', 'Hold', 'Supplement')),
  ADD CONSTRAINT job_production_items_material_order_status_check
    CHECK (material_order_status IN ('Not Ordered', 'Ordered', 'Delivered'));

COMMENT ON COLUMN public.job_production_items.scope_metadata IS 'SOW extras: shingle, pitch, layers, etc.';
COMMENT ON COLUMN public.job_production_items.crew_assigned IS 'Array of {user_id, role} for multi-crew assignment';

-- Backfill from jobs.qualification onto preferred line per job (roof trade first, else earliest item)
WITH pick AS (
  SELECT DISTINCT ON (jpi.job_id)
    jpi.id AS item_id,
    j.qualification AS q
  FROM public.job_production_items jpi
  INNER JOIN public.jobs j ON j.id = jpi.job_id
  INNER JOIN public.trade_types tt ON tt.id = jpi.trade_type_id
  WHERE j.qualification IS NOT NULL
    AND j.qualification <> '{}'::jsonb
  ORDER BY
    jpi.job_id,
    CASE WHEN lower(tt.name) LIKE '%roof%' THEN 0 ELSE 1 END,
    jpi.created_at
)
UPDATE public.job_production_items jpi
SET
  pre_draw_amount = COALESCE(
    jpi.pre_draw_amount,
    NULLIF((pick.q->>'first_check_funds')::numeric, 0)
  ),
  estimate_per_sq = COALESCE(
    jpi.estimate_per_sq,
    CASE
      WHEN (pick.q->>'estimate_roof_sq') IS NOT NULL
        AND (pick.q->>'estimate_roof_sq') <> ''
        AND (pick.q->>'estimate_cost') IS NOT NULL
        AND (pick.q->>'estimate_cost') <> ''
        AND (pick.q->>'estimate_roof_sq')::numeric <> 0
      THEN (pick.q->>'estimate_cost')::numeric / (pick.q->>'estimate_roof_sq')::numeric
      ELSE NULL
    END
  )
FROM pick
WHERE jpi.id = pick.item_id;
