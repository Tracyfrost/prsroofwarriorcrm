-- Global search: customers by name, numbers, JSON fields, and related job claim/job_id.
-- SECURITY INVOKER so RLS on customers/jobs applies to the caller.

CREATE OR REPLACE FUNCTION public.search_customers_global(
  search_query text,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  customer_number text,
  match_hint text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      t.qraw,
      CASE
        WHEN length(t.qraw) < 2 THEN NULL
        ELSE '%' || t.qraw || '%'
      END AS pat
    FROM (SELECT trim(coalesce(search_query, '')) AS qraw) AS t
  )
  SELECT
    c.id,
    c.name,
    c.customer_number,
    coalesce(
      (
        SELECT CASE
          WHEN j.claim_number IS NOT NULL AND trim(j.claim_number) <> '' THEN 'Claim #' || j.claim_number
          ELSE 'Job ' || j.job_id::text
        END
        FROM jobs j
        WHERE j.customer_id = c.id
          AND j.deleted_at IS NULL
          AND (
            (j.claim_number IS NOT NULL AND j.claim_number ILIKE p.pat)
            OR j.job_id::text ILIKE p.pat
          )
        ORDER BY j.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      nullif(
        trim(
          concat_ws(
            ' · ',
            nullif(trim(concat_ws(', ', c.main_address->>'city', c.main_address->>'state')), ''),
            nullif(trim(c.main_address->>'zip'), '')
          )
        ),
        ''
      ),
      c.customer_number
    ) AS match_hint
  FROM customers c
  CROSS JOIN p
  WHERE p.pat IS NOT NULL
    AND (
      c.name ILIKE p.pat
      OR c.customer_number ILIKE p.pat
      OR (c.company_name IS NOT NULL AND c.company_name ILIKE p.pat)
      OR (c.insurance_carrier IS NOT NULL AND c.insurance_carrier ILIKE p.pat)
      OR coalesce(c.main_address->>'street', '') ILIKE p.pat
      OR coalesce(c.main_address->>'city', '') ILIKE p.pat
      OR coalesce(c.main_address->>'state', '') ILIKE p.pat
      OR coalesce(c.main_address->>'zip', '') ILIKE p.pat
      OR coalesce(c.billing_address->>'street', '') ILIKE p.pat
      OR coalesce(c.billing_address->>'city', '') ILIKE p.pat
      OR coalesce(c.billing_address->>'state', '') ILIKE p.pat
      OR coalesce(c.billing_address->>'zip', '') ILIKE p.pat
      OR coalesce(c.name_json::text, '') ILIKE p.pat
      OR coalesce(c.contact_info::text, '') ILIKE p.pat
      OR EXISTS (
        SELECT 1
        FROM jobs j
        WHERE j.customer_id = c.id
          AND j.deleted_at IS NULL
          AND (
            (j.claim_number IS NOT NULL AND j.claim_number ILIKE p.pat)
            OR j.job_id::text ILIKE p.pat
          )
      )
    )
  ORDER BY c.name ASC
  LIMIT greatest(1, least(coalesce(result_limit, 20), 50));
$$;

COMMENT ON FUNCTION public.search_customers_global(text, integer) IS
  'Search customers by name, customer #, address fields, contact_info, name_json, insurance, and related job claim/job_id.';

GRANT EXECUTE ON FUNCTION public.search_customers_global(text, integer) TO authenticated;
