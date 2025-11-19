# Data Protection Documentation

This document provides detailed information about how FlatMate processes, stores, and protects personal data in compliance with GDPR and other data protection regulations.

---

## Table of Contents

1. [Data Controller & Processor Roles](#data-controller--processor-roles)
2. [Data Processing Activities](#data-processing-activities)
3. [Third-Party Processors (Sub-processors)](#third-party-processors-sub-processors)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Security Measures](#security-measures)
6. [Data Retention & Deletion](#data-retention--deletion)
7. [User Rights & Requests](#user-rights--requests)
8. [Compliance Certifications](#compliance-certifications)
9. [Breach Notification Procedures](#breach-notification-procedures)
10. [Contact Information](#contact-information)

---

## Data Controller & Processor Roles

### FlatMate as Data Controller
FlatMate acts as **Data Controller** for:
- User account information (authentication, preferences)
- Platform usage analytics
- System settings and configurations
- Subscription and billing information

**Legal Basis**: Legitimate interest in providing and improving the platform (GDPR Article 6(1)(f))

### FlatMate as Data Processor
FlatMate acts as **Data Processor** for:
- Tenant personal data managed by property managers
- Tenancy records and documents
- Financial transaction records between managers and tenants

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b)) on behalf of property managers (Data Controllers)

### Property Managers as Data Controllers
Property managers are **Data Controllers** for:
- Personal data of their tenants
- Tenancy agreements and rental terms
- Financial arrangements with tenants
- Property-specific documents

---

## Data Processing Activities

### 1. User Registration & Authentication

**Purpose**: Enable users to create accounts and access the platform

**Data Collected**:
- Email address (required)
- Password (hashed with bcrypt)
- First name, last name (optional)
- Phone number (optional)
- User role (manager/tenant)

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b))

**Retention Period**: Until account deletion + 14-day grace period, or 5 years of inactivity (then anonymized)

**Sub-processors**: Supabase (authentication)

---

### 2. Property Management

**Purpose**: Enable property managers to list, manage, and track their properties

**Data Collected**:
- Property details (address, description, photos, videos)
- Property status (active, archived, ending_tenancy)
- Manager information
- Property documents (contracts, checklists, certificates)

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b))

**Retention Period**: 3 years after property archived (then anonymized, except financial records retained for 7 years)

**Sub-processors**: Supabase (storage)

---

### 3. Tenancy Management

**Purpose**: Facilitate relationships between property managers and tenants

**Data Collected**:
- Tenant invitation details (email, property, status)
- Tenancy start/end dates
- Tenancy status (active, ending, ended)
- Tenancy notes
- KYC verification data (if enabled)

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b))

**Retention Period**: 3 years after tenancy ends (then anonymized)

**Sub-processors**: Supabase (database), Dock.io (KYC verification, optional)

---

### 4. Rent Agreement & Payments

**Purpose**: Manage rent agreements and track payments between managers and tenants

**Data Collected**:
- Rent agreement terms (amount, payment day, start/end dates)
- Tenant IBAN (encrypted)
- Payment records (due dates, amounts, status)
- Proof of payment documents
- SEPA mandate information

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b)) + Legal obligation (financial record retention)

**Retention Period**: 7 years after tenancy ends (legal requirement for financial records)

**Sub-processors**: Supabase (storage), Stripe (payment processing), Resend (payment reminders)

---

### 5. Utility Payments

**Purpose**: Track utility payments made by tenants

**Data Collected**:
- Utility type (electricity, gas, water, etc.)
- Payment amounts and due dates
- Billing period information
- Proof of payment uploads (invoices, receipts)
- Manager review status and notes

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b))

**Retention Period**: 7 years (financial records legal requirement)

**Sub-processors**: Supabase (storage)

---

### 6. Digital Contract Signing

**Purpose**: Enable legally binding digital signatures on rental contracts

**Data Collected**:
- Contract PDF documents
- Signature metadata (IP address, timestamp, user agent)
- DocuSeal submission IDs and slugs
- Qualified signature session IDs (AutoFirma, etc.)
- Signature audit trails

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b)) + Legal obligation (signature verification)

**Retention Period**: 10 years (legal requirement for contract signatures)

**Sub-processors**: DocuSeal (electronic signatures), Supabase (storage)

---

### 7. Maintenance & Ticketing

**Purpose**: Enable tenants to report issues and managers to track maintenance

**Data Collected**:
- Ticket details (title, description, priority, type)
- Ticket attachments (photos, videos)
- Comments and activity timeline
- Assignment and resolution information

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b))

