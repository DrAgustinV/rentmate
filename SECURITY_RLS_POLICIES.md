# RLS Security Policies Documentation

## Overview
This document describes the Row-Level Security (RLS) policies implemented across all database tables. The system uses a role-based access control model with three primary roles: **Admin**, **Manager**, and **Tenant**.

---

## Role Definitions

### Admin
- **Full system access**: Can view and manage all data across all tables
- **System administration**: Can modify system settings, view analytics
- **User management**: Can assign roles to users

### Manager (Property Owner/Landlord)
- **Property management**: Can create, view, update, and delete their own properties
- **Tenant management**: Can invite tenants, view tenant profiles for their properties
- **Maintenance**: Can create and manage maintenance tasks and tickets for their properties
- **Financial**: Can create rent agreements and view payment history for their properties
- **Contractors**: Can manage their own repair shop directory entries

### Tenant (Property Renter)
- **Profile access**: Can view and update their own profile
- **Property view**: Can view properties they are assigned to
- **Tickets**: Can create and view tickets for their assigned properties
- **Payments**: Can view their own rent payments and agreements
- **Documents**: Can view and upload documents for their active tenancy

### Unauthenticated (Public)
- **Invitations**: Can view invitation details only with a valid, unexpired token
- **Analytics**: Can submit page views, events, and navigation data (with validation)
- **No PII access**: Cannot view any user data, properties, or other sensitive information

---

## Table-by-Table Policy Breakdown

### `profiles`
**Contains**: User personal information (email, name, phone, IBAN, KYC status)

**SELECT Policies**:
- ✅ Users can view own profile (`auth.uid() = id`)
- ✅ Managers can view their tenants' profiles
- ✅ Tenants can view their managers' SEPA details (for payment setup)
- ✅ Admins can view all profiles

**UPDATE Policies**:
- ✅ Users can update own profile (`auth.uid() = id`)
- ✅ Admins can update any profile

**Security Notes**:
- Phone numbers and IBANs are sensitive - access strictly controlled
- KYC status visible to property managers for contract signing requirements
- No public access - all operations require authentication

---

### `properties`
**Contains**: Property listings (address, description, status, manager)

**SELECT Policies**:
- ✅ Managers can view their own properties (`manager_id = auth.uid()`)
- ✅ Tenants can view assigned properties (via `property_tenants` join)
- ✅ Admins can view all properties

**INSERT Policies**:
- ✅ Users can create properties (become managers: `manager_id = auth.uid()`)

**UPDATE Policies**:
- ✅ Managers can update their active properties
- ✅ Admins can update any property

**DELETE Policies**:
- ✅ Managers can delete their own properties
- ✅ Admins can delete any property

**Security Notes**:
- Property addresses are visible only to managers and assigned tenants
- Status field prevents modification of archived properties

---

### `property_tenants`
**Contains**: Tenancy relationships linking tenants to properties

**SELECT Policies**:
- ✅ Managers can view tenancies for their properties
- ✅ Tenants can view their own tenancy (`tenant_id = auth.uid()`)
- ✅ Admins can view all tenancies

**INSERT Policies**:
- ✅ Managers can create tenancies for their properties
- ✅ Invited users can create their own tenancy (with valid invitation)

**UPDATE Policies**:
- ✅ Managers can update tenancies for their properties
- ✅ Admins can update any tenancy

**DELETE Policies**:
- ✅ Managers can delete tenancies for their properties
- ✅ Admins can delete any tenancy

**Security Notes**:
- Tenancy creation requires valid invitation or manager ownership
- `tenancy_status` tracks active, ending, and historic tenancies

---

### `invitations`
**Contains**: Tenant invitation tokens (email, token, property, expiration)

**SELECT Policies**:
- ✅ Public can view invitation by exact valid token (pending & unexpired only)
- ✅ Users can view invitations sent to their email
- ✅ Managers can view invitations for their properties
- ✅ Admins can view all invitations

**INSERT Policies**:
- ✅ Managers can create invitations for their active properties
- ✅ Admins can create invitations

**UPDATE Policies**:
- ✅ Users can update invitations sent to their email (accept/decline)
- ✅ Managers can update invitations for their properties
- ✅ Admins can update any invitation

**Security Notes**:
- **Critical Fix**: Public access now restricted to valid tokens only (pending + unexpired)
- Email addresses no longer exposed to public internet
- Token must be provided explicitly to view invitation

---

### `tickets`
**Contains**: Maintenance and support tickets

**SELECT Policies**:
- ✅ Creators can view their own tickets (`created_by = auth.uid()`)
- ✅ Managers can view tickets for their properties
- ✅ Tenants can view tickets for their assigned properties
- ✅ Admins can view all tickets

**INSERT Policies**:
- ✅ Tenants can create tickets for their assigned active properties
- ✅ Managers can create tickets for their properties
- ✅ Admins can create tickets

