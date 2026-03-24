-- Derive customers.assigned_manager_id from customers.assigned_rep_id
-- using the profiles.manager_id hierarchy.

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS assigned_manager_id uuid NULL;

CREATE OR REPLACE FUNCTION public.derive_customer_assigned_manager_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  manager_user uuid;
BEGIN
  IF NEW.assigned_rep_id IS NULL THEN
    NEW.assigned_manager_id := NULL;
    RETURN NEW;
  END IF;

  NEW.assigned_manager_id := NULL;

  -- assigned_rep_id stores auth.users.id; profiles.user_id references that.
  SELECT m.user_id
  INTO manager_user
  FROM public.profiles rep
  JOIN public.profiles m
    ON m.id = rep.manager_id
  WHERE rep.user_id = NEW.assigned_rep_id
    AND rep.manager_id IS NOT NULL
  LIMIT 1;

  NEW.assigned_manager_id := manager_user;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_derive_customer_assigned_manager_id ON public.customers;

CREATE TRIGGER trg_derive_customer_assigned_manager_id
BEFORE INSERT OR UPDATE OF assigned_rep_id
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.derive_customer_assigned_manager_id();

