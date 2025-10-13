-- Add 'ending_tenancy' status to property_status enum
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'ending_tenancy';