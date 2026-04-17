-- Customer archive lifecycle and guarded hard delete.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_active
  ON public.customers (created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_archived_at
  ON public.customers (archived_at DESC)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.customers.archived_at IS 'When set, customer is archived and hidden from active CRM workflows.';
COMMENT ON COLUMN public.customers.archived_by IS 'Auth user id that archived the customer.';
COMMENT ON COLUMN public.customers.archive_reason IS 'Optional reason captured during archive action.';

CREATE OR REPLACE FUNCTION public.can_delete_customer_row(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.level IN ('highest'::public.user_level, 'admin'::public.user_level)
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('owner'::public.app_role, 'office_admin'::public.app_role)
  );
$$;

DROP POLICY IF EXISTS "Admins delete customers" ON public.customers;
CREATE POLICY "Admins delete customers"
ON public.customers
FOR DELETE
USING (public.can_delete_customer_row(auth.uid()));

CREATE OR REPLACE FUNCTION public.customers_enforce_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_delete_customer_row(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to delete customers';
  END IF;

  IF EXISTS (SELECT 1 FROM public.jobs j WHERE j.customer_id = OLD.id AND j.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'cannot delete customer with active jobs';
  END IF;

  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.customer_id = OLD.id) THEN
    RAISE EXCEPTION 'cannot delete customer with appointments';
  END IF;

  IF EXISTS (SELECT 1 FROM public.lead_assignments la WHERE la.customer_id = OLD.id) THEN
    RAISE EXCEPTION 'cannot delete customer with lead assignments';
  END IF;

  IF EXISTS (SELECT 1 FROM public.master_leads ml WHERE ml.customer_id = OLD.id) THEN
    RAISE EXCEPTION 'cannot delete customer with linked leads';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_enforce_delete_guard ON public.customers;
CREATE TRIGGER trg_customers_enforce_delete_guard
  BEFORE DELETE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_enforce_delete_guard();
