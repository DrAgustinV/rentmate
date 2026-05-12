-- =====================================================
-- Phase 4: Database Schema Cleanup - KILT Only
-- =====================================================
-- This migration removes all Dock Labs related columns
-- and optimizes the schema for KILT Protocol only
-- =====================================================

-- 1. Drop the dock_signed_contracts view first (it depends on dock columns)
DROP VIEW IF EXISTS public.dock_signed_contracts CASCADE;

-- 2. Drop the table if it exists (not a view)
DROP TABLE IF EXISTS public.dock_signed_contracts CASCADE;

-- 3. Remove Dock columns from contract_signatures table
ALTER TABLE public.contract_signatures 
  DROP COLUMN IF EXISTS dock_workflow_id CASCADE,
  DROP COLUMN IF EXISTS dock_contract_url CASCADE,
  DROP COLUMN IF EXISTS dock_manager_signature_proof CASCADE,
  DROP COLUMN IF EXISTS dock_tenant_signature_proof CASCADE;

-- 4. Add indexes for frequently queried KILT KYC columns in profiles
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status 
  ON public.profiles(kyc_status) 
  WHERE kyc_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_wallet_did 
  ON public.profiles(kyc_wallet_did) 
  WHERE kyc_wallet_did IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_verified 
  ON public.profiles(kyc_verified_at) 
  WHERE kyc_verified_at IS NOT NULL;

-- 5. Add index for contract signatures by tenancy
CREATE INDEX IF NOT EXISTS idx_contract_signatures_tenancy 
  ON public.contract_signatures(tenancy_id);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_workflow_status 
  ON public.contract_signatures(workflow_status);

-- 6. Add comments to document the KILT KYC data model
COMMENT ON COLUMN public.profiles.kyc_status IS 
  'KILT Protocol KYC verification status: not_started, pending, verified, rejected, expired';

COMMENT ON COLUMN public.profiles.kyc_credential_id IS 
  'KILT Protocol credential ID for the KYC verification';

COMMENT ON COLUMN public.profiles.kyc_qr_code_url IS 
  'Sporran wallet deep link URL for KILT KYC verification (format: sporran://...)';

COMMENT ON COLUMN public.profiles.kyc_wallet_did IS 
  'KILT Protocol DID (Decentralized Identifier) from user Sporran wallet';

COMMENT ON COLUMN public.profiles.kyc_verified_at IS 
  'Timestamp when KILT KYC verification was completed';

COMMENT ON COLUMN public.profiles.kyc_expires_at IS 
  'Timestamp when KILT KYC verification expires';

COMMENT ON COLUMN public.profiles.require_kyc_for_contracts IS 
  'Whether KILT KYC verification is required before contract signing';

COMMENT ON TABLE public.contract_signatures IS 
  'Contract signature workflows supporting Mock and DocuSeal methods. KILT KYC can optionally enhance security.';

-- =====================================================
-- Final KILT KYC Data Model Documentation
-- =====================================================
--
-- KILT Protocol Integration:
-- -------------------------
-- The system uses KILT Protocol for blockchain-based identity verification.
-- Users verify their identity through the Sporran wallet app.
--
-- KYC Workflow:
-- 1. User initiates KYC via edge function: initiate-kilt-kyc
-- 2. System stores kyc_credential_id and kyc_qr_code_url
-- 3. User scans QR code with Sporran wallet
-- 4. KILT attestation webhook updates verification status
-- 5. kyc_wallet_did, kyc_verified_at, kyc_expires_at are set
--
-- Contract Signing Integration:
-- - KYC verification is OPTIONAL by default (can be enabled per property)
-- - If require_kyc_for_contracts = true, both parties need verified KYC
-- - Signature methods: 'mock' (testing), 'docuseal' (production e-signatures)
-- - kyc_enforced flag on contract_signatures tracks if KYC was used
--
-- Profiles Table (User Data):
-- - kyc_status: Current verification status
-- - kyc_credential_id: KILT credential identifier
-- - kyc_qr_code_url: Deep link for Sporran wallet
-- - kyc_wallet_did: User's KILT DID from wallet
-- - kyc_verified_at: Verification completion timestamp
-- - kyc_expires_at: Expiration timestamp
-- - require_kyc_for_contracts: Per-user KYC requirement setting
--
-- Contract Signatures Table:
-- - tenancy_id: Links to property_tenants
-- - signing_method: 'mock' or 'docuseal'
-- - workflow_status: 'pending', 'awaiting_signatures', 'completed', 'cancelled'
-- - kyc_enforced: Boolean flag if KYC was required/verified
-- - manager_signed_at, tenant_signed_at: Signature timestamps
-- - docuseal_* columns: DocuSeal integration fields
--
-- Edge Functions:
-- - initiate-kilt-kyc: Start KYC verification process
-- - verify-kilt-attestation: Webhook for KILT verification updates
-- - initiate-contract-signature: Mock signature workflow
-- - initiate-docuseal-signature: DocuSeal signature workflow
--
-- =====================================================