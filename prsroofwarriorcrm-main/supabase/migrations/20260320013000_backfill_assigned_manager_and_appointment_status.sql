-- Backfill derived fields for existing rows.

-- Customers: assigned_manager_id derived from assigned_rep_id -> profiles.manager_id -> manager profile.user_id
UPDATE public.customers c
SET assigned_manager_id = m.user_id
FROM public.profiles rep
JOIN public.profiles m
  ON m.id = rep.manager_id
WHERE c.assigned_rep_id = rep.user_id
  AND rep.manager_id IS NOT NULL
  AND c.assigned_manager_id IS NULL;

-- Appointments: appointment_status backfill (in case any historical rows were missing)
UPDATE public.appointments
SET appointment_status = 'scheduled'
WHERE appointment_status IS NULL;

