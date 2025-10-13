import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dateUtils";

export default function Privacy() {
  const lastUpdated = new Date('2024-01-01');

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {formatDate(lastUpdated)}</p>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                FlatMate ("we", "our", or "us") is committed to protecting your privacy. This Privacy 
                Policy explains how we collect, use, disclose, and safeguard your information when you 
                use our property management platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <p className="text-sm text-muted-foreground">
                  We collect personal information that you provide to us such as name, email address, 
                  phone number, and property information when you register for an account or use our services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Data</h3>
                <p className="text-sm text-muted-foreground">
                  We automatically collect certain information when you use our platform, including your 
                  IP address, browser type, access times, and pages viewed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Cookies and Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies and similar tracking technologies to track activity on our platform and 
                  store certain information to improve your experience.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>To provide, operate, and maintain our services</li>
                <li>To improve and personalize your experience</li>
                <li>To communicate with you about updates and support</li>
                <li>To process transactions and send related information</li>
                <li>To monitor and analyze usage patterns</li>
                <li>To detect and prevent fraud and abuse</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational security measures to protect your 
                personal information. However, no method of transmission over the internet is 100% secure, 
                and we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>The right to access your personal data</li>
                <li>The right to rectify inaccurate data</li>
                <li>The right to request deletion of your data</li>
                <li>The right to restrict or object to data processing</li>
                <li>The right to data portability</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@flatmate.app" className="text-primary hover:underline">
                  privacy@flatmate.app
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