**UPDATE Policies**:
- ✅ Managers can update tickets for their properties (status, assignment)
- ✅ Tenants can update tickets for their properties (comments, attachments)
- ✅ Admins can update any ticket

**Security Notes**:
- Ticket attachments stored in separate secured storage buckets
- Comments tracked separately with audit trail

---

### `rent_agreements`
**Contains**: Rent payment agreements (amount, IBAN, mandate status)

**SELECT Policies**:
- ✅ Managers can view agreements for their properties
- ✅ Tenants can view their own agreements (`tenant_id = auth.uid()`)
- ✅ Admins can view all agreements

**INSERT Policies**:
- ✅ Managers can create agreements for their properties (must be property owner)

**UPDATE Policies**:
- ✅ Managers can update agreements for their properties
- ✅ Tenants can update their own agreements (e.g., sign mandate, update IBAN)
- ✅ Admins can update any agreement

**Security Notes**:
- **Highly sensitive**: Contains tenant IBAN numbers
- Tenant can sign SEPA mandate and provide IBAN
- Manager cannot directly modify tenant IBAN

---

### `rent_payments`
**Contains**: Individual rent payment records (status, dates, Stripe IDs)

**SELECT Policies**:
- ✅ Managers can view payments for their properties (multiple policies for clarity)
- ✅ Tenants can view their own payments (`tenant_id = auth.uid()`)
- ✅ Admins can view all payments

**INSERT Policies**:
- ✅ System (admin) can insert payments (auto-generated monthly)

**UPDATE Policies**:
- ✅ System (admin) can update payment status (Stripe webhooks)
- ✅ Managers can manage payments for their properties

**Security Notes**:
- Payment records created automatically via edge function
- Stripe payment intent IDs stored for reconciliation
- Only system can insert to prevent manual manipulation

---

### `contract_signatures`
**Contains**: Contract signature workflows (DocuSeal, Mock)

**SELECT Policies**:
- ✅ Managers can view signatures for their properties
- ✅ Tenants can view their own signatures (via tenancy join)
- ✅ Admins can view all signatures

**INSERT Policies**:
- ✅ Managers can initiate signatures for their properties

**UPDATE Policies**:
- ✅ System can update signatures (managers, tenants, admins)

**Security Notes**:
- IP addresses stored for audit purposes
- DocuSeal integration provides tamper-proof audit logs
- KYC enforcement optional via `kyc_enforced` flag

---

### `analytics_page_views`, `analytics_events`, `analytics_navigation_paths`
**Contains**: User behavior tracking data (page views, events, navigation)

**SELECT Policies**:
- ✅ Only admins can view analytics data

**INSERT Policies**:
- ✅ Public can insert with validation (session ID > 10 chars, required fields)

**UPDATE Policies**:
- ✅ System can update page views for geolocation enrichment

**Security Notes**:
- **Security Fix**: INSERT now validates session ID length to prevent spam
- IP addresses stored but only visible to admins
- Unauthenticated tracking allowed for public analytics

---

### `repair_shops`
**Contains**: Contractor/repair shop directory

**SELECT Policies**:
- ✅ Managers can view their own repair shops (`manager_id = auth.uid()`)
- ✅ Admins can view all repair shops

**INSERT Policies**:
- ✅ Managers can create repair shop entries

**UPDATE Policies**:
- ✅ Managers can update their own entries
- ✅ Admins can update any entry

**DELETE Policies**:
- ✅ Managers can delete their own entries

**Security Notes**:
- Contact information (email, phone) only visible to creator and admins
- Future: May expand to allow property-specific contractor sharing

---

## Security Functions

### `has_role(_user_id, _role)`
**Purpose**: Check if a user has a specific role (admin, moderator, user)

**Security**: `SECURITY DEFINER` - bypasses RLS to prevent infinite recursion

**Usage**: Used in RLS policies to check admin status

```sql
has_role(auth.uid(), 'admin'::app_role)
```

---

### `is_property_manager(_user_id, _property_id)`
**Purpose**: Check if a user is the manager/owner of a property

**Security**: `SECURITY DEFINER` - secure function for RLS

**Usage**: Core function for property-based access control

```sql
is_property_manager(auth.uid(), property_id)
```

---

### `is_property_tenant(_user_id, _property_id)`
**Purpose**: Check if a user is an active tenant of a property

**Security**: `SECURITY DEFINER` - secure function for RLS

**Usage**: Validates tenant access to property resources

```sql
is_property_tenant(auth.uid(), property_id)
```

---

## Testing Checklist

### As ADMIN
- [x] Can view all profiles, properties, tickets
- [x] Can view all rent agreements and payments
- [x] Can view all analytics data
- [x] Can manage system settings
- [x] Can assign roles to users

### As MANAGER
- [x] Can create/view/update own properties
- [x] Can invite tenants to own properties
- [x] Can view own tenants' profiles (not others)
- [x] Can create/view tickets for own properties
- [x] Can create/view/update rent agreements for own properties
- [x] Can view rent payments for own properties
- [x] Can create/view/update repair shops they created
- [x] **Cannot** view other managers' data
- [x] **Cannot** view admin analytics
- [x] **Cannot** modify system settings

