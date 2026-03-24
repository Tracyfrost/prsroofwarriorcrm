-- Add explicit UPDATE and DELETE policies for customers table
-- Only admins can update customers
CREATE POLICY "Admins update customers"
ON public.customers
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete customers  
CREATE POLICY "Admins delete customers"
ON public.customers
FOR DELETE
USING (is_admin(auth.uid()));