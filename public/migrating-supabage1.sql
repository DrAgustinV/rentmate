-- =====================================================
-- COMPLETE SUPABASE SCHEMA MIGRATION
-- All 48 tables from JSON export
-- Using inline foreign keys, RLS enabled, updated_at triggers
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE inspection_type AS ENUM ('move_in', 'move_out', 'quarterly', 'annual', 'maintenance');
CREATE TYPE inspection_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE item_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged', 'missing');
CREATE TYPE ticket_type AS ENUM ('maintenance', 'repair', 'inspection', 'other');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE subscription_type AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired');
CREATE TYPE plan_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
CREATE TYPE property_status AS ENUM ('active', 'inactive', 'maintenance', 'deleted');
CREATE TYPE property_delete_reason AS ENUM ('sold', 'transferred', 'inactive', 'other');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'tenant', 'viewer');

-- =====================================================
-- TABLE 1: profiles (links to auth.users)
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    manager_iban TEXT,
    sepa_creditor_identifier TEXT,
    legal_name TEXT,
    kyc_credential_id TEXT,
    kyc_qr_code_url TEXT,
    kyc_status TEXT DEFAULT 'not_started',
    kyc_verified_at TIMESTAMPTZ,
    kyc_expires_at TIMESTAMPTZ,
    kyc_data JSONB,
    kyc_provider TEXT DEFAULT 'kilt',
    id_document_type TEXT,
    id_document_country TEXT,
    aml_status TEXT DEFAULT 'not_checked',
    kyc_wallet_did TEXT,
    default_rent_settings JSONB DEFAULT '{"require_kyc": false, "custom_bills": [], "require_water_bill": false, "default_deposit_amount": 0, "require_electricity_bill": false, "require_payment_confirmation": true}'::jsonb,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token TEXT,
    email_verification_sent_at TIMESTAMPTZ,
    email_verification_expires_at TIMESTAMPTZ,
    deletion_requested_at TIMESTAMPTZ,
    deletion_scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 2: profiles_public (view pattern - limited columns)
-- =====================================================
CREATE TABLE profiles_public (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE 3: user_roles
-- =====================================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- =====================================================
-- TABLE 4: properties
-- =====================================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    address TEXT,
    description TEXT,
    images TEXT[],
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Germany',
    status property_status NOT NULL DEFAULT 'active',
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ,
    delete_reason property_delete_reason,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 5: property_tenants
-- =====================================================
CREATE TABLE property_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenancy_status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    planned_ending_date DATE,
    end_reason TEXT,
    notes TEXT,
    videos TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(property_id, tenant_id, started_at)
);

-- =====================================================
-- TABLE 6: rent_agreements
-- =====================================================
CREATE TABLE rent_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenancy_id UUID NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rent_amount_cents BIGINT NOT NULL,
    payment_day INTEGER NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    currency TEXT DEFAULT 'eur',
    tenant_iban TEXT,
    mandate_id TEXT,
    mandate_status TEXT NOT NULL DEFAULT 'pending',
    mandate_pdf_url TEXT,
    mandate_signed_at TIMESTAMPTZ,
    security_deposit_cents BIGINT,
    deposit_return_days INTEGER DEFAULT 30,
    auto_reminders_enabled BOOLEAN DEFAULT true,
    utilities_tenant_responsible TEXT,
    utilities_manager_responsible TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 7: rent_payments