**Retention Period**: 3 years after ticket resolution (then deleted)

**Sub-processors**: Supabase (storage)

---

### 8. Analytics & Usage Tracking

**Purpose**: Understand platform usage to improve user experience (opt-in required)

**Data Collected**:
- Page views (path, timestamp, session ID)
- User events (feature usage, clicks)
- Navigation paths
- IP address (anonymized - last octet masked)
- User agent (browser/device info)
- Geolocation (city-level only, no precise location)

**Legal Basis**: Consent (GDPR Article 6(1)(a))

**Retention Period**: 2 years (then deleted)

**Sub-processors**: Supabase (storage)

**User Control**: Users can opt out via Privacy Settings or enable "Do Not Track" in their browser

---

### 9. Communications

**Purpose**: Send transactional emails and notifications

**Data Collected**:
- Email address
- Notification preferences
- Email content (invitations, payment reminders, system notifications)

**Legal Basis**: Performance of contract (GDPR Article 6(1)(b)) for transactional emails; Consent for marketing

**Retention Period**: Email logs retained for 1 year

**Sub-processors**: Resend (email delivery)

---

## Third-Party Processors (Sub-processors)

All sub-processors are contractually bound to GDPR compliance through Data Processing Agreements (DPAs) and Standard Contractual Clauses (SCCs) where applicable.

### 1. Supabase Inc.

**Services**: Database, authentication, file storage, backend infrastructure

**Data Processed**: All user data (profiles, properties, payments, documents, analytics)

**Location**: United States (EU data centers available)

**Certifications**: ISO 27001, SOC 2 Type II, EU-US Data Privacy Framework

**Data Transfer Mechanism**: EU-US Data Privacy Framework certification

**DPA**: Available at https://supabase.com/legal/dpa

**Privacy Policy**: https://supabase.com/privacy

**Retention**: As per FlatMate's instructions

---

### 2. Stripe Inc.

**Services**: Payment processing, SEPA direct debits, subscription billing

**Data Processed**: Payment card details, IBAN, transaction records, billing information

**Location**: United States (EU operations via Stripe Payments Europe Ltd., Ireland)

**Certifications**: PCI DSS Level 1, ISO 27001, SOC 2 Type II

**Data Transfer Mechanism**: Standard Contractual Clauses (SCCs)

**DPA**: Available at https://stripe.com/legal/dpa

**Privacy Policy**: https://stripe.com/privacy

**Retention**: Stripe retains payment data per their retention policies (typically 7 years for financial records)

---

### 3. Resend Inc.

**Services**: Transactional email delivery

**Data Processed**: Email addresses, email content (invitations, notifications)

**Location**: United States

**Certifications**: SOC 2 Type II

**Data Transfer Mechanism**: Standard Contractual Clauses (SCCs)

**DPA**: Available on request

**Privacy Policy**: https://resend.com/legal/privacy-policy

**Retention**: Email logs retained for 90 days

---

### 4. DocuSeal

**Services**: Electronic signature workflows, document signing

**Data Processed**: Contract PDFs, signature metadata, signer information

**Location**: European Union

**Certifications**: eIDAS compliant, ISO 27001

**Data Transfer Mechanism**: EU-based (no international transfer)

**DPA**: Available on request

**Privacy Policy**: https://www.docuseal.com/privacy

**Retention**: Signed documents and audit trails retained per legal requirements (10 years)

---

### 5. Dock.io (Optional)

**Services**: Decentralized identity verification (KYC)

**Data Processed**: Identity credentials, KYC attestations, DID (Decentralized Identifier)

**Location**: European Union

**Certifications**: GDPR compliant

**Data Transfer Mechanism**: EU-based (no international transfer), decentralized blockchain storage

**DPA**: Available on request

**Privacy Policy**: https://www.dock.io/privacy

**Retention**: Credentials expire after user-defined period (typically 1-5 years)

**Note**: Only used if property manager enables KYC requirement

---

### 6. AutoFirma / Qualified Signature Providers (Country-Specific)

**Services**: Qualified digital signatures (legally binding)

**Data Processed**: Signature certificates, signing session metadata

**Location**: Varies by country (e.g., Spain for AutoFirma)

**Certifications**: eIDAS qualified trust service provider

**Data Transfer Mechanism**: Varies by provider

**DPA**: Provided by qualified trust service provider

**Privacy Policy**: Varies by provider

**Retention**: Signature records retained per eIDAS requirements (typically 10 years)

---

## Data Flow Diagrams

