-- Reorder flow_stages without violating UNIQUE (flow_id, sequence).
-- Sequential client updates conflict; this runs in one transaction.

CREATE OR REPLACE FUNCTION public.apply_flow_stage_order(ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  fid uuid;
  array_len int;
  distinct_id_cnt int;
  flow_distinct_cnt int;
  flow_stage_cnt int;
BEGIN
  IF ordered_ids IS NULL THEN
    RETURN;
  END IF;

  array_len := cardinality(ordered_ids);
  IF array_len IS NULL OR array_len = 0 THEN
    RETURN;
  END IF;

  SELECT count(*)::int INTO distinct_id_cnt FROM (SELECT DISTINCT x FROM unnest(ordered_ids) AS t(x)) s;
  IF distinct_id_cnt <> array_len THEN
    RAISE EXCEPTION 'ordered_ids must not contain duplicates';
  END IF;

  SELECT count(DISTINCT flow_id)::int INTO flow_distinct_cnt
  FROM public.flow_stages
  WHERE id = ANY (ordered_ids);

  IF flow_distinct_cnt = 0 THEN
    RAISE EXCEPTION 'No matching flow stages for given ids';
  END IF;

  IF flow_distinct_cnt > 1 THEN
    RAISE EXCEPTION 'ordered_ids must belong to a single flow';
  END IF;

  SELECT flow_id INTO fid
  FROM public.flow_stages
  WHERE id = ordered_ids[1]
  LIMIT 1;

  IF fid IS NULL THEN
    RAISE EXCEPTION 'Invalid stage id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ordered_ids) AS u(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.flow_stages fs WHERE fs.id = u.id AND fs.flow_id = fid
    )
  ) THEN
    RAISE EXCEPTION 'Unknown stage id or wrong flow';
  END IF;

  SELECT count(*)::int INTO flow_stage_cnt FROM public.flow_stages WHERE flow_id = fid;
  IF flow_stage_cnt <> array_len THEN
    RAISE EXCEPTION 'ordered_ids must include every stage for this flow (expected %, got %)', flow_stage_cnt, array_len;
  END IF;

  UPDATE public.flow_stages fs
  SET sequence = -fs.sequence
  WHERE fs.id = ANY (ordered_ids);

  UPDATE public.flow_stages fs
  SET sequence = u.sort_order::integer
  FROM unnest(ordered_ids) WITH ORDINALITY AS u(stage_id, sort_order)
  WHERE fs.id = u.stage_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_flow_stage_order(uuid[]) TO authenticated;