-- =====================================================
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rent_agreement_id UUID NOT NULL REFERENCES rent_agreements(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    payment_date DATE,
    processed_at TIMESTAMPTZ,
    payment_due_date DATE,
    payment_received_date DATE,
    tenant_confirmed BOOLEAN DEFAULT false,
    tenant_confirmed_at TIMESTAMPTZ,
    manager_reviewed BOOLEAN DEFAULT false,
    manager_reviewed_at TIMESTAMPTZ,
    manager_reviewed_by UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'sepa_direct_debit',
    currency TEXT NOT NULL DEFAULT 'eur',
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    failure_reason TEXT,
    notes TEXT,
    proof_of_payment_url TEXT,
    proof_review_status TEXT DEFAULT 'pending',
    proof_review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 8: utility_payments
-- =====================================================
CREATE TABLE utility_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    payment_due_date DATE NOT NULL,
    payment_date DATE,
    utility_type TEXT NOT NULL,
    custom_utility_name TEXT,
    manager_reviewed_by UUID REFERENCES profiles(id),
    manager_reviewed_at TIMESTAMPTZ,
    proof_review_status TEXT DEFAULT 'pending',
    proof_review_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    proof_of_payment_url TEXT,
    notes TEXT,
    currency TEXT NOT NULL DEFAULT 'eur',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 9: payment_disputes
-- =====================================================
CREATE TABLE payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rent_payment_id UUID NOT NULL REFERENCES rent_payments(id) ON DELETE CASCADE,
    stripe_dispute_id TEXT NOT NULL UNIQUE,
    dispute_status TEXT NOT NULL DEFAULT 'needs_response',
    dispute_reason TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    evidence_due_by TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 10: payment_reminders
-- =====================================================
CREATE TABLE payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rent_payment_id UUID NOT NULL REFERENCES rent_payments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    email_to TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email_status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 11: contract_signatures
-- =====================================================
CREATE TABLE contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    manager_signed_at TIMESTAMPTZ,
    tenant_signed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    workflow_id TEXT,
    workflow_status TEXT NOT NULL DEFAULT 'pending',
    manager_signature_method TEXT,
    manager_signature_ip TEXT,
    manager_signature_data JSONB,
    tenant_signature_method TEXT,
    tenant_signature_ip TEXT,
    tenant_signature_data JSONB,
    tenant_signer_id TEXT,
    signature_method TEXT DEFAULT 'SAS',
    signing_method_provider TEXT DEFAULT 'mock',
    contract_document_hash TEXT,
    contract_pdf_url TEXT,
    signed_document_url TEXT,
    docuseal_template_id TEXT,
    docuseal_submission_id TEXT,
    docuseal_submission_slug TEXT,
    docuseal_audit_log_url TEXT,
    docuseal_manager_document_url TEXT,
    docuseal_tenant_document_url TEXT,
    manager_embed_slug TEXT,
    tenant_embed_slug TEXT,
    qualified_signature_provider TEXT,
    qualified_signature_session_id TEXT,
    qualified_signature_callback_url TEXT,
    qualified_signature_metadata JSONB,
    source_document_id UUID,
    kyc_enforced BOOLEAN DEFAULT false,
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 12: qualified_signature_providers
-- =====================================================
CREATE TABLE qualified_signature_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code TEXT NOT NULL UNIQUE,
    provider_name TEXT NOT NULL,
    country_codes TEXT[] NOT NULL,
    protocol_scheme TEXT NOT NULL,
    installation_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 13: qualified_signature_logs
-- =====================================================
CREATE TABLE qualified_signature_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_signature_id UUID REFERENCES contract_signatures(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    session_id TEXT NOT NULL,
    certificate_info JSONB,
    signature_data TEXT,
    user_agent TEXT,
    ip_address TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 14: signature_events
-- =====================================================
CREATE TABLE signature_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_signature_id UUID NOT NULL REFERENCES contract_signatures(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 15: tenancy_inspections
-- =====================================================
CREATE TABLE tenancy_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    inspection_type inspection_type NOT NULL,
    status inspection_status NOT NULL DEFAULT 'draft',
    template_document_id UUID,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    manager_signed_at TIMESTAMPTZ,
    manager_signature_data JSONB,
    manager_id UUID REFERENCES profiles(id),
    tenant_signed_at TIMESTAMPTZ,
    tenant_signature_data JSONB,
    tenant_id UUID REFERENCES profiles(id),
    pdf_generated_at TIMESTAMPTZ,
    notes TEXT,
    overall_condition TEXT,
    pdf_url TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 16: inspection_items
-- =====================================================
CREATE TABLE inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES tenancy_inspections(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    room_order INTEGER NOT NULL DEFAULT 0,
    condition item_condition,
    notes TEXT,
    photos TEXT[],
    videos TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 17: tickets
-- =====================================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL DEFAULT '',
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id),
    type ticket_type NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    source_template_id UUID,
    scheduled_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 18: ticket_comments
-- =====================================================
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 19: ticket_attachments
-- =====================================================
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 20: ticket_activities
-- =====================================================
CREATE TABLE ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 21: ticket_templates
-- =====================================================
CREATE TABLE ticket_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type ticket_type NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    source_standard_template_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 22: standard_maintenance_templates
-- =====================================================
CREATE TABLE standard_maintenance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type ticket_type NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    suggested_frequency TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 23: recurring_schedules
-- =====================================================
CREATE TABLE recurring_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL,
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 24: repair_shops
-- =====================================================
CREATE TABLE repair_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    specializations TEXT[],
    license_number TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 25: tenancy_requirements
-- =====================================================
CREATE TABLE tenancy_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    invitation_id UUID,
    tenancy_id UUID REFERENCES property_tenants(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_email TEXT NOT NULL,
    contract_method TEXT,
    require_email_verification BOOLEAN DEFAULT true,
    require_kyc_verification BOOLEAN DEFAULT false,
    require_phone_verification BOOLEAN DEFAULT false,
    selected_template_id UUID,
    rent_amount_cents BIGINT,
    security_deposit_cents BIGINT,
    payment_day INTEGER,
    start_date DATE,
    end_date DATE,
    currency TEXT DEFAULT 'EUR',
    utilities_config JSONB DEFAULT '{}'::jsonb,
    questionnaire_enabled BOOLEAN DEFAULT false,
    questionnaire_config JSONB,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 26: invitations
-- =====================================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_user_id UUID REFERENCES profiles(id),
    tenancy_requirements_id UUID REFERENCES tenancy_requirements(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 27: invitations_safe (backup/historical)
-- =====================================================
CREATE TABLE invitations_safe (
    id UUID,
    property_id UUID,
    email TEXT,
    status invitation_status,
    invited_user_id UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE 28: property_documents
-- =====================================================
CREATE TABLE property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    tenancy_id UUID REFERENCES property_tenants(id) ON DELETE CASCADE,
    document_title TEXT NOT NULL DEFAULT 'Untitled Document',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description TEXT,
    document_category TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    parent_document_id UUID REFERENCES property_documents(id),
    is_latest_version BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 29: user_subscriptions
-- =====================================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,
    subscription_type subscription_type NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    admin_granted_by UUID REFERENCES profiles(id),
    admin_granted_at TIMESTAMPTZ,
    admin_granted_duration_days INTEGER,
    admin_granted_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 30: subscription_plans
-- =====================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status plan_status NOT NULL DEFAULT 'active',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_available_for_signup BOOLEAN NOT NULL DEFAULT true,
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    price_annual_cents INTEGER NOT NULL DEFAULT 0,
    trial_days INTEGER NOT NULL DEFAULT 0,
    grace_period_days INTEGER NOT NULL DEFAULT 14,
    overage_price_per_signature_cents INTEGER NOT NULL DEFAULT 200,
    overage_price_per_government_id_cents INTEGER DEFAULT 100,
    feature_limits JSONB NOT NULL DEFAULT '{"api_access_enabled": false, "stripe_connect_enabled": false, "white_labeling_enabled": false, "recurring_tasks_enabled": false, "kyc_verification_enabled": false, "revolut_payments_enabled": false, "sepa_direct_debit_enabled": false, "advanced_analytics_enabled": false, "automated_payments_enabled": false, "document_templates_enabled": false, "brand_customization_enabled": false, "digital_signatures_per_year": 0, "maintenance_templates_enabled": false, "repair_shop_directory_enabled": false}'::jsonb,
    features_display JSONB DEFAULT '{}'::jsonb,
    limitations_display JSONB DEFAULT '{}'::jsonb,
    stripe_product_id TEXT,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 31: subscription_history
-- =====================================================
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    to_plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES profiles(id),
    change_reason TEXT NOT NULL,
    metadata JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 32: subscription_usage
-- =====================================================
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL,
    signatures_used INTEGER NOT NULL DEFAULT 0,
    overage_signatures_used INTEGER NOT NULL DEFAULT 0,
    last_overage_billed_at TIMESTAMPTZ,
    government_id_verifications_used INTEGER NOT NULL DEFAULT 0,
    overage_government_id_used INTEGER NOT NULL DEFAULT 0,
    last_gov_id_overage_billed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, year)
);

-- =====================================================
-- TABLE 33: grace_period_reminders_sent
-- =====================================================
CREATE TABLE grace_period_reminders_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    reminder_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_subscription_id, reminder_day)
);

-- =====================================================
-- TABLE 34: manager_stripe_accounts
-- =====================================================
CREATE TABLE manager_stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    stripe_account_status TEXT NOT NULL DEFAULT 'pending',
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 35: stripe_webhook_events
-- =====================================================
CREATE TABLE stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 36: brand_settings
-- =====================================================
CREATE TABLE brand_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL DEFAULT 'RentMate',
    logo_url TEXT,
    custom_domain TEXT,
    primary_color TEXT NOT NULL DEFAULT '221 83% 53%',
    accent_color TEXT NOT NULL DEFAULT '199 89% 48%',
    header_background_color TEXT NOT NULL DEFAULT '173 77% 40%',
    header_background_opacity INTEGER NOT NULL DEFAULT 100,
    carousel_items JSONB DEFAULT '[{"title": {"en": "Automated Rent Collection", "es": "Cobro Automático de Alquiler"}, "image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop", "description": {"en": "Collect rent automatically via SEPA Direct Debit", "es": "Cobra el alquiler automáticamente mediante SEPA Direct Debit"}}, {"title": {"en": "Digital Contracts", "es": "Contratos Digitales"}, "image_url": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop", "description": {"en": "Sign contracts digitally with legal validity", "es": "Firma contratos digitalmente con validez legal"}}, {"title": {"en": "Smart Maintenance", "es": "Mantenimiento Inteligente"}, "image_url": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop", "description": {"en": "Track and schedule property maintenance tasks", "es": "Gestiona y programa tareas de mantenimiento"}}, {"title": {"en": "Verified Tenants", "es": "Inquilinos Verificados"}, "image_url": "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop", "description": {"en": "KYC verification for trusted tenancies", "es": "Verificación KYC para arrendamientos de confianza"}}]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- TABLE 37: language_settings
-- =====================================================
CREATE TABLE language_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT true,
    display_order INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- TABLE 38: system_settings
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 39: user_preferences
-- =====================================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    theme_mode TEXT DEFAULT 'system',
    font_size TEXT DEFAULT 'md',
    language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'PPP',
    week_start_day TEXT DEFAULT 'monday',
    cookie_consent_analytics BOOLEAN DEFAULT false,
    cookie_consent_given_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 40: user_consents
-- =====================================================
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, consent_type)
);

