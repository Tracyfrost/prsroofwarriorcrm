-- MVP demo seed for JobVault + SiteForge unification.
-- Forward-compatible by design: inserts are idempotent and only run when source records exist.

DO $$
DECLARE
  owner_user_id uuid;
  manager_user_id uuid;
  office_user_id uuid;
  sales_user_id uuid;
  demo_customer_id uuid;
  main_job_id uuid;
  sub_job_id uuid;
  demo_trade_type_id uuid;
BEGIN
  SELECT p.user_id INTO owner_user_id
  FROM public.profiles p
  ORDER BY p.created_at
  LIMIT 1;

  SELECT p.user_id INTO manager_user_id
  FROM public.profiles p
  WHERE p.user_id <> owner_user_id
  ORDER BY p.created_at
  LIMIT 1;

  SELECT p.user_id INTO office_user_id
  FROM public.profiles p
  WHERE p.user_id NOT IN (owner_user_id, manager_user_id)
  ORDER BY p.created_at
  LIMIT 1;

  SELECT p.user_id INTO sales_user_id
  FROM public.profiles p
  WHERE p.user_id NOT IN (owner_user_id, manager_user_id, office_user_id)
  ORDER BY p.created_at
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RAISE NOTICE 'Skipping MVP seed: no profiles available.';
    RETURN;
  END IF;

  -- Seed basic role hierarchy and must_change_password demo flag.
  INSERT INTO public.user_roles (user_id, role)
  SELECT owner_user_id, 'owner'::public.app_role
  WHERE owner_user_id IS NOT NULL
  UNION ALL
  SELECT manager_user_id, 'manager'::public.app_role
  WHERE manager_user_id IS NOT NULL
  UNION ALL
  SELECT office_user_id, 'office_admin'::public.app_role
  WHERE office_user_id IS NOT NULL
  UNION ALL
  SELECT sales_user_id, 'sales_rep'::public.app_role
  WHERE sales_user_id IS NOT NULL
  ON CONFLICT (user_id, role) DO NOTHING;

  IF sales_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET must_change_password = true
    WHERE user_id = sales_user_id;
  END IF;

  -- Multi-claim customer seed (JobVault).
  INSERT INTO public.customers (
    customer_number,
    name,
    customer_type,
    lead_source,
    assigned_rep_id,
    created_by
  )
  SELECT
    'PRS260420-901',
    'Seed Storm Holdings',
    'residential'::public.customer_type,
    'Storm Referral',
    sales_user_id,
    owner_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.customer_number = 'PRS260420-901'
  );

  SELECT c.id INTO demo_customer_id
  FROM public.customers c
  WHERE c.customer_number = 'PRS260420-901'
  LIMIT 1;

  IF demo_customer_id IS NULL THEN
    RAISE NOTICE 'Skipping downstream MVP seed: customer insert missing.';
    RETURN;
  END IF;

  -- Main + sub jobs with claim hierarchy.
  INSERT INTO public.jobs (
    job_id,
    customer_id,
    claim_number,
    job_type,
    trade_types,
    status,
    sales_rep_id,
    financials,
    estimate_amount
  )
  SELECT
    'PRS260420-901-CLM260420A-1',
    demo_customer_id,
    'CLM260420A',
    'insurance',
    ARRAY['Roof', 'Gutters'],
    'active',
    sales_user_id,
    '{"acv": 18500, "rcv": 24500}'::jsonb,
    18500
  WHERE NOT EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.job_id = 'PRS260420-901-CLM260420A-1'
  );

  SELECT j.id INTO main_job_id
  FROM public.jobs j
  WHERE j.job_id = 'PRS260420-901-CLM260420A-1'
  LIMIT 1;

  INSERT INTO public.jobs (
    job_id,
    customer_id,
    parent_job_id,
    sub_number,
    claim_number,
    job_type,
    trade_types,
    status,
    sales_rep_id,
    financials,
    estimate_amount
  )
  SELECT
    'PRS260420-901-CLM260420A-2',
    demo_customer_id,
    main_job_id,
    2,
    'CLM260420A',
    'insurance',
    ARRAY['Siding'],
    'active',
    sales_user_id,
    '{"acv": 7200, "rcv": 9900}'::jsonb,
    7200
  WHERE main_job_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.job_id = 'PRS260420-901-CLM260420A-2'
    );

  SELECT j.id INTO sub_job_id
  FROM public.jobs j
  WHERE j.job_id = 'PRS260420-901-CLM260420A-2'
  LIMIT 1;

  -- Trade type + production row (SiteForge production board demo).
  INSERT INTO public.trade_types (
    name,
    unit_type,
    default_labor_cost_per_unit,
    default_material_cost_per_unit,
    active,
    sort_order
  )
  SELECT
    'Roof',
    'Squares',
    95,
    215,
    true,
    1
  WHERE NOT EXISTS (
    SELECT 1 FROM public.trade_types t WHERE t.name = 'Roof'
  );

  SELECT t.id INTO demo_trade_type_id
  FROM public.trade_types t
  WHERE t.name = 'Roof'
  LIMIT 1;

  INSERT INTO public.job_production_items (
    job_id,
    trade_type_id,
    scope_description,
    quantity,
    unit_type,
    labor_cost,
    material_cost,
    status,
    assigned_to_user_id,
    created_by,
    qualification_status,
    material_order_status
  )
  SELECT
    main_job_id,
    demo_trade_type_id,
    'Install impact-resistant architectural shingles',
    32,
    'Squares',
    3040,
    6880,
    'scheduled',
    manager_user_id,
    owner_user_id,
    'Go',
    'Ordered'
  WHERE main_job_id IS NOT NULL
    AND demo_trade_type_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.job_production_items p
      WHERE p.job_id = main_job_id
        AND p.scope_description = 'Install impact-resistant architectural shingles'
    );

  -- SiteCam folder + annotated media row (UI demo only; file path is placeholder).
  INSERT INTO public.sitecam_folders (job_id, name)
  SELECT main_job_id, 'Storm Damage Set'
  WHERE main_job_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sitecam_folders f WHERE f.job_id = main_job_id AND f.name = 'Storm Damage Set'
    );

  INSERT INTO public.sitecam_media (
    job_id,
    type,
    original_path,
    annotated_path,
    caption,
    tags,
    annotations,
    uploaded_by
  )
  SELECT
    main_job_id,
    'photo',
    'seed/sitecam/PRS260420-901-CLM260420A-1-damage.jpg',
    'seed/sitecam/PRS260420-901-CLM260420A-1-damage-annotated.jpg',
    'Front slope hail impacts marked for adjuster review',
    ARRAY['hail', 'adjuster-ready', 'front-slope'],
    '{"version":"6.0","objects":[{"type":"rect","left":180,"top":120,"width":160,"height":110,"stroke":"#ff4d4f","fill":"rgba(255,77,79,0.12)","strokeWidth":3}]}'::jsonb,
    office_user_id
  WHERE main_job_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sitecam_media m
      WHERE m.job_id = main_job_id
        AND m.original_path = 'seed/sitecam/PRS260420-901-CLM260420A-1-damage.jpg'
    );

  -- Payment check row for financial aggregation demos.
  INSERT INTO public.payment_checks (
    job_id,
    type,
    status,
    amount,
    date_received,
    notes,
    created_by
  )
  SELECT
    sub_job_id,
    'ACV'::public.check_type,
    'Received'::public.check_status,
    4200,
    CURRENT_DATE,
    'Seed ACV check for sub-claim financial rollup demo.',
    office_user_id
  WHERE sub_job_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_checks pc
      WHERE pc.job_id = sub_job_id
        AND pc.notes = 'Seed ACV check for sub-claim financial rollup demo.'
    );
END;
$$;
