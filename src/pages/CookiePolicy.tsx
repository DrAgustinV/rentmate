import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";

export default function CookiePolicy() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {formatDate(new Date())}
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What Are Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how you use our Platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                FlatMate uses cookies for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Functionality:</strong> To enable core features like authentication and session management</li>
                <li><strong>User Preferences:</strong> To remember your language, theme, and interface settings</li>
                <li><strong>Analytics:</strong> To understand how you use the Platform and improve our services (with your consent)</li>
                <li><strong>Security:</strong> To protect against fraud and unauthorized access</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Types of Cookies We Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Essential Cookies */}
              <div className="border-l-4 border-primary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Essential Cookies</h3>
                  <Badge variant="secondary">Always Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These cookies are necessary for the Platform to function and cannot be disabled.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">Authentication Token</p>
                    <p className="text-sm text-muted-foreground">Cookie Name: <code className="bg-muted px-1 py-0.5 rounded">sb-access-token</code></p>
                    <p className="text-sm text-muted-foreground">Purpose: Maintains your logged-in session</p>
                    <p className="text-sm text-muted-foreground">Duration: 7 days</p>
                    <p className="text-sm text-muted-foreground">Type: HTTP-only, Secure</p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">Refresh Token</p>
                    <p className="text-sm text-muted-foreground">Cookie Name: <code className="bg-muted px-1 py-0.5 rounded">sb-refresh-token</code></p>
                    <p className="text-sm text-muted-foreground">Purpose: Allows automatic session renewal</p>
                    <p className="text-sm text-muted-foreground">Duration: 30 days</p>
                    <p className="text-sm text-muted-foreground">Type: HTTP-only, Secure</p>
                  </div>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Functional Cookies</h3>
                  <Badge variant="secondary">Always Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These cookies enable enhanced functionality and personalization.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">User Preferences</p>
                    <p className="text-sm text-muted-foreground">Storage: LocalStorage</p>
                    <p className="text-sm text-muted-foreground">Keys: <code className="bg-muted px-1 py-0.5 rounded">theme-mode</code>, <code className="bg-muted px-1 py-0.5 rounded">user-language</code></p>
                    <p className="text-sm text-muted-foreground">Purpose: Remembers your theme (light/dark) and language preference</p>
                    <p className="text-sm text-muted-foreground">Duration: Persistent</p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">Cookie Consent</p>
                    <p className="text-sm text-muted-foreground">Storage: LocalStorage</p>
                    <p className="text-sm text-muted-foreground">Keys: <code className="bg-muted px-1 py-0.5 rounded">cookie-consent-decision</code></p>
                    <p className="text-sm text-muted-foreground">Purpose: Stores your cookie consent choice</p>
                    <p className="text-sm text-muted-foreground">Duration: 1 year</p>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border-l-4 border-amber-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Analytics Cookies</h3>
                  <Badge variant="outline">Requires Consent</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These cookies help us understand how you use the Platform so we can improve it. You can opt out at any time.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">Analytics Session ID</p>
                    <p className="text-sm text-muted-foreground">Storage: LocalStorage</p>
                    <p className="text-sm text-muted-foreground">Key: <code className="bg-muted px-1 py-0.5 rounded">analytics-session-id</code></p>
                    <p className="text-sm text-muted-foreground">Purpose: Tracks your session for analytics (anonymized)</p>
                    <p className="text-sm text-muted-foreground">Duration: 30 minutes (session)</p>
                    <p className="text-sm text-muted-foreground">Note: IP addresses are anonymized (last octet masked)</p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">Page Views</p>
                    <p className="text-sm text-muted-foreground">Purpose: Counts page visits and navigation patterns</p>
                    <p className="text-sm text-muted-foreground">Data Collected: Page path, timestamp, session ID (no personal data)</p>
                    <p className="text-sm text-muted-foreground">Retention: 2 years</p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium">User Events</p>
                    <p className="text-sm text-muted-foreground">Purpose: Tracks feature usage (e.g., creating property, signing contract)</p>
                    <p className="text-sm text-muted-foreground">Data Collected: Event name, category, session ID (no personal data)</p>
                    <p className="text-sm text-muted-foreground">Retention: 2 years</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Some features on our Platform may use third-party services that set their own cookies:
              </p>
              
              <div className="space-y-4 mt-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Stripe (Payment Processing)</h4>
                  <p className="text-sm text-muted-foreground">Purpose: Fraud detection and secure payment processing</p>
                  <p className="text-sm text-muted-foreground">Privacy Policy: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a></p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">DocuSeal (Digital Signatures)</h4>
                  <p className="text-sm text-muted-foreground">Purpose: Signature workflow and audit trail</p>
                  <p className="text-sm text-muted-foreground">Privacy Policy: <a href="https://docuseal.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">docuseal.com/privacy</a></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managing Your Cookie Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Via Platform Settings</h3>
              <p>
                You can manage your cookie preferences at any time through your Account Privacy Settings:
              </p>
              <Button 
                onClick={() => navigate('/account?tab=privacy')} 
                className="mt-2"
              >
                Go to Privacy Settings
              </Button>

              <h3 className="font-semibold mt-6">Via Browser Settings</h3>
              <p>
                Most browsers allow you to control cookies through their settings. Note that disabling essential cookies may prevent you from using certain Platform features.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
              </ul>

              <h3 className="font-semibold mt-6">Do Not Track (DNT)</h3>
              <p>
                We respect the Do Not Track browser setting. When DNT is enabled, we will not track your activity or collect analytics data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential cookies:</strong> Deleted when you log out or after expiration</li>
                <li><strong>Functional cookies:</strong> Persistent until you clear them or change settings</li>
                <li><strong>Analytics data:</strong> Retained for 2 years, then automatically deleted</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Updates to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may update this Cookie Policy from time to time. Material changes will be notified through the Platform and via email. The "Last updated" date at the top indicates when the policy was last revised.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about our use of cookies:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Email:</strong> privacy@flatmate.com</li>
                <li><strong>Data Protection Officer:</strong> dpo@flatmate.com</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