-- =====================================================
-- TABLE 41: privacy_requests
-- =====================================================
CREATE TABLE privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    request_details TEXT,
    response_details TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 42: enterprise_contact_requests
-- =====================================================
CREATE TABLE enterprise_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    properties_count INTEGER,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    user_id UUID REFERENCES profiles(id),
    contacted_by UUID REFERENCES profiles(id),
    contacted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 43: data_retention_audit
-- =====================================================
CREATE TABLE data_retention_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    affected_records INTEGER NOT NULL DEFAULT 0,
    anonymized_records INTEGER NOT NULL DEFAULT 0,
    deleted_records INTEGER NOT NULL DEFAULT 0,
    execution_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 44: cron_job_health
-- =====================================================
CREATE TABLE cron_job_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL UNIQUE,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 45: import_logs
-- =====================================================
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL,
    file_name TEXT,
    file_size_bytes BIGINT,
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_log JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE 46: analytics_sessions
-- =====================================================
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_role TEXT,
    subscription_tier TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_views_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    is_authenticated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 47: analytics_page_views
-- =====================================================
CREATE TABLE analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    device_type TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 48: analytics_events
-- =====================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_metadata JSONB,
    page_path TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE 49: analytics_navigation_paths
-- =====================================================
CREATE TABLE analytics_navigation_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    from_path TEXT,
    to_path TEXT NOT NULL,
    breadcrumb_trail JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS: Auto-update updated_at on key tables
