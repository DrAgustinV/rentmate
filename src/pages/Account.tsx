import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, profileService, adminService } from "@/services";
import { AppLayout } from "@/components/layouts/AppLayout";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserCircle, ShieldCheck, Crown, Download, Trash2, AlertTriangle, Palette, ArrowRightLeft, Building2, Home } from "lucide-react";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { showToast } from "@/lib/toast";
import { formatDate } from "@/lib/dateUtils";
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
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";

export default function Account() {
  const navigate = useNavigate();
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
  const { activeRole } = useRole();
  const defaultTab = searchParams.get("tab") || "profile";
  const returnTo = searchParams.get("returnTo");

  // Fetch user's role and quick stats
  const { data: roleData } = useQuery({
    queryKey: ["account-role-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: propertiesManaged } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", user.id);

      if (propertiesManaged && propertiesManaged.length > 0) {
        const { count: propertyCount } = await supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("manager_id", user.id);
        return { role: "manager" as const, count: propertyCount || 0 };
      }

      const { count: tenancyCount } = await supabase
        .from("property_tenants")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", user.id);

      return { role: "tenant" as const, count: tenancyCount || 0 };
    },
    enabled: !!user,
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, mounted: boolean) => {
    if (!mounted) return;
    setLoading(true);
    try {
      const profile = await profileService.getProfile(userId);

      const { data: deletionData } = await supabase
        .from("profiles")
        .select("deletion_scheduled_for")
        .eq("id", userId)
        .maybeSingle();

      if (mounted && profile) {
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        setDeletionScheduled(deletionData?.deletion_scheduled_for || null);
        setAvatarUrl(profile.avatarStoragePath);
        setKycStatus(profile.kycStatus);
      }
    } catch (error: unknown) {
      if (mounted) {
        showToast.error(t('common.error'), error instanceof Error ? error.message : t('common.error'));
      }
    } finally {
      if (mounted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      if (mounted) setUser(session.user);
      await fetchProfile(session.user.id, mounted);
    };

    checkUser();
    return () => { mounted = false; };
  }, [navigate, fetchProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await profileService.updateProfile(user.id, {
        firstName: firstName || null,
        lastName: lastName || null,
        avatarStoragePath: avatarUrl,
      });

      showToast.success(t('common.success'), t('settings.saved'));
    } catch (error: unknown) {
      showToast.error(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await adminService.exportUserData({ userId: user.id });

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

      showToast.success(t('account.dataExportSuccess') || 'Data Export Complete', t('account.dataExportSuccessDesc') || 'Your data has been downloaded successfully.');
    } catch (error: unknown) {
      showToast.error(t('account.dataExportFailed') || 'Export Failed', error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    try {
      const data = await adminService.deleteUserAccount({ userId: user.id });

      setDeletionScheduled(data.deletion_date);
      setShowDeleteDialog(false);

      showToast.success(
        t('account.deletionScheduled') || 'Account Deletion Scheduled',
        `${t('account.deletionScheduledDesc') || 'Your account will be deleted on'} ${formatDate(data.deletion_date)}. ${t('account.deletionCancelHint') || 'You can cancel this anytime before that date.'}`
      );

      if (user) {
        await fetchProfile(user.id);
      }
    } catch (error: unknown) {
      showToast.error(t('account.deletionFailed') || 'Deletion Request Failed', error instanceof Error ? error.message : String(error));
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await adminService.deleteUserAccount({ action: 'cancel' });

      setDeletionScheduled(null);

      showToast.success(t('account.deletionCancelled') || 'Deletion Cancelled', t('account.deletionCancelledDesc') || 'Your account deletion has been cancelled successfully.');

      if (user) {
        await fetchProfile(user.id);
      }
    } catch (error: unknown) {
      showToast.error(t('account.cancellationFailed') || 'Cancellation Failed', error instanceof Error ? error.message : String(error));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSkeleton preset="form" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-primary" />
            {t('header.myAccount')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('account.pageDescription') || 'Manage your account settings and verification'}</p>
        </div>

        {/* Back to Property Banner */}
        {returnTo && (
          <Alert className="mb-6 cursor-pointer" onClick={() => navigate(decodeURIComponent(returnTo))}>
            <ArrowLeft className="h-4 w-4" />
            <AlertDescription className="cursor-pointer">
              {t('account.backToProperty') || 'Back to Property'}
            </AlertDescription>
          </Alert>
        )}

        {/* Role Stats Card */}
        {roleData && (
          <Card className="mb-6">
            <CardContent className="py-3 flex items-center gap-3">
              <Badge variant={activeRole === 'manager' ? 'default' : 'secondary'}>
                {activeRole === 'manager' ? t('roles.manager') || 'Manager' : t('roles.tenant') || 'Tenant'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {roleData.role === 'manager'
                  ? `${t('account.managingProperties') || 'Managing'} ${roleData.count} ${t('account.properties') || 'properties'}`
                  : `${t('account.tenantAt') || 'Tenant at'} ${roleData.count} ${t('account.properties') || 'properties'}`}
              </span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full ${activeRole === 'manager' ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="profile">
              <UserCircle className="h-4 w-4 mr-2" />
              {t('account.profile')}
            </TabsTrigger>
            <TabsTrigger value="roles">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {t('roles.title') || 'Roles'}
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              {t('settings.appearance')}
            </TabsTrigger>
            {activeRole === 'manager' && (
              <TabsTrigger value="subscription">
                <Crown className="h-4 w-4 mr-2" />
                {t('subscription.title')}
              </TabsTrigger>
            )}
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

                {user?.last_sign_in_at && (
                  <div className="text-sm text-muted-foreground">
                    {t('account.lastSignIn') || 'Last sign in'}: {new Date(user.last_sign_in_at).toLocaleString()}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? t('settings.saving') : t('settings.saveChanges')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  {t('roles.title') || 'Roles'}
                </CardTitle>
                <CardDescription>
                  {t('roles.description') || 'Switch between Manager and Tenant views'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current role indicator */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t('roles.currentActiveRole') || 'Active Role'}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('roles.currentActiveRoleDesc') || 'Your current view and navigation mode'}
                    </p>
                  </div>
                  <Badge variant={activeRole === 'manager' ? 'default' : 'secondary'}>
                    {activeRole === 'manager' ? t('roles.manager') || 'Manager' : t('roles.tenant') || 'Tenant'}
                  </Badge>
                </div>

                {/* Default role indicator */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t('roles.defaultRole') || 'Default Role'}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('roles.defaultRoleDesc') || 'The role you land on after signing in'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {activeRole === 'manager' ? t('roles.manager') || 'Manager' : t('roles.tenant') || 'Tenant'}
                  </Badge>
                </div>

                <Separator />

                {/* Role switcher cards */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t('roles.switchTo') || 'Switch to...'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeRole !== 'manager') {
                          navigate('/properties');
                        }
                      }}
                      disabled={activeRole === 'manager'}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                        activeRole === 'manager'
                          ? 'border-primary bg-primary/5 cursor-default opacity-60'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        activeRole === 'manager' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Building2 className={`h-4 w-4 ${
                          activeRole === 'manager' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t('roles.manager') || 'Manager'}</p>
                        <p className="text-xs text-muted-foreground">{t('roles.managerRoleDesc') || 'Manage properties and tenants'}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeRole !== 'tenant') {
                          navigate('/rentals');
                        }
                      }}
                      disabled={activeRole === 'tenant'}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                        activeRole === 'tenant'
                          ? 'border-primary bg-primary/5 cursor-default opacity-60'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        activeRole === 'tenant' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Home className={`h-4 w-4 ${
                          activeRole === 'tenant' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t('roles.tenant') || 'Tenant'}</p>
                        <p className="text-xs text-muted-foreground">{t('roles.tenantRoleDesc') || 'View rentals and pay rent'}</p>
                      </div>
                    </button>
                  </div>
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
            <IdentityVerification returnTo={returnTo || undefined} />
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
                  {t('account.downloadMyData') || 'Download My Data'}
                </CardTitle>
                <CardDescription>
                  {t('account.downloadMyDataDesc') || 'Export all your personal data in machine-readable format (JSON)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? (t('common.loading') || 'Exporting...') : (t('account.downloadMyData') || 'Download My Data')}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  {t('account.deleteAccount') || 'Delete My Account'}
                </CardTitle>
                <CardDescription>
                  {t('account.deleteAccountDesc') || 'Permanently delete your account (14-day grace period)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deletionScheduled ? (
                  <div className="space-y-3">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="font-semibold text-destructive">{t('account.deletionScheduledFor') || 'Deletion scheduled for'} {formatDate(deletionScheduled)}</p>
                    </div>
                    <Button onClick={handleCancelDeletion} variant="outline">
                      {t('account.cancelDeletion') || 'Cancel Deletion'}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('account.deleteAccount') || 'Delete My Account'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">{t('account.confirmDeletion') || 'Confirm Account Deletion'}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('account.confirmDeletionDesc') || 'Your account will be deleted in 14 days. You can cancel anytime before then.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive">
                {t('account.scheduleDeletion') || 'Schedule Deletion'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AppLayout>
  );
}
