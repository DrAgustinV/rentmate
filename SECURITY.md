# Security Policy

## Responsible Disclosure Policy

At FlatMate, we take security seriously. We appreciate the efforts of security researchers and the broader community in helping us maintain a secure platform for our users.

### Reporting a Vulnerability

If you discover a security vulnerability in FlatMate, please report it responsibly by following these steps:

1. **Do NOT** publicly disclose the vulnerability until we've had a chance to address it
2. Email our security team at: **security@flatmate.com**
3. Include the following information in your report:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and severity
   - Any proof-of-concept code (if applicable)
   - Your contact information for follow-up

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: Our security team will assess the vulnerability and determine its severity within 5 business days
- **Updates**: We will provide regular updates on our progress (at least every 7 days)
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days, and medium/low severity issues within 90 days
- **Public Disclosure**: After the issue is resolved, we will coordinate with you on public disclosure timing

### Bug Bounty Program

While we don't currently have a formal bug bounty program, we deeply appreciate security research contributions. We may offer recognition and rewards on a case-by-case basis for significant vulnerability discoveries.

### Scope

**In Scope:**
- FlatMate web application (flatmate.com and all subdomains)
- Mobile applications (if applicable)
- APIs and backend services
- Authentication and authorization mechanisms
- Payment processing flows
- Data privacy and GDPR compliance issues
- Digital signature workflows

**Out of Scope:**
- Denial of Service (DoS) attacks
- Social engineering attacks against our employees
- Spam or phishing campaigns
- Physical security issues
- Third-party services (Stripe, Supabase, DocuSeal) - please report directly to them
- Issues in outdated browsers or operating systems

---

## Security Measures

### Technical Security

#### Encryption
- **Data at Rest**: All data stored in our database is encrypted using AES-256 encryption
- **Data in Transit**: All communications use TLS 1.3 with strong cipher suites
- **Sensitive Fields**: Financial data (IBAN, payment details) are additionally encrypted at the application level

#### Authentication & Access Control
- **JWT-based Authentication**: Secure token-based authentication with short-lived access tokens (7 days) and refresh tokens (30 days)
- **HTTP-only Cookies**: Authentication tokens stored as HTTP-only, Secure cookies to prevent XSS attacks
- **Row Level Security (RLS)**: Database-level access control ensuring users can only access their own data
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for managers, tenants, and administrators

#### Network Security
- **Firewall Protection**: Web Application Firewall (WAF) protecting against common attacks
- **DDoS Mitigation**: Cloudflare-based DDoS protection
- **Rate Limiting**: API rate limiting to prevent abuse
- **IP Whitelisting**: Available for enterprise accounts

#### Application Security
- **Input Validation**: All user inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content Security Policy (CSP) headers and output encoding
- **CSRF Protection**: Token-based CSRF protection on all state-changing operations

#### Infrastructure Security
- **ISO 27001 Certified Hosting**: Infrastructure hosted on ISO 27001 certified data centers (via Supabase)
- **SOC 2 Type II Compliance**: Regular security audits and compliance checks
- **Automated Backups**: Daily encrypted backups with 30-day retention
- **Disaster Recovery**: Documented disaster recovery and business continuity plans

### Data Security

#### Data Retention
- **Tenant Data**: Retained for 3 years after tenancy end, then anonymized
- **Financial Records**: Retained for 7 years (legal requirement), then anonymized
- **Analytics Data**: Retained for 2 years, then deleted
- **Inactive Accounts**: Anonymized after 5 years of inactivity

#### Anonymization Strategy
When personal data reaches its retention limit:
1. Names replaced with "Deleted User #[ID]"
2. Email addresses randomized to `deleted-[hash]@anonymized.local`
3. Phone numbers and IBAN cleared
4. Financial records retained (anonymized) for legal compliance
5. User IDs preserved for referential integrity

