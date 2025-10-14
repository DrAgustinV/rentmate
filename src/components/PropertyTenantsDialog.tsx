import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserMinus, Users, Mail, X, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { Separator } from "@/components/ui/separator";

interface Tenant {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface PropertyTenantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

export function PropertyTenantsDialog({ open, onOpenChange, propertyId, propertyTitle }: PropertyTenantsDialogProps) {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingTenant, setRemovingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTenants();
      fetchInvitations();
    }
  }, [open, propertyId]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          id,
          tenant_id,
          created_at,
          profiles!fk_property_tenants_profiles (
            email,
            first_name,
            last_name
          )
        `,
        )
        .eq("property_id", propertyId);

      if (error) throw error;

      const formattedTenants =
        data?.map((item: any) => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

          return {
            id: item.id,
            tenant_id: item.tenant_id,
            email: profile?.email || "Unknown",
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            created_at: item.created_at,
          };
        }) || [];

      setTenants(formattedTenants);
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

  const handleRemoveTenant = async () => {
    if (!removingTenant) return;

    try {
      const { error } = await supabase.from("property_tenants").delete().eq("id", removingTenant.id);

      if (error) throw error;

      toast({
        title: t('dialogs.manageTenants.removed'),
        description: `${getTenantName(removingTenant)} ${t('dialogs.manageTenants.removedDesc')} ${propertyTitle}`,
      });

      setTenants(tenants.filter((t) => t.id !== removingTenant.id));
      setRemovingTenant(null);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResendEmail = async (invitation: Invitation) => {
    setResendingEmail(invitation.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-tenant-invitation", {
        body: {
          email: invitation.email,
          propertyTitle: propertyTitle,
          invitationToken: invitation.id,
        },
      });

      if (error) throw error;

      toast({
        title: t('dialogs.manageTenants.emailResent'),
        description: t('dialogs.manageTenants.emailResentDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('dialogs.manageTenants.emailFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!cancellingInvitation) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", cancellingInvitation.id);

      if (error) throw error;

      toast({
        title: t('dialogs.manageTenants.invitationCancelled'),
        description: `${t('dialogs.manageTenants.invitationTo')} ${cancellingInvitation.email} ${t('dialogs.manageTenants.invitationCancelledDesc')}`,
      });

      setInvitations(invitations.filter((inv) => inv.id !== cancellingInvitation.id));
      setCancellingInvitation(null);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('dialogs.manageTenants.title')}
            </DialogTitle>
            <DialogDescription>{t('dialogs.manageTenants.description')} {propertyTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Tenants Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('dialogs.manageTenants.currentTenants')}</h3>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('dialogs.manageTenants.loading')}</div>
              ) : tenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('dialogs.manageTenants.noTenants')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{getTenantName(tenant)}</p>
                        <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('dialogs.manageTenants.added')} {formatDate(tenant.created_at)}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => setRemovingTenant(tenant)}>
                        <UserMinus className="h-4 w-4 mr-2" />
                        {t('dialogs.manageTenants.remove')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('dialogs.manageTenants.pendingInvitations')}
                  </h3>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('dialogs.manageTenants.expires')} {formatDate(invitation.expires_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendEmail(invitation)}
                            disabled={resendingEmail === invitation.id}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {resendingEmail === invitation.id ? t('dialogs.manageTenants.resending') : t('dialogs.manageTenants.resend')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancellingInvitation(invitation)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('dialogs.manageTenants.cancel')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Tenant Confirmation */}
      <AlertDialog open={!!removingTenant} onOpenChange={(open) => !open && setRemovingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.manageTenants.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.manageTenants.removeDescription')} {removingTenant && getTenantName(removingTenant)} {t('dialogs.manageTenants.removeDescription')} {propertyTitle}? {t('dialogs.manageTenants.removeMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveTenant}>{t('dialogs.manageTenants.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={(open) => !open && setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.manageTenants.cancelInvitationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.manageTenants.cancelInvitationDesc')} {cancellingInvitation?.email}? {t('dialogs.manageTenants.cancelInvitationMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvitation}>{t('dialogs.manageTenants.cancelInvitation')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