### 1. User Registration Flow

```
User (Browser)
    ↓ [Email, Password]
Supabase Auth
    ↓ [User ID, JWT Token]
FlatMate Backend
    ↓ [Create Profile]
Supabase Database
    ↓ [Store: profiles, user_roles, user_preferences]
User Session Established
```

**Data at Rest**: Encrypted in Supabase PostgreSQL (AES-256)
**Data in Transit**: TLS 1.3

---

### 2. Tenant Invitation Flow

```
Manager (Browser)
    ↓ [Invite Tenant: email, property_id]
FlatMate Backend
    ↓ [Create Invitation Record]
Supabase Database
    ↓ [Store: invitations table]
Resend Email Service
    ↓ [Send Invitation Email]
Tenant Email Inbox
    ↓ [Tenant Clicks Link]
Tenant Registers/Accepts
    ↓ [Create Tenancy Record]
Supabase Database (property_tenants)
```

**Personal Data**: Email address, property details
**Retention**: Invitation expires after 7 days (configurable)

---

### 3. Rent Payment Flow

```
Manager Creates Rent Agreement
    ↓ [Amount, payment_day, tenant_iban]
Supabase Database (rent_agreements)
    ↓ [Monthly: Generate Payment Records]
Edge Function (generate-monthly-payments)
    ↓ [Create rent_payments entries]
Tenant Uploads Proof of Payment
    ↓ [Upload to Supabase Storage]
payment-proofs bucket (encrypted)
    ↓ [Update payment status: proof_uploaded]
Manager Reviews Proof
    ↓ [Approve/Reject]
Payment Status Updated (paid / pending)
```

**Financial Data**: IBAN (encrypted), payment amounts, dates
**Retention**: 7 years (legal requirement)

---

### 4. Digital Signature Flow (DocuSeal)

```
Manager Initiates Signature
    ↓ [Create contract_signatures record]
Edge Function (initiate-docuseal-signature)
    ↓ [Call DocuSeal API]
DocuSeal Creates Submission
    ↓ [Generate embed URLs for manager & tenant]
Both Parties Sign via Embed
    ↓ [DocuSeal Webhook: signature completed]
Edge Function (finalize-docuseal-signature)
    ↓ [Download signed PDF, update status]
Supabase Storage (qualified-contracts bucket)
    ↓ [Store signed document + audit log]
Contract Signature Completed
```

**Personal Data**: Names, emails, IP addresses, signatures
**Legal Compliance**: eIDAS compliant electronic signatures
**Retention**: 10 years (contract signature legal requirement)

---

### 5. Analytics Flow (Opt-In)

```
User Accepts Cookie Consent (Analytics)
    ↓ [Track: user_consents table]
User Navigates Platform
    ↓ [Page View Event]
useAnalytics Hook
    ↓ [Check: hasAnalyticsConsent() && !DoNotTrack]
If Consent = Yes
    ↓ [Anonymize IP (mask last octet)]
Edge Function (get-geolocation)
    ↓ [Fetch city-level geolocation]
Supabase Database
    ↓ [Store: analytics_page_views, analytics_events]
Admin Dashboard
    ↓ [View aggregated analytics]
```

**Personal Data**: Anonymized IP, session ID, user ID (if logged in)
**User Control**: Opt-out via Privacy Settings or Do Not Track
**Retention**: 2 years (then auto-deleted)

---

## Security Measures

### Technical Measures

#### 1. Encryption
- **At Rest**: AES-256 encryption for all database records (Supabase)
- **In Transit**: TLS 1.3 with strong cipher suites (TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256)
- **Sensitive Fields**: Additional application-level encryption for IBAN, payment proofs
- **Backups**: Encrypted backups with separate encryption keys

#### 2. Access Control
- **Row Level Security (RLS)**: PostgreSQL RLS policies on all 40+ database tables
- **Role-Based Access Control (RBAC)**: Three primary roles (manager, tenant, admin) with fine-grained permissions
- **JWT Authentication**: Short-lived access tokens (7 days) with refresh token rotation (30 days)
- **HTTP-only Cookies**: Authentication tokens stored as HTTP-only, Secure, SameSite=Strict cookies

#### 3. Network Security
- **Web Application Firewall (WAF)**: Cloudflare-based WAF with custom rules
- **DDoS Protection**: Cloudflare-level DDoS mitigation
- **Rate Limiting**: API rate limits (100 requests/minute per user)
- **IP Filtering**: Configurable IP whitelists for admin accounts (enterprise feature)