#### Data Breach Response
In the event of a data breach:
1. **Detection**: Automated monitoring and alerting systems
2. **Containment**: Immediate action to stop the breach (within 1 hour)
3. **Investigation**: Forensic analysis to determine scope and impact (within 24 hours)
4. **Notification**: Affected users and supervisory authorities notified within 72 hours (GDPR requirement)
5. **Remediation**: Implement fixes and security improvements
6. **Post-Incident**: Review and update security measures

---

## Compliance & Certifications

### Regulatory Compliance
- **GDPR**: Full compliance with EU General Data Protection Regulation
- **PCI DSS Level 1**: Payment Card Industry Data Security Standard (via Stripe)
- **eIDAS**: Qualified digital signatures compliant with EU eIDAS regulation (via AutoFirma, DocuSeal)

### Data Processing
- **Data Processing Agreement (DPA)**: Available for all property managers
- **Standard Contractual Clauses (SCCs)**: In place for international data transfers
- **Sub-processors**: All sub-processors vetted and contractually bound to GDPR compliance

### Third-Party Security

#### Payment Processing (Stripe)
- PCI DSS Level 1 certified
- 3D Secure authentication support
- Fraud detection and prevention
- Privacy Policy: https://stripe.com/privacy

#### Database & Infrastructure (Supabase)
- ISO 27001 and SOC 2 Type II certified
- EU-US Data Privacy Framework participant
- 99.9% uptime SLA
- Privacy Policy: https://supabase.com/privacy

#### Email Services (Resend)
- GDPR compliant email delivery
- TLS encryption for all emails
- Privacy Policy: https://resend.com/legal/privacy-policy

#### Digital Signatures (DocuSeal)
- eIDAS compliant electronic signatures
- Audit trail and tamper-proof documents
- Privacy Policy: https://www.docuseal.com/privacy

---

## Security Best Practices for Users

### For Property Managers
1. **Strong Passwords**: Use unique, complex passwords (minimum 12 characters)
2. **Multi-Factor Authentication**: Enable MFA for your account (if available)
3. **Access Control**: Limit access to sensitive data on a need-to-know basis
4. **Regular Reviews**: Periodically review tenant access and permissions
5. **Secure Devices**: Only access the platform from secure, trusted devices
6. **Logout**: Always log out when using shared or public computers

### For Tenants
1. **Protect Credentials**: Never share your login credentials
2. **Verify Communications**: Be wary of phishing attempts - we'll never ask for your password via email
3. **Review Permissions**: Check what data you've consented to share
4. **Report Suspicious Activity**: Contact us immediately if you notice unauthorized access
5. **Keep Software Updated**: Use up-to-date browsers and operating systems

### For All Users
1. **Regular Security Checks**: Review your account activity regularly
2. **Download Data**: Periodically export your data for backup purposes
3. **Privacy Settings**: Review and update your privacy preferences
4. **Suspicious Links**: Don't click on suspicious links claiming to be from FlatMate
5. **Official Channels**: Always access FlatMate through the official domain (flatmate.com)

---

## Incident Response Contact

### Security Team Contact
- **Email**: security@flatmate.com
- **Response Time**: 24 hours (48 hours on weekends)
- **PGP Key**: Available upon request for encrypted communications

### Data Protection Officer
- **Email**: dpo@flatmate.com
- **Phone**: [To be added]
- **Address**: [To be added]

### Emergency Contact (Critical Vulnerabilities)
- **Email**: security-emergency@flatmate.com
- **Expected Response**: Within 4 hours

---

## Security Audit History

| Date | Type | Auditor | Status |
|------|------|---------|--------|
| 2024-Q4 | Penetration Testing | Internal | Completed |
| 2024-Q3 | Code Review | Internal | Completed |
| 2024-Q2 | Infrastructure Audit | Supabase | Completed |

---

## Version History

- **v1.0** (2024-01-15): Initial security policy
- **Last Updated**: {current_date}

---

## Questions?

If you have questions about our security practices that aren't addressed in this document, please contact:
- General inquiries: security@flatmate.com
- Legal/compliance: legal@flatmate.com
- Data protection: dpo@flatmate.com
