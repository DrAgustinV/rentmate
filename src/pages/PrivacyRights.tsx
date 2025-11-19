import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Download, FileText, Shield, Trash2, Ban, AlertCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PrivacyRights() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [objectionDetails, setObjectionDetails] = useState("");
  const [restrictionDetails, setRestrictionDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data');
      
      if (error) throw error;

      // Download the JSON data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flatmate-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Export Successful",
        description: "Your personal data has been downloaded as JSON.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitRequest = async (requestType: string, details: string) => {
    if (!details.trim()) {
      toast({
        title: "Details Required",
        description: "Please provide details about your request.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('privacy_requests').insert({
        user_id: user.id,
        request_type: requestType,
        request_details: details,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your privacy request has been submitted and will be processed within 30 days.",
      });

      // Clear form
      if (requestType === 'objection') setObjectionDetails("");
      if (requestType === 'restriction') setRestrictionDetails("");
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    navigate('/account?tab=privacy');
    // Scroll to delete section
    setTimeout(() => {
      const deleteSection = document.querySelector('[data-delete-account]');
      deleteSection?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Your Privacy Rights</h1>
          <p className="text-muted-foreground">
            Exercise your rights under GDPR and other data protection laws
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Right to Access */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>Access My Data</CardTitle>
              </div>
              <CardDescription>
                Download a copy of all personal data we hold about you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You'll receive a JSON file containing your profile, properties, payments, documents, and all associated data.
              </p>
              <Button onClick={handleExportData} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download My Data
              </Button>
            </CardContent>
          </Card>

          {/* Right to Rectification */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Correct My Data</CardTitle>
              </div>
              <CardDescription>
                Update inaccurate or incomplete personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You can edit your profile information, contact details, and preferences directly in your account settings.
              </p>
              <Button 
                onClick={() => navigate('/profile')} 
                variant="outline" 
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Edit My Profile
              </Button>
            </CardContent>
          </Card>

          {/* Right to Erasure */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle>Delete My Account</CardTitle>
              </div>
              <CardDescription>
                Permanently delete your account and personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This action has a 14-day grace period. Financial records are retained for 7 years as required by law.
              </p>
              <Button 
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive" 
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>

          {/* Right to Data Portability */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Data Portability</CardTitle>
              </div>
              <CardDescription>
                Export your data in a machine-readable format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Receive your data in JSON format to transfer to another service or use for your own purposes.
              </p>
              <Button onClick={handleExportData} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Data (JSON)
              </Button>
            </CardContent>
          </Card>

          {/* Right to Restriction */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-primary" />
                <CardTitle>Restrict Processing</CardTitle>
              </div>
              <CardDescription>
                Request to limit how we process your personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You can request that we restrict certain processing activities (e.g., marketing, analytics) while maintaining your account. Please explain what processing you'd like to restrict and why.
              </p>
              <Textarea
                placeholder="Describe which processing activities you want to restrict and your reason..."
                value={restrictionDetails}
                onChange={(e) => setRestrictionDetails(e.target.value)}
                className="mb-4 min-h-[100px]"
              />
              <Button 
                onClick={() => handleSubmitRequest('restriction', restrictionDetails)}
                disabled={isSubmitting || !restrictionDetails.trim()}
                className="w-full"
              >
                <Ban className="mr-2 h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Restriction Request"}
              </Button>
            </CardContent>
          </Card>

          {/* Right to Object */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <CardTitle>Object to Processing</CardTitle>
              </div>
              <CardDescription>
                Object to specific processing activities based on your situation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You have the right to object to processing based on legitimate interests, direct marketing, or scientific/historical research. Please explain your objection and the grounds for it.
              </p>
              <Textarea
                placeholder="Describe what processing you object to and the reasons for your objection..."
                value={objectionDetails}
                onChange={(e) => setObjectionDetails(e.target.value)}
                className="mb-4 min-h-[100px]"
              />
              <Button 
                onClick={() => handleSubmitRequest('objection', objectionDetails)}
                disabled={isSubmitting || !objectionDetails.trim()}
                className="w-full"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Objection"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Important Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Response Timeline</h3>
              <p className="text-sm text-muted-foreground">
                We will respond to your privacy rights requests within 30 days. Complex requests may take up to 60 days with notification.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Legal Obligations</h3>
              <p className="text-sm text-muted-foreground">
                Some data must be retained for legal compliance (e.g., financial records for 7 years). This data will be anonymized where possible but cannot be deleted until the retention period expires.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contact the DPO</h3>
              <p className="text-sm text-muted-foreground">
                For questions about your privacy rights or to file a complaint, contact our Data Protection Officer at <a href="mailto:dpo@flatmate.com" className="text-primary hover:underline">dpo@flatmate.com</a>
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Supervisory Authority</h3>
              <p className="text-sm text-muted-foreground">
                You have the right to lodge a complaint with your national data protection authority if you believe your rights have been violated.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will navigate you to the Account Privacy settings where you can request account deletion with full details about what will be deleted and retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Go to Privacy Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
