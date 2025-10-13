import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-8">About FlatMate</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
              <CardDescription>Simplifying property management for everyone</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                FlatMate is a modern property management platform designed to streamline communication 
                between property managers and tenants. Our goal is to make property management simple, 
                efficient, and transparent for all parties involved.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What We Offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Ticket Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create, track, and resolve maintenance requests and issues efficiently with our 
                  intuitive ticketing system.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Property Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage multiple properties, track tenants, and maintain property documents all 
                  in one centralized platform.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Maintenance Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Plan and schedule recurring maintenance tasks to keep your properties in top condition.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Real-time Communication</h3>
                <p className="text-sm text-muted-foreground">
                  Stay connected with tenants and property managers through our built-in communication tools.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h3 className="font-semibold">Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  Clear communication and visibility into all property-related activities.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Efficiency</h3>
                <p className="text-sm text-muted-foreground">
                  Streamlined workflows that save time and reduce administrative overhead.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Reliability</h3>
                <p className="text-sm text-muted-foreground">
                  A dependable platform you can count on for managing your properties.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
