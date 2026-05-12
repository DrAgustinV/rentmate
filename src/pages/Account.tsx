import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserCircle, ShieldCheck, Crown, Download, Trash2, AlertTriangle, Palette } from "lucide-react";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IdentityVerification } from "@/components/IdentityVerification";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PrivacySettings } from "@/components/PrivacySettings";
import { ChangePassword } from "@/components/auth/ChangePassword";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { useSearchParams } from "react-router-dom";

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);
  const { t } = useLanguage();
  const defaultTab = searchParams.get("tab") || "profile";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProfile(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, deletion_scheduled_for, avatar_url, kyc_status")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setDeletionScheduled(data.deletion_scheduled_for);
        setAvatarUrl(data.avatar_url);
        setKycStatus(data.kyc_status);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('settings.saved'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        method: 'POST',
      });

      if (error) throw error;

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Export Complete",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { action: 'request' },
      });

      if (error) throw error;

      setDeletionScheduled(data.deletion_date);
      setShowDeleteDialog(false);

      toast({
        title: "Account Deletion Scheduled",
        description: `Your account will be deleted on ${new Date(data.deletion_date).toLocaleDateString()}. You can cancel this anytime before that date.`,
        variant: "destructive",
      });

      if (user) {
        await fetchProfile(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Deletion Request Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { action: 'cancel' },
      });

      if (error) throw error;

      setDeletionScheduled(null);

      toast({
        title: "Deletion Cancelled",
        description: "Your account deletion has been cancelled successfully.",
      });

      if (user) {
        await fetchProfile(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('settings.loadingSettings')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-primary" />
            {t('header.myAccount')}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and verification</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <UserCircle className="h-4 w-4 mr-2" />
              {t('account.profile')}
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              {t('settings.appearance')}
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <Crown className="h-4 w-4 mr-2" />
              {t('subscription.title')}
            </TabsTrigger>
            <TabsTrigger value="identity">
              <ShieldCheck className="h-4 w-4 mr-2" />
              {t('account.identity')}
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('settings.privacyData')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.profileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Photo */}
                {user && (
                  <div className="pb-4">
                    <Label className="mb-3 block">{t('account.profilePhoto')}</Label>
                    <ProfilePhotoUpload
                      userId={user.id}
                      currentPhotoPath={avatarUrl}
                      firstName={firstName}
                      lastName={lastName}
                      onPhotoChange={(path) => setAvatarUrl(path)}
                      isKycVerified={kycStatus === 'verified'}
                    />
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('settings.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('settings.firstNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('settings.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('settings.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? t('settings.saving') : t('settings.saveChanges')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.appearance')}</CardTitle>
                <CardDescription>
                  {t('settings.appearanceDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppearanceSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identity" className="mt-6">
            <IdentityVerification />
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <SubscriptionManager />
          </TabsContent>

          <TabsContent value="privacy" className="mt-6 space-y-6">
            {/* Privacy Settings (Consent Management) */}
            <PrivacySettings />

            {/* Change Password */}
            <ChangePassword />

            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download My Data
                </CardTitle>
                <CardDescription>
                  Export all your personal data in machine-readable format (JSON)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Download My Data'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete My Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account (14-day grace period)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deletionScheduled ? (
                  <div className="space-y-3">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="font-semibold text-destructive">Deletion scheduled for {new Date(deletionScheduled).toLocaleDateString()}</p>
                    </div>
                    <Button onClick={handleCancelDeletion} variant="outline">
                      Cancel Deletion
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Confirm Account Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Your account will be deleted in 14 days. You can cancel anytime before then.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive">
                Schedule Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
