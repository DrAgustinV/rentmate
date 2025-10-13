import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Help() {
  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-8">Help & Support</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions about FlatMate</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I create a new property?</AccordionTrigger>
                  <AccordionContent>
                    Navigate to your Dashboard and click the "Add Property" button. Fill in the required 
                    information including property name, address, and description. You can also upload 
                    images and documents for the property.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I invite tenants to a property?</AccordionTrigger>
                  <AccordionContent>
                    Go to the property details page and click "Manage Tenants". Enter the tenant's email 
                    address to send them an invitation. They will receive an email with instructions to 
                    create an account and access the property.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I create a maintenance ticket?</AccordionTrigger>
                  <AccordionContent>
                    From any property page, click "Create Ticket" and select the type (maintenance, repair, 
                    or complaint). Fill in the details, set priority, and attach any relevant photos. The 
                    property manager will be notified immediately.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I schedule recurring maintenance tasks?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Go to the Property Maintenance page and click "Create Schedule". You can set up 
                    recurring tasks with custom frequencies (daily, weekly, monthly, etc.) and FlatMate 
                    will automatically create tickets based on your schedule.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>How do I upload property documents?</AccordionTrigger>
                  <AccordionContent>
                    From the property details page, click "Manage Documents". You can upload contracts, 
                    warranties, inspection reports, and other files. All documents are securely stored 
                    and can be accessed by authorized users.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>What ticket statuses are available?</AccordionTrigger>
                  <AccordionContent>
                    Tickets can have the following statuses: Open (newly created), In Progress (being worked on), 
                    Resolved (completed), and Cancelled (no longer needed). Property managers can update 
                    ticket status as work progresses.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger>How do I customize my account settings?</AccordionTrigger>
                  <AccordionContent>
                    Click on your profile icon and select "Settings". Here you can update your profile 
                    information, change your password, customize appearance (theme, colors, font size), 
                    and set your preferred date format.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger>Can I archive old properties?</AccordionTrigger>
                  <AccordionContent>
                    Yes, properties can be archived to keep your dashboard organized. Archived properties 
                    are hidden from the main view but can be accessed by toggling "Show Archived" on the 
                    Dashboard. All data remains intact.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>New to FlatMate? Here's how to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">For Property Managers</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Create your account and verify your email</li>
                  <li>Add your first property with details and photos</li>
                  <li>Invite tenants to the property</li>
                  <li>Set up recurring maintenance schedules</li>
                  <li>Start managing tickets and communications</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-2">For Tenants</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Accept your invitation email from your property manager</li>
                  <li>Create your account and set up your profile</li>
                  <li>View your property details and documents</li>
                  <li>Submit maintenance requests when needed</li>
                  <li>Track the status of your tickets</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Still need help? We're here for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Email Support</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send us an email and we'll respond within 24 hours
                  </p>
                  <Button variant="outline" asChild>
                    <a href="mailto:support@flatmate.app">support@flatmate.app</a>
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <MessageCircle className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Report a Bug</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Found an issue? Let us know so we can fix it
                  </p>
                  <Button variant="outline" asChild>
                    <a href="mailto:bugs@flatmate.app">bugs@flatmate.app</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