#### 4. Application Security
- **Input Validation**: Zod schema validation on all user inputs
- **Output Encoding**: Context-aware output encoding (HTML, URL, JavaScript)
- **SQL Injection Prevention**: Parameterized queries via Supabase client (no raw SQL in edge functions)
- **XSS Protection**: Content Security Policy (CSP) headers
- **CSRF Protection**: CSRF tokens on all state-changing operations

#### 5. Logging & Monitoring
- **Audit Logs**: All sensitive operations logged (contract signatures, payment status changes)
- **Real-time Monitoring**: Automated alerts for suspicious activity (failed login attempts, privilege escalation)
- **Edge Function Logs**: Comprehensive logging for all backend operations (retained for 30 days)

---

### Organizational Measures

#### 1. Access Management
- **Principle of Least Privilege**: Users granted minimum necessary permissions
- **Admin Access**: Admin privileges restricted to 2-3 individuals with MFA required
- **Third-Party Access**: Sub-processors granted access only via API keys (no direct database access)

#### 2. Employee Training
- **Security Awareness**: Annual security training for all employees
- **GDPR Training**: Mandatory data protection training for staff handling personal data
- **Incident Response Drills**: Quarterly simulated breach exercises

#### 3. Vendor Management
- **Due Diligence**: Security assessments of all sub-processors before engagement
- **Contractual Requirements**: DPAs and SCCs in place with all sub-processors
- **Ongoing Monitoring**: Annual reviews of sub-processor security practices

#### 4. Incident Response
- **Incident Response Plan**: Documented procedures for breach detection, containment, notification
- **Breach Notification**: Capability to notify affected users within 72 hours (GDPR requirement)
- **Post-Incident Review**: Root cause analysis and remediation after every incident

---

## Data Retention & Deletion

### Retention Periods

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| User Accounts (Active) | Until deletion requested | Service provision |
| User Accounts (Inactive) | 5 years → Anonymized | Legitimate interest |
| Tenancy Records | 3 years after end | Legal disputes, reference checks |
| Financial Records | 7 years after end | Tax law (Germany, EU) |
| Contract Signatures | 10 years | eIDAS signature validity |
| Analytics Data | 2 years | Service improvement |
| Ticket Data | 3 years after resolution | Service improvement, disputes |
| Email Logs | 1 year | Troubleshooting, compliance |

---

### Deletion & Anonymization Procedures

#### User-Requested Deletion
1. User requests deletion via Account Privacy Settings
2. 14-day grace period begins (deletion can be cancelled)
3. After 14 days:
   - Profile anonymized: `first_name: "Deleted", last_name: "User #[id]"`
   - Email randomized: `deleted-[hash]@anonymized.local`
   - Phone, IBAN cleared
   - Auth account deleted from Supabase
   - Financial records retained (anonymized) for 7 years

#### Automated Retention Enforcement
- **Edge Function**: `enforce-data-retention` (runs monthly)
- **Triggers**:
  - Anonymizes tenants 3 years after tenancy end
  - Anonymizes inactive accounts after 5 years
  - Deletes analytics data older than 2 years
  - Deletes resolved tickets older than 3 years
- **Audit Trail**: All actions logged in `data_retention_audit` table

---

## User Rights & Requests

### 1. Right of Access (GDPR Article 15)
**How to Exercise**: Account Privacy Settings → "Download My Data"
**Timeline**: Immediate (automated JSON export)
**Format**: Machine-readable JSON file with all personal data

### 2. Right to Rectification (GDPR Article 16)
**How to Exercise**: Account Profile page → Edit profile information
**Timeline**: Immediate (real-time updates)

### 3. Right to Erasure (GDPR Article 17)
**How to Exercise**: Account Privacy Settings → "Delete My Account"
**Timeline**: 14-day grace period, then permanent deletion within 30 days
**Exceptions**: Financial records retained for 7 years (legal obligation)

### 4. Right to Restrict Processing (GDPR Article 18)
**How to Exercise**: Privacy Rights page → "Restrict Processing" form
**Timeline**: Assessment within 5 business days, implementation within 30 days

### 5. Right to Data Portability (GDPR Article 20)
**How to Exercise**: Privacy Rights page → "Export Data (JSON)"
**Timeline**: Immediate (automated export)
**Format**: JSON (machine-readable)

### 6. Right to Object (GDPR Article 21)
**How to Exercise**: Privacy Rights page → "Object to Processing" form
**Timeline**: Assessment within 5 business days, response within 30 days
**Scope**: Analytics, marketing, profiling (users can opt out at any time)

