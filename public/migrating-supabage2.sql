-- =====================================================
-- COMPLETE SUPABASE SCHEMA MIGRATION
-- Using explicit ENUM types (USER-DEFINED from CSV)
-- Nullable constraints match source CSV
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES (USER-DEFINED from CSV)
-- =====================================================

-- Inspection related enums
CREATE TYPE inspection_type AS ENUM ('move_in', 'move_out', 'quarterly', 'annual', 'maintenance');
CREATE TYPE inspection_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE item_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged', 'missing');

-- Ticket related enums
CREATE TYPE ticket_type AS ENUM ('maintenance', 'repair', 'inspection', 'other');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Subscription enums
CREATE TYPE subscription_type AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired');
CREATE TYPE plan_status AS ENUM ('active', 'archived', 'draft');

-- Other enums
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
CREATE TYPE property_status AS ENUM ('active', 'inactive', 'maintenance', 'deleted');
CREATE TYPE property_delete_reason AS ENUM ('sold', 'transferred', 'inactive', 'other');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'tenant', 'viewer');

-- =====================================================
-- TABLE: analytics_events
-- =====================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_metadata JSONB,
    page_path TEXT,
    timestamp TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: analytics_navigation_paths
-- =====================================================
CREATE TABLE analytics_navigation_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID,
    from_path TEXT,
    to_path TEXT NOT NULL,
    breadcrumb_trail JSONB,
    timestamp TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: analytics_page_views
-- =====================================================
CREATE TABLE analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    device_type TEXT,
    timestamp TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: analytics_sessions
-- =====================================================
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_views_count INTEGER,
    events_count INTEGER,
    is_authenticated BOOLEAN,
    user_role TEXT,
    subscription_tier TEXT,
    created_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: brand_settings
-- =====================================================
CREATE TABLE brand_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    updated_at TIMESTAMPTZ,
    updated_by UUID,
    custom_domain TEXT,
    header_background_color TEXT NOT NULL,
    header_background_opacity INTEGER NOT NULL,
    carousel_items JSONB
);

-- =====================================================
-- TABLE: contract_signatures
-- =====================================================
CREATE TABLE contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL,
    property_id UUID NOT NULL,
    workflow_id TEXT,
    workflow_status TEXT NOT NULL,
    manager_signed_at TIMESTAMPTZ,
    manager_signature_method TEXT,
    manager_signature_ip TEXT,
    tenant_signed_at TIMESTAMPTZ,
    tenant_signature_method TEXT,
    tenant_signature_ip TEXT,
    signed_document_url TEXT,
    initiated_by UUID NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    signing_method_provider TEXT,
    contract_document_hash TEXT,
    contract_pdf_url TEXT,
    docuseal_template_id TEXT,
    docuseal_submission_id TEXT,
    docuseal_audit_log_url TEXT,
    manager_signature_data JSONB,
    tenant_signature_data JSONB,
    kyc_enforced BOOLEAN,
    docuseal_submission_slug TEXT,
    docuseal_manager_document_url TEXT,
    docuseal_tenant_document_url TEXT,
    manager_embed_slug TEXT,
    tenant_embed_slug TEXT,
    qualified_signature_provider TEXT,
    qualified_signature_session_id TEXT,
    qualified_signature_callback_url TEXT,
    qualified_signature_metadata JSONB,
    source_document_id UUID,
    signature_method TEXT,
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER,
    tenant_signer_id TEXT
);

-- =====================================================
-- TABLE: cron_job_health
-- =====================================================
CREATE TABLE cron_job_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    last_error TEXT,
    run_count INTEGER NOT NULL,
    consecutive_failures INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: data_retention_audit
-- =====================================================
CREATE TABLE data_retention_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_at TIMESTAMPTZ NOT NULL,
    policy_type TEXT NOT NULL,
    affected_records INTEGER NOT NULL,
    anonymized_records INTEGER NOT NULL,
    deleted_records INTEGER NOT NULL,
    execution_details JSONB,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: enterprise_contact_requests
-- =====================================================
CREATE TABLE enterprise_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    message TEXT NOT NULL,
    properties_count INTEGER,
    status TEXT NOT NULL,
    contacted_by UUID,
    contacted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: grace_period_reminders_sent
