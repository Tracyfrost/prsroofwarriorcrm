
-- Change lead_source from enum to text type to support custom values
ALTER TABLE customers 
ALTER COLUMN lead_source TYPE text USING lead_source::text;
