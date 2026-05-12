-- Add detailed address fields to properties table
ALTER TABLE public.properties
ADD COLUMN city TEXT,
ADD COLUMN state_province TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT DEFAULT 'Germany';