-- =====================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rent_agreements_updated_at BEFORE UPDATE ON rent_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON rent_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_utility_payments_updated_at BEFORE UPDATE ON utility_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_signatures_updated_at BEFORE UPDATE ON contract_signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qualified_signature_providers_updated_at BEFORE UPDATE ON qualified_signature_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_inspections_updated_at BEFORE UPDATE ON tenancy_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_comments_updated_at BEFORE UPDATE ON ticket_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_templates_updated_at BEFORE UPDATE ON ticket_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_standard_maintenance_templates_updated_at BEFORE UPDATE ON standard_maintenance_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_schedules_updated_at BEFORE UPDATE ON recurring_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repair_shops_updated_at BEFORE UPDATE ON repair_shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_requirements_updated_at BEFORE UPDATE ON tenancy_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_documents_updated_at BEFORE UPDATE ON property_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manager_stripe_accounts_updated_at BEFORE UPDATE ON manager_stripe_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_language_settings_updated_at BEFORE UPDATE ON language_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_contact_requests_updated_at BEFORE UPDATE ON enterprise_contact_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cron_job_health_updated_at BEFORE UPDATE ON cron_job_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (Enable on all tables)
-- =====================================================

-- Enable RLS on all tables
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- Basic RLS policy examples (customize as needed)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can view own properties" ON properties FOR SELECT USING (auth.uid() = manager_id);
CREATE POLICY "Managers can insert own properties" ON properties FOR INSERT WITH CHECK (auth.uid() = manager_id);
CREATE POLICY "Managers can update own properties" ON properties FOR UPDATE USING (auth.uid() = manager_id);