-- =====================================================
CREATE TABLE grace_period_reminders_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_subscription_id UUID NOT NULL,
    reminder_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: import_logs
-- =====================================================
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL,
    import_type TEXT NOT NULL,
    file_name TEXT,
    file_size_bytes BIGINT,
    records_processed INTEGER,
    records_succeeded INTEGER,
    records_failed INTEGER,
    error_log JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: inspection_items
-- =====================================================
CREATE TABLE inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL,
    room_name TEXT NOT NULL,
    room_order INTEGER NOT NULL,
    condition item_condition,
    notes TEXT,
    photos TEXT[],
    videos TEXT[],
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: invitations
-- =====================================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL,
    email TEXT NOT NULL,
    property_id UUID NOT NULL,
    status invitation_status NOT NULL,
    invited_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    tenancy_requirements_id UUID,
    decline_reason TEXT,
    declined_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: invitations_safe
-- =====================================================
CREATE TABLE invitations_safe (
    id UUID,
    property_id UUID,
    email TEXT,
    status invitation_status,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    invited_user_id UUID
);

-- =====================================================
-- TABLE: language_settings
-- =====================================================
CREATE TABLE language_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code TEXT NOT NULL,
    is_enabled BOOLEAN,
    display_order INTEGER,
    updated_at TIMESTAMPTZ,
    updated_by UUID
);

-- =====================================================
-- TABLE: manager_stripe_accounts
-- =====================================================
CREATE TABLE manager_stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL,
    stripe_account_id TEXT NOT NULL,
    stripe_account_status TEXT NOT NULL,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: payment_disputes
-- =====================================================
CREATE TABLE payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rent_payment_id UUID NOT NULL,
    stripe_dispute_id TEXT NOT NULL,
    dispute_status TEXT NOT NULL,
    dispute_reason TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    evidence_due_by TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: payment_reminders
-- =====================================================
CREATE TABLE payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rent_payment_id UUID NOT NULL,
    reminder_type TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    email_to TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    email_status TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: privacy_requests
-- =====================================================
CREATE TABLE privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL,
    request_details TEXT,
    response_details TEXT,
    requested_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: profiles
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    manager_iban TEXT,
    sepa_creditor_identifier TEXT,
    legal_name TEXT,
    kyc_credential_id TEXT,
    kyc_qr_code_url TEXT,
    kyc_status TEXT,
    kyc_verified_at TIMESTAMPTZ,
    kyc_expires_at TIMESTAMPTZ,
    id_document_type TEXT,
    id_document_country TEXT,
    aml_status TEXT,
    kyc_wallet_did TEXT,
    default_rent_settings JSONB,
    deletion_requested_at TIMESTAMPTZ,
    deletion_scheduled_for TIMESTAMPTZ,
    kyc_provider TEXT,
    kyc_data JSONB,
    email_verified BOOLEAN,
    email_verification_token TEXT,
    email_verification_sent_at TIMESTAMPTZ,
    email_verification_expires_at TIMESTAMPTZ,
    avatar_url TEXT
);

-- =====================================================
-- TABLE: profiles_public
-- =====================================================
CREATE TABLE profiles_public (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    email_verified BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: properties
-- =====================================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    address TEXT,
    description TEXT,
    images TEXT[],
    status property_status NOT NULL,
    deleted_at TIMESTAMPTZ,
    delete_reason property_delete_reason,
    manager_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT
);

-- =====================================================
-- TABLE: property_documents
-- =====================================================
CREATE TABLE property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID,
    uploaded_by UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    version INTEGER NOT NULL,
    parent_document_id UUID,
    description TEXT,
    is_latest_version BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    document_title TEXT NOT NULL,
    document_category TEXT,
    tenancy_id UUID
);

-- =====================================================
-- TABLE: property_tenants
-- =====================================================
CREATE TABLE property_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    tenancy_status TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    notes TEXT,
    planned_ending_date DATE,
    videos TEXT[]
);

