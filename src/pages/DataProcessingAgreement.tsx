import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DataProcessingAgreement() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Data Processing Agreement (DPA)</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Purpose and Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This Data Processing Agreement ("DPA") forms part of the Terms of Service between FlatMate ("Processor") and property managers ("Controllers") using the Platform. This DPA governs the processing of personal data on behalf of Controllers in accordance with GDPR (EU Regulation 2016/679).
              </p>
              <h3 className="font-semibold mt-4">Definitions</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Controller:</strong> Property managers who determine the purposes and means of processing tenant personal data</li>
                <li><strong>Processor:</strong> FlatMate, which processes personal data on behalf of Controllers</li>
                <li><strong>Sub-processors:</strong> Third-party service providers engaged by FlatMate (listed in Section 5)</li>
                <li><strong>Personal Data:</strong> Any information relating to tenants and property management activities</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Nature and Purpose of Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Types of Personal Data Processed</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tenant identity data (name, email, phone number, address)</li>
                <li>Financial data (IBAN, rent payments, security deposits, utility payments)</li>
                <li>Tenancy details (lease agreements, start/end dates, rental terms)</li>
                <li>Property access data (invitations, access status, tenancy status)</li>
                <li>Communication data (tickets, comments, notifications)</li>
                <li>KYC/Identity verification data (if enabled)</li>
                <li>Digital signatures and contract execution records</li>
              </ul>

              <h3 className="font-semibold mt-4">Categories of Data Subjects</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Current tenants</li>
                <li>Former tenants (within retention period)</li>
                <li>Prospective tenants (invited but not yet accepted)</li>
              </ul>

              <h3 className="font-semibold mt-4">Processing Purposes</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Facilitating property management operations</li>
                <li>Managing tenancy relationships and communications</li>
                <li>Processing rent and utility payments</li>
                <li>Storing and versioning property documents</li>
                <li>Digital contract signing and legal compliance</li>
                <li>Maintenance request management</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Processor Obligations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">3.1 Processing Instructions</h3>
              <p>
                FlatMate shall process Personal Data only on documented instructions from the Controller (via the Platform interface), unless required to do so by EU or Member State law.
              </p>

              <h3 className="font-semibold mt-4">3.2 Confidentiality</h3>
              <p>
                All personnel authorized to process Personal Data have committed themselves to confidentiality or are under appropriate statutory obligation of confidentiality.
              </p>

              <h3 className="font-semibold mt-4">3.3 Security Measures</h3>
              <p>
                FlatMate implements appropriate technical and organizational measures to ensure a level of security appropriate to the risk (see Section 4).
              </p>

              <h3 className="font-semibold mt-4">3.4 Sub-processing</h3>
              <p>
                FlatMate has obtained general written authorization to engage sub-processors. Controllers will be notified of any changes to sub-processors with a 30-day prior notice period.
              </p>

              <h3 className="font-semibold mt-4">3.5 Data Subject Rights</h3>
              <p>
                FlatMate shall, to the extent legally permitted, promptly notify the Controller if it receives a request from a Data Subject to exercise their rights under GDPR. FlatMate will provide reasonable assistance to enable the Controller to respond to such requests.
              </p>

              <h3 className="font-semibold mt-4">3.6 Deletion and Return</h3>
              <p>
                Upon termination or expiry of services, FlatMate shall delete or return all Personal Data to the Controller (at Controller's choice) within 30 days, except where retention is required by law.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Security Measures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">4.1 Technical Measures</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> Data encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
                <li><strong>Access Control:</strong> Role-based access control (RBAC) with Row Level Security (RLS)</li>
                <li><strong>Authentication:</strong> JWT-based authentication with secure session management</li>
                <li><strong>Network Security:</strong> Firewall protection, DDoS mitigation, intrusion detection</li>
                <li><strong>Database Security:</strong> Automated backups, point-in-time recovery, replication</li>
              </ul>

              <h3 className="font-semibold mt-4">4.2 Organizational Measures</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Regular security audits and penetration testing</li>
                <li>Employee security training and confidentiality agreements</li>
                <li>Incident response plan and breach notification procedures</li>
                <li>Vulnerability management and patch management policies</li>
                <li>Business continuity and disaster recovery plans</li>
              </ul>

              <h3 className="font-semibold mt-4">4.3 Certifications</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Infrastructure hosted on ISO 27001 certified data centers</li>
                <li>SOC 2 Type II compliance (via Supabase infrastructure)</li>
                <li>PCI DSS Level 1 compliant payment processing (via Stripe)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Sub-Processors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                FlatMate engages the following authorized sub-processors:
              </p>
              
              <div className="space-y-6 mt-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Supabase Inc.</h4>
                  <p className="text-sm text-muted-foreground">Database and backend infrastructure</p>
                  <p className="text-sm"><strong>Location:</strong> United States (EU-US Data Privacy Framework certified)</p>
                  <p className="text-sm"><strong>Purpose:</strong> Data storage, authentication, file storage</p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Stripe Inc.</h4>
                  <p className="text-sm text-muted-foreground">Payment processing</p>
                  <p className="text-sm"><strong>Location:</strong> United States (Standard Contractual Clauses in place)</p>
                  <p className="text-sm"><strong>Purpose:</strong> Processing rent payments, subscription billing, SEPA direct debits</p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Resend Inc.</h4>
                  <p className="text-sm text-muted-foreground">Email delivery</p>
                  <p className="text-sm"><strong>Location:</strong> United States</p>
                  <p className="text-sm"><strong>Purpose:</strong> Transactional emails, invitations, notifications</p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">DocuSeal</h4>
                  <p className="text-sm text-muted-foreground">Digital signature services</p>
                  <p className="text-sm"><strong>Location:</strong> European Union</p>
                  <p className="text-sm"><strong>Purpose:</strong> Electronic contract signing, signature verification</p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Dock.io</h4>
                  <p className="text-sm text-muted-foreground">Identity verification (optional)</p>
                  <p className="text-sm"><strong>Location:</strong> European Union</p>
                  <p className="text-sm"><strong>Purpose:</strong> KYC verification, decentralized identity attestation</p>
                </div>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                Controllers will be notified 30 days in advance of any changes to this sub-processor list and may object to new sub-processors on reasonable data protection grounds.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Breach Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">6.1 Notification Timeline</h3>
              <p>
                In the event of a personal data breach, FlatMate shall notify affected Controllers without undue delay and, where feasible, no later than 72 hours after becoming aware of the breach.
              </p>

              <h3 className="font-semibold mt-4">6.2 Notification Content</h3>
              <p>The notification shall include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nature of the breach (categories and approximate number of data subjects affected)</li>
                <li>Likely consequences of the breach</li>
                <li>Measures taken or proposed to address the breach and mitigate its adverse effects</li>
                <li>Contact point for further information</li>
              </ul>

              <h3 className="font-semibold mt-4">6.3 Cooperation</h3>
              <p>
                FlatMate shall provide reasonable cooperation and assistance to Controllers in investigating and remediating the breach, including providing logs, forensic data, and incident reports.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Personal data may be transferred to and processed in countries outside the European Economic Area (EEA). For transfers to sub-processors in the United States, FlatMate relies on:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>EU-US Data Privacy Framework certification (Supabase)</li>
                <li>Standard Contractual Clauses approved by the European Commission (Stripe, Resend)</li>
                <li>Adequacy decisions where applicable</li>
              </ul>
              <p className="mt-4">
                Controllers can request copies of the Standard Contractual Clauses by contacting our Data Protection Officer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Audit Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Upon reasonable written notice, Controllers have the right to audit FlatMate's compliance with this DPA, subject to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Audits limited to once per year unless a breach has occurred</li>
                <li>Audits conducted during business hours with minimal disruption</li>
                <li>Auditors bound by confidentiality obligations</li>
                <li>Costs borne by the requesting Controller</li>
              </ul>
              <p className="mt-4">
                FlatMate will provide copies of relevant certifications, audit reports, and compliance documentation upon request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Liability and Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Each party's liability under this DPA shall be subject to the limitations and exclusions set out in the Terms of Service. FlatMate shall not be liable for any claims arising from the Controller's instructions or misuse of the Platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Term and Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This DPA shall remain in effect for as long as FlatMate processes Personal Data on behalf of the Controller. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>FlatMate shall delete or return all Personal Data within 30 days</li>
                <li>Financial records retained for legal compliance (7 years)</li>
                <li>Controllers can export data before final deletion</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                For DPA-related inquiries:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Data Protection Officer:</strong> dpo@flatmate.com</li>
                <li><strong>Legal Department:</strong> legal@flatmate.com</li>
                <li><strong>Security Team:</strong> security@flatmate.com</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