### As TENANT
- [x] Can view own profile and update it
- [x] Can view assigned properties (not others)
- [x] Can view own tenancy details
- [x] Can create/view tickets for assigned properties
- [x] Can view/update own rent agreements (provide IBAN)
- [x] Can view own rent payments
- [x] Can upload documents for active tenancy
- [x] **Cannot** view other tenants' data
- [x] **Cannot** view full manager SEPA details
- [x] **Cannot** manage properties

### As UNAUTHENTICATED (Public)
- [x] Can view invitation by exact valid token only
- [x] Can insert analytics (with validation)
- [x] **Cannot** view any user data
- [x] **Cannot** view properties
- [x] **Cannot** view tickets
- [x] **Cannot** enumerate invitations

---

## Security Improvements Applied (Phase 5)

### Critical Fixes

1. **Invitations Table** (Error → Fixed)
   - **Before**: Anyone could view all invitations and harvest emails
   - **After**: Public can only view specific invitation with valid, unexpired token
   - **Impact**: Prevents email harvesting and phishing attacks

2. **Profiles Table** (Error → Fixed)
   - **Before**: No explicit SELECT policy for users viewing own data
   - **After**: Added explicit policies for viewing and updating own profile
   - **Impact**: Ensures users can always access their own data

3. **Analytics Tables** (Warning → Fixed)
   - **Before**: Anyone could spam unlimited analytics data
   - **After**: INSERT policies now validate session ID length and required fields
   - **Impact**: Prevents analytics poisoning and DOS attacks

### Remaining Supabase Warnings (Non-Critical)

1. **Function Search Path Mutable**: Some functions don't set search_path explicitly
   - **Risk**: Low - functions use qualified names
   - **Remediation**: Can be addressed in future optimization

2. **Extension in Public**: Extensions installed in public schema
   - **Risk**: Low - standard Supabase setup
   - **Remediation**: Not actionable without Supabase migration

3. **Leaked Password Protection**: Disabled by default
   - **Risk**: Medium - users can use compromised passwords
   - **Remediation**: Should be enabled in Supabase Auth settings

---

## Future Enhancements

1. **Multi-factor Authentication**: Add MFA requirement for financial operations
2. **Audit Logging**: Expand `signature_events` pattern to all sensitive tables
3. **Rate Limiting**: Implement rate limits on invitation creation
4. **Data Retention**: Add policies for automatic PII deletion after tenancy ends
5. **Encryption**: Consider column-level encryption for IBAN fields

---

## KILT KYC Integration

The system uses KILT Protocol for optional blockchain-based identity verification.

### KYC Workflow
1. User initiates KYC via edge function: `initiate-kilt-kyc`
2. System stores `kyc_credential_id` and `kyc_qr_code_url` in `profiles`
3. User scans QR code with Sporran wallet
4. KILT attestation webhook updates verification status
5. `kyc_wallet_did`, `kyc_verified_at`, `kyc_expires_at` are set

### Contract Signing Integration
- KYC verification is **OPTIONAL** by default (can be enabled per property)
- If `require_kyc_for_contracts = true`, both parties need verified KYC
- Signature methods: `mock` (testing), `docuseal` (production e-signatures)
- `kyc_enforced` flag on `contract_signatures` tracks if KYC was used

---

## Edge Functions Security

All edge functions follow security best practices:

### Authentication
- JWT verification configured in `supabase/config.toml`
- Public webhooks explicitly marked with `verify_jwt = false`
- User context always validated via `supabase.auth.getUser()`

### Secrets Management
- API keys stored as Supabase secrets (never in code)
- Edge functions access secrets via `Deno.env.get()`
- LOVABLE_API_KEY auto-provisioned for AI features

### Key Functions
- `initiate-kilt-kyc`: Requires authentication
- `verify-kilt-attestation`: Public webhook (validates signature)
- `initiate-docuseal-signature`: Requires authentication
- `stripe-webhook-handler`: Public webhook (validates Stripe signature)

---

## Compliance & Data Protection

### GDPR Compliance
- Users can view and update their own data
- Data minimization: only required fields stored
- Right to erasure: admin can delete user accounts
- Audit trails maintained for sensitive operations

### Financial Data Security
- IBAN numbers encrypted in transit (HTTPS)
- Access strictly controlled via RLS
- Payment processing via Stripe (PCI DSS compliant)
- SEPA mandate PDFs stored in secured storage bucket

### Audit Trail
- All signature events logged in `signature_events` table
- Ticket activities tracked in `ticket_activities` table
- Property changes can include `modification_reason` field
- Analytics track user behavior (opt-out available)

---

**Last Updated**: Phase 5 - November 4, 2025  
**Migration**: `20251104-215242-246843`  
**Security Scan Status**: ✅ All critical issues resolved