-- =====================================================
-- TABLE: qualified_signature_logs
-- =====================================================
CREATE TABLE qualified_signature_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_signature_id UUID,
    session_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    event_type TEXT NOT NULL,
    certificate_info JSONB,
    signature_data TEXT,
    error_message TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: qualified_signature_providers
-- =====================================================
CREATE TABLE qualified_signature_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    country_codes TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL,
    protocol_scheme TEXT NOT NULL,
    installation_url TEXT,
    config JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: recurring_schedules
-- =====================================================
CREATE TABLE recurring_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    property_id UUID NOT NULL,
    frequency TEXT NOT NULL,
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: rent_agreements
-- =====================================================
CREATE TABLE rent_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    tenancy_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    rent_amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    payment_day INTEGER NOT NULL,
    tenant_iban TEXT,
    mandate_id TEXT,
    mandate_status TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    mandate_pdf_url TEXT,
    mandate_signed_at TIMESTAMPTZ,
    security_deposit_cents BIGINT,
    deposit_return_days INTEGER,
    utilities_tenant_responsible TEXT,
    utilities_manager_responsible TEXT,
    auto_reminders_enabled BOOLEAN
);

-- =====================================================
-- TABLE: rent_payments
-- =====================================================
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rent_agreement_id UUID NOT NULL,
    property_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    payment_date DATE,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    payment_status TEXT NOT NULL,
    failure_reason TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    payment_due_date DATE,
    payment_received_date DATE,
    status TEXT,
    payment_method TEXT,
    notes TEXT,
    proof_of_payment_url TEXT,
    tenant_confirmed BOOLEAN,
    tenant_confirmed_at TIMESTAMPTZ,
    manager_reviewed BOOLEAN,
    manager_reviewed_at TIMESTAMPTZ,
    manager_reviewed_by UUID,
    proof_review_status TEXT,
    proof_review_notes TEXT
);

-- =====================================================
-- TABLE: repair_shops
-- =====================================================
CREATE TABLE repair_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    specializations TEXT[],
    license_number TEXT,
    is_active BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: signature_events
-- =====================================================
CREATE TABLE signature_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_signature_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: standard_maintenance_templates
-- =====================================================
CREATE TABLE standard_maintenance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type ticket_type NOT NULL,
    priority ticket_priority NOT NULL,
    suggested_frequency TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: stripe_webhook_events
-- =====================================================
CREATE TABLE stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: subscription_history
-- =====================================================
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    from_plan_id UUID,
    to_plan_id UUID NOT NULL,
    change_reason TEXT NOT NULL,
    changed_by UUID,
    metadata JSONB,
    changed_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: subscription_plans
-- =====================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    status plan_status NOT NULL,
    is_default BOOLEAN NOT NULL,
    is_available_for_signup BOOLEAN NOT NULL,
    price_monthly_cents INTEGER NOT NULL,
    price_annual_cents INTEGER NOT NULL,
    stripe_product_id TEXT,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    trial_days INTEGER NOT NULL,
    grace_period_days INTEGER NOT NULL,
    overage_price_per_signature_cents INTEGER NOT NULL,
    feature_limits JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    features_display JSONB,
    limitations_display JSONB,
    overage_price_per_government_id_cents INTEGER
);

-- =====================================================
-- TABLE: subscription_usage
-- =====================================================
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    year INTEGER NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL,
    signatures_used INTEGER NOT NULL,
    overage_signatures_used INTEGER NOT NULL,
    last_overage_billed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    government_id_verifications_used INTEGER NOT NULL,
    overage_government_id_used INTEGER NOT NULL,
    last_gov_id_overage_billed_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: system_settings
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: tenancy_inspections
-- =====================================================
CREATE TABLE tenancy_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL,
    property_id UUID NOT NULL,
    inspection_type inspection_type NOT NULL,
    status inspection_status NOT NULL,
    template_document_id UUID,
    inspection_date DATE NOT NULL,
    notes TEXT,
    overall_condition TEXT,
    manager_signed_at TIMESTAMPTZ,
    manager_signature_data JSONB,
    manager_id UUID,
    tenant_signed_at TIMESTAMPTZ,
    tenant_signature_data JSONB,
    tenant_id UUID,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: tenancy_requirements
