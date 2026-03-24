
-- Add constraints to lead_sources table
ALTER TABLE lead_sources ADD CONSTRAINT unique_lead_source_name UNIQUE (name);
ALTER TABLE lead_sources ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 50);
ALTER TABLE lead_sources ALTER COLUMN active SET DEFAULT true;
