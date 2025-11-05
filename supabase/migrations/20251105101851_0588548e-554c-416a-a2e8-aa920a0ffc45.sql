-- Add default_rent_settings column to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS default_rent_settings jsonb DEFAULT '{
    "require_kyc": false,
    "default_deposit_amount": 0,
    "require_payment_confirmation": true,
    "require_water_bill": false,
    "require_electricity_bill": false,
    "custom_bills": []
  }'::jsonb;