### 7. Rights Related to Automated Decision-Making (GDPR Article 22)
**Applicability**: FlatMate does not currently use automated decision-making or profiling

---

### Privacy Request Workflow

```
User Submits Privacy Request
    ↓ [Form Submission]
privacy_requests table (status: pending)
    ↓ [Admin Notified]
Data Protection Officer Reviews
    ↓ [Assess Request]
Request Approved/Rejected
    ↓ [Execute Action if Approved]
User Notified (Email)
    ↓ [Request Completed]
privacy_requests table (status: completed)
```

**Response Time**: 30 days (can be extended to 60 days for complex requests with notification)

---

## Compliance Certifications

### FlatMate Compliance Status

| Standard | Status | Last Reviewed | Next Review |
|----------|--------|---------------|-------------|
| GDPR | ✅ Compliant | 2024-11 | 2025-05 |
| eIDAS | ✅ Compliant (via DocuSeal, AutoFirma) | 2024-10 | 2025-04 |
| ISO 27001 | ⏳ In Progress (via Supabase infrastructure) | 2024-11 | - |
| SOC 2 Type II | ✅ Compliant (via Supabase, Stripe) | 2024-09 | 2025-03 |
| PCI DSS Level 1 | ✅ Compliant (via Stripe) | 2024-08 | 2025-02 |

### Sub-processor Certifications

| Sub-processor | ISO 27001 | SOC 2 | GDPR | PCI DSS |
|---------------|-----------|-------|------|---------|
| Supabase | ✅ | ✅ | ✅ | N/A |
| Stripe | ✅ | ✅ | ✅ | ✅ Level 1 |
| Resend | ❌ | ✅ | ✅ | N/A |
| DocuSeal | ✅ | ❌ | ✅ | N/A |
| Dock.io | ❌ | ❌ | ✅ | N/A |

---

## Breach Notification Procedures

### Detection & Containment (0-4 hours)

1. **Automated Monitoring**: Real-time alerts for suspicious activity
2. **Incident Classification**: Determine severity (low, medium, high, critical)
3. **Immediate Containment**: Isolate affected systems, revoke compromised credentials
4. **Evidence Preservation**: Capture logs, forensic snapshots

### Investigation & Assessment (4-24 hours)

5. **Forensic Analysis**: Determine scope, cause, and impact
6. **Data Subject Impact**: Identify affected users and data categories
7. **Risk Assessment**: Evaluate likelihood and severity of harm to data subjects

### Notification (24-72 hours)

8. **Supervisory Authority**: Notify relevant DPA within 72 hours (GDPR Article 33)
9. **Affected Users**: Notify individuals if high risk to rights and freedoms (GDPR Article 34)
10. **Property Managers**: Notify managers if tenant data affected (DPA obligations)

### Remediation (72 hours - 30 days)

11. **Root Cause Analysis**: Identify vulnerabilities and attack vectors
12. **Security Improvements**: Implement fixes and enhanced security measures
13. **Documentation**: Complete incident report for internal and regulatory review

### Post-Incident Review (30+ days)

14. **Lessons Learned**: Update incident response procedures
15. **Security Audit**: Third-party security assessment (if critical breach)
16. **User Communication**: Transparency report on actions taken

---

## Contact Information

### Data Protection Officer (DPO)
- **Email**: dpo@flatmate.com
- **Response Time**: 48 hours (business days)
- **Postal Address**: [To be added]

### Security Team
- **Email**: security@flatmate.com
- **Emergency Hotline**: security-emergency@flatmate.com (critical vulnerabilities)
- **PGP Key**: Available on request for encrypted communications

### Legal Department
- **Email**: legal@flatmate.com
- **For**: Data Processing Agreements, Standard Contractual Clauses, legal compliance inquiries

### Supervisory Authority (Germany)
- **Name**: Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)
- **Website**: https://www.bfdi.bund.de
- **Email**: poststelle@bfdi.bund.de
- **Phone**: +49 (0)228 997799-0

---

## Version History

- **v1.0** (2024-11-19): Initial Data Protection Documentation
- **Last Updated**: 2024-11-19

---

## Document Review Schedule

- **Quarterly**: Review and update sub-processor list
- **Semi-Annually**: Review data retention policies and deletion procedures
- **Annually**: Full document review and update
- **Ad-hoc**: After major platform changes, breaches, or regulatory updates

---

*This document is maintained by the FlatMate Data Protection Team. For questions or clarifications, contact dpo@flatmate.com*