-- =====================================================
-- INDEXES for performance
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_kyc_status ON profiles(kyc_status);

-- Properties indexes
CREATE INDEX idx_properties_manager_id ON properties(manager_id);
CREATE INDEX idx_properties_status ON properties(status);

-- Property tenants indexes
CREATE INDEX idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX idx_property_tenants_tenant_id ON property_tenants(tenant_id);
CREATE INDEX idx_property_tenants_tenancy_status ON property_tenants(tenancy_status);

-- Rent payments indexes
CREATE INDEX idx_rent_payments_property_id ON rent_payments(property_id);
CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_rent_agreement_id ON rent_payments(rent_agreement_id);
CREATE INDEX idx_rent_payments_payment_due_date ON rent_payments(payment_due_date);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);

-- Tickets indexes
CREATE INDEX idx_tickets_property_id ON tickets(property_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);

-- Ticket comments indexes
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);

-- Contract signatures indexes
CREATE INDEX idx_contract_signatures_tenancy_id ON contract_signatures(tenancy_id);
CREATE INDEX idx_contract_signatures_property_id ON contract_signatures(property_id);
CREATE INDEX idx_contract_signatures_workflow_status ON contract_signatures(workflow_status);

-- User subscriptions indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);

-- Analytics indexes
CREATE INDEX idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX idx_analytics_page_views_timestamp ON analytics_page_views(timestamp);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);