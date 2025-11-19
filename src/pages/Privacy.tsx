import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dateUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";

export default function Privacy() {
  const { t } = useLanguage();
  const { settings: brandSettings } = useBrandSettings();
  const lastUpdated = new Date('2025-01-19');

  const brandName = brandSettings?.brand_name || 'FlatMate';

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-2">{t('privacy.title') || 'Privacy Policy'}</h1>
        <p className="text-muted-foreground mb-8">
          Last Updated: {formatDate(lastUpdated)}
        </p>
        
        <div className="space-y-6">
          {/* Data Controller */}
          <Card>
            <CardHeader>
              <CardTitle>1. Data Controller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                {brandName} ("we", "our", or "us") is the data controller responsible for your personal data.
              </p>
              <div className="text-sm">
                <p className="font-semibold">Contact Information:</p>
                <p className="text-muted-foreground">Email: privacy@{brandName.toLowerCase().replace(/\s/g, '')}.com</p>
                <p className="text-muted-foreground">Data Protection Officer: dpo@{brandName.toLowerCase().replace(/\s/g, '')}.com</p>
              </div>
            </CardContent>
          </Card>

          {/* Legal Basis */}
          <Card>
            <CardHeader>
              <CardTitle>2. Legal Basis for Processing (GDPR)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                We process your personal data under the following legal bases (GDPR Article 6):
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Contract Performance (Art. 6(1)(b))</strong>: Processing necessary to provide property management services</li>
                <li><strong>Legal Obligation (Art. 6(1)(c))</strong>: Compliance with financial regulations and tax laws</li>
                <li><strong>Legitimate Interests (Art. 6(1)(f))</strong>: Fraud prevention, security, and service improvement</li>
                <li><strong>Consent (Art. 6(1)(a))</strong>: Analytics cookies and marketing communications (where you've opted in)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle>3. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Personal Information</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Name, email address, phone number</li>
                  <li>Property details (addresses, descriptions, photos)</li>
                  <li>Tenancy information (start/end dates, rental agreements)</li>
                  <li>Financial data (rent amounts, payment records, IBAN for SEPA payments)</li>
                  <li>Identity verification data (KYC: ID documents, wallet DID - if you choose to verify)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.2 Usage Data</h3>
                <p className="text-sm text-muted-foreground">
                  IP address (anonymized), browser type, device information, pages viewed, access times (only with your consent for analytics cookies)
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.3 Cookies & Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Essential cookies (necessary for site functionality), Analytics cookies (only with your consent). 
                  See our <a href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card>
            <CardHeader>
              <CardTitle>4. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li><strong>Service Delivery</strong>: Manage properties, tenancies, rent payments, maintenance tickets</li>
                <li><strong>Financial Processing</strong>: Process rent payments via Stripe, generate invoices, SEPA direct debit (where applicable)</li>
                <li><strong>Communication</strong>: Send service notifications, payment reminders, support responses</li>
                <li><strong>Legal Compliance</strong>: Tax reporting, financial record retention (7 years as required by law)</li>
                <li><strong>Security & Fraud Prevention</strong>: Detect and prevent unauthorized access, fraudulent payments</li>
                <li><strong>Analytics</strong>: Improve user experience, understand feature usage (only with your consent)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>5. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>We retain your data for the following periods:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Financial Records</strong>: 7 years (legal requirement)</li>
                  <li><strong>Tenancy Data</strong>: 3 years after tenancy ends</li>
                  <li><strong>Account Data</strong>: Until account deletion + 14-day grace period</li>
                  <li><strong>Analytics Data</strong>: 2 years (if consent given)</li>
                  <li><strong>Support Tickets</strong>: 3 years after resolution</li>
                </ul>
                <p className="mt-2">
                  After retention periods, data is either permanently deleted or anonymized. Financial records required by law are anonymized after 7 years.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Processors */}
          <Card>
            <CardHeader>
              <CardTitle>6. Third-Party Service Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground mb-2">We share data with the following processors:</p>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">Supabase (Database & Storage)</p>
                    <p className="text-muted-foreground">Purpose: Data storage, authentication. Location: US (Standard Contractual Clauses apply)</p>
                  </div>
                  <div>
                    <p className="font-semibold">Stripe (Payment Processing)</p>
                    <p className="text-muted-foreground">Purpose: Rent payments, subscriptions. PCI DSS Level 1 certified</p>
                  </div>
                  <div>
                    <p className="font-semibold">DocuSeal (Digital Signatures)</p>
                    <p className="text-muted-foreground">Purpose: Contract signing workflows</p>
                  </div>
                  <div>
                    <p className="font-semibold">Resend (Email Delivery)</p>
                    <p className="text-muted-foreground">Purpose: Transactional emails (invitations, payment reminders)</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4">
                  All processors are GDPR-compliant and bound by Data Processing Agreements (DPAs).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card>
            <CardHeader>
              <CardTitle>7. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Some of our service providers (e.g., Supabase) store data on servers located in the United States. 
                We ensure adequate protection through <strong>Standard Contractual Clauses (SCCs)</strong> approved by the European Commission. 
                Your data is protected with the same standards regardless of location.
              </p>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle>8. Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>We implement industry-standard security measures:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Encryption</strong>: All data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                  <li><strong>Access Control</strong>: Row-level security policies (RLS) on all database tables</li>
                  <li><strong>Authentication</strong>: Secure JWT-based authentication with Supabase Auth</li>
                  <li><strong>Payment Security</strong>: PCI DSS compliant payment processing via Stripe</li>
                  <li><strong>Monitoring</strong>: Continuous security monitoring and breach detection</li>
                </ul>
                <p className="mt-2">
                  However, no method of transmission over the internet is 100% secure. While we strive to protect your data, 
                  we cannot guarantee absolute security.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Your GDPR Rights */}
          <Card>
            <CardHeader>
              <CardTitle>9. Your Rights Under GDPR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground mb-2">
                  You have the following rights regarding your personal data:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">Right to Access (Art. 15)</p>
                    <p className="text-muted-foreground">Request a copy of all personal data we hold about you</p>
                    <p className="text-xs text-primary">→ Use "Download My Data" in Account Settings</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Rectification (Art. 16)</p>
                    <p className="text-muted-foreground">Correct inaccurate or incomplete data</p>
                    <p className="text-xs text-primary">→ Edit your profile in Account Settings</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Erasure / "Right to be Forgotten" (Art. 17)</p>
                    <p className="text-muted-foreground">Request deletion of your personal data (subject to legal retention requirements)</p>
                    <p className="text-xs text-primary">→ Use "Delete My Account" in Account Settings</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Restriction (Art. 18)</p>
                    <p className="text-muted-foreground">Limit how we process your data</p>
                    <p className="text-xs text-primary">→ Contact privacy@{brandName.toLowerCase().replace(/\s/g, '')}.com</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Data Portability (Art. 20)</p>
                    <p className="text-muted-foreground">Receive your data in a machine-readable format</p>
                    <p className="text-xs text-primary">→ Use "Download My Data" (exports JSON format)</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Object (Art. 21)</p>
                    <p className="text-muted-foreground">Object to processing based on legitimate interests</p>
                    <p className="text-xs text-primary">→ Contact privacy@{brandName.toLowerCase().replace(/\s/g, '')}.com</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Withdraw Consent (Art. 7(3))</p>
                    <p className="text-muted-foreground">Withdraw consent for analytics cookies at any time</p>
                    <p className="text-xs text-primary">→ Manage in Cookie Settings</p>
                  </div>
                  <div>
                    <p className="font-semibold">Right to Lodge a Complaint (Art. 77)</p>
                    <p className="text-muted-foreground">File a complaint with your supervisory authority</p>
                    <p className="text-xs text-muted-foreground">Spain: Agencia Española de Protección de Datos (AEPD) - www.aepd.es</p>
                    <p className="text-xs text-muted-foreground">Germany: Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI)</p>
                    <p className="text-xs text-muted-foreground">EU: Find your authority at edpb.europa.eu</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4">
                  To exercise any of these rights, visit your <a href="/account" className="text-primary hover:underline">Account Settings</a> or 
                  contact us at privacy@{brandName.toLowerCase().replace(/\s/g, '')}.com. We will respond within 30 days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>10. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal data from children. 
                If you are a parent/guardian and believe your child has provided us with personal data, please contact us immediately.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle>11. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We may update this Privacy Policy periodically. Material changes will be notified via email or prominent notice on our platform. 
                The "Last Updated" date at the top indicates when changes were last made. Your continued use of our services after changes 
                constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact Us */}
          <Card>
            <CardHeader>
              <CardTitle>12. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  For questions about this Privacy Policy, to exercise your GDPR rights, or to report a data breach:
                </p>
                <div className="space-y-1">
                  <p><strong>Email:</strong> <a href={`mailto:privacy@${brandName.toLowerCase().replace(/\s/g, '')}.com`} className="text-primary hover:underline">
                    privacy@{brandName.toLowerCase().replace(/\s/g, '')}.com
                  </a></p>
                  <p><strong>Data Protection Officer:</strong> <a href={`mailto:dpo@${brandName.toLowerCase().replace(/\s/g, '')}.com`} className="text-primary hover:underline">
                    dpo@{brandName.toLowerCase().replace(/\s/g, '')}.com
                  </a></p>
                </div>
                <p className="text-muted-foreground mt-4">
                  We are committed to resolving complaints about our collection or use of your personal data. 
                  EU residents may also lodge a complaint with their local data protection authority.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