-- =====================================================
CREATE TABLE tenancy_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    invitation_id UUID,
    tenancy_id UUID,
    created_by UUID NOT NULL,
    tenant_email TEXT NOT NULL,
    require_email_verification BOOLEAN,
    require_kyc_verification BOOLEAN,
    require_phone_verification BOOLEAN,
    contract_method TEXT,
    selected_template_id UUID,
    rent_amount_cents BIGINT,
    currency TEXT,
    security_deposit_cents BIGINT,
    payment_day INTEGER,
    start_date DATE,
    end_date DATE,
    utilities_config JSONB,
    questionnaire_enabled BOOLEAN,
    questionnaire_config JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: ticket_activities
-- =====================================================
CREATE TABLE ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: ticket_attachments
-- =====================================================
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    original_filename TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: ticket_comments
-- =====================================================
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: ticket_templates
-- =====================================================
CREATE TABLE ticket_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type ticket_type NOT NULL,
    priority ticket_priority NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    source_standard_template_id UUID
);

-- =====================================================
-- TABLE: tickets
-- =====================================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL,
    property_id UUID NOT NULL,
    created_by UUID NOT NULL,
    assigned_to UUID,
    type ticket_type NOT NULL,
    status ticket_status NOT NULL,
    priority ticket_priority NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    source_template_id UUID,
    scheduled_date DATE
);

-- =====================================================
-- TABLE: user_consents
-- =====================================================
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: user_preferences
-- =====================================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme_mode TEXT,
    font_size TEXT,
    date_format TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    language TEXT,
    week_start_day TEXT,
    cookie_consent_analytics BOOLEAN,
    cookie_consent_given_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: user_roles
-- =====================================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: user_subscriptions
-- =====================================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    subscription_type subscription_type NOT NULL,
    status subscription_status NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL,
    canceled_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    admin_granted_by UUID,
    admin_granted_at TIMESTAMPTZ,
    admin_granted_reason TEXT,
    admin_granted_duration_days INTEGER,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- TABLE: utility_payments
-- =====================================================
CREATE TABLE utility_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    utility_type TEXT NOT NULL,
    custom_utility_name TEXT,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    payment_due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT NOT NULL,
    proof_of_payment_url TEXT,
    proof_review_status TEXT,
    proof_review_notes TEXT,
    manager_reviewed_by UUID,
    manager_reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
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
-- TRIGGERS: Auto-update updated_at on tables that have updated_at
-- =====================================================

CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_signatures_updated_at BEFORE UPDATE ON contract_signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cron_job_health_updated_at BEFORE UPDATE ON cron_job_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_contact_requests_updated_at BEFORE UPDATE ON enterprise_contact_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_language_settings_updated_at BEFORE UPDATE ON language_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manager_stripe_accounts_updated_at BEFORE UPDATE ON manager_stripe_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_documents_updated_at BEFORE UPDATE ON property_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qualified_signature_providers_updated_at BEFORE UPDATE ON qualified_signature_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_schedules_updated_at BEFORE UPDATE ON recurring_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rent_agreements_updated_at BEFORE UPDATE ON rent_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON rent_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repair_shops_updated_at BEFORE UPDATE ON repair_shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_standard_maintenance_templates_updated_at BEFORE UPDATE ON standard_maintenance_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_inspections_updated_at BEFORE UPDATE ON tenancy_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_requirements_updated_at BEFORE UPDATE ON tenancy_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_comments_updated_at BEFORE UPDATE ON ticket_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_templates_updated_at BEFORE UPDATE ON ticket_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_utility_payments_updated_at BEFORE UPDATE ON utility_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (Enable RLS on all tables)
-- =====================================================

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

-- Basic RLS policy examples
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_properties_manager_id ON properties(manager_id);
CREATE INDEX idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX idx_property_tenants_tenant_id ON property_tenants(tenant_id);
CREATE INDEX idx_rent_payments_property_id ON rent_payments(property_id);
CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_rent_agreement_id ON rent_payments(rent_agreement_id);
CREATE INDEX idx_tickets_property_id ON tickets(property_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_contract_signatures_tenancy_id ON contract_signatures(tenancy_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);