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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserMinus, Users, Mail, X, Clock, ChevronDown, AlertTriangle, Archive as ArchiveIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type DeleteReason = Database["public"]["Enums"]["delete_reason"];

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
  propertyStatus: "active" | "ending_tenancy" | "inactive";
  propertyAddress: string;
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

const createInviteSchema = (t: (key: string) => string) => z.object({
  email: z.string().trim().email({ message: t('dialogs.inviteTenant.emailPlaceholder') }),
});

export function PropertyTenantsDialog({ 
  open, 
  onOpenChange, 
  propertyId, 
  propertyTitle,
  propertyStatus,
  propertyAddress,
  property,
  isManager,
  onUpdate 
}: PropertyTenantsDialogProps) {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingTenant, setRemovingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  
  // Invite tenant state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Archive/End tenancy state
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [reason, setReason] = useState<DeleteReason | undefined>();
  const [notes, setNotes] = useState("");
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [createNewProperty, setCreateNewProperty] = useState(true);
  
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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      const inviteSchema = createInviteSchema(t);
      const data = inviteSchema.parse({ email });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (profiles) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId)
          .eq("tenant_id", profiles.id)
          .maybeSingle();

        if (existing) {
          throw new Error(t('dialogs.inviteTenant.alreadyTenant'));
        }
      }

      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id")
        .eq("email", data.email)
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        throw new Error(t('dialogs.inviteTenant.alreadyInvited'));
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("invitations").insert({
        token,
        email: data.email,
        property_id: propertyId,
        expires_at: expiresAt.toISOString(),
        invited_user_id: profiles?.id || null,
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ''} ${managerProfile.last_name || ''}`.trim() || 'Property Manager'
        : 'Property Manager';

      try {
        const { error: emailError } = await supabase.functions.invoke('send-tenant-invitation', {
          body: {
            email: data.email,
            propertyTitle: propertyTitle,
            propertyAddress: null,
            managerName,
            token,
            expiresAt: expiresAt.toISOString(),
            language: localStorage.getItem('language') || 'en',
            projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
          },
        });

        if (emailError) {
          console.error('Email send error:', emailError);
          toast({
            title: t('dialogs.inviteTenant.sent'),
            description: t('dialogs.inviteTenant.emailWarning'),
            variant: "default",
          });
        } else {
          toast({
            title: t('dialogs.inviteTenant.sent'),
            description: `${t('dialogs.inviteTenant.sentDesc')} ${data.email}`,
          });
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        toast({
          title: t('dialogs.inviteTenant.sent'),
          description: t('dialogs.inviteTenant.emailWarning'),
          variant: "default",
        });
      }

      setEmail("");
      setInviteOpen(false);
      fetchInvitations();
      onUpdate();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('common.validationError'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLifecycleAction = async () => {
    const isActive = propertyStatus === "active";
    const isEndingTenancy = propertyStatus === "ending_tenancy";

    if (isActive && !reason) {
      toast({
        title: t('common.validationError'),
        description: t('dialogs.archiveProperty.reasonRequired'),
        variant: "destructive",
      });
      return;
    }

    setLifecycleLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isActive) {
        const { data: canEnd, error: validationError } = await supabase.rpc('can_end_tenancy', {
          p_property_id: propertyId,
          p_address: propertyAddress
        });

        if (validationError) throw validationError;
        
        if (!canEnd) {
          toast({
            title: t('common.validationError'),
            description: t('dialogs.archiveProperty.endingTenancyExists'),
            variant: "destructive",
          });
          setLifecycleLoading(false);
          return;
        }

        const { error: updateError } = await supabase
          .from("properties")
          .update({
            status: "ending_tenancy",
            deleted_at: new Date().toISOString(),
            delete_reason: reason,
            modification_reason: notes || null,
            last_modified_by: user.id,
          })
          .eq("id", propertyId);

        if (updateError) throw updateError;

        if (createNewProperty) {
          const { data: canCreate, error: createValidationError } = await supabase.rpc('can_create_active_property', {
            p_address: propertyAddress
          });

          if (createValidationError) throw createValidationError;
          
          if (!canCreate) {
            toast({
              title: t('common.validationError'),
              description: t('dialogs.archiveProperty.activePropertyExists'),
              variant: "destructive",
            });
            setLifecycleLoading(false);
            return;
          }

          const { error: createError } = await supabase
            .from("properties")
            .insert({
              title: property.title,
              address: property.address,
              description: property.description,
              images: property.images || [],
              manager_id: user.id,
              status: "active",
              previous_property_id: propertyId,
            });

          if (createError) throw createError;
        }

        toast({
          title: t('common.success'),
          description: createNewProperty 
            ? t('dialogs.archiveProperty.successWithNew') 
            : t('dialogs.archiveProperty.successEndTenancy'),
        });
      } else if (isEndingTenancy) {
        const { error: archiveError } = await supabase
          .from("properties")
          .update({
            status: "inactive",
            last_modified_by: user.id,
          })
          .eq("id", propertyId);

        if (archiveError) throw archiveError;

        toast({
          title: t('common.success'),
          description: t('dialogs.archiveProperty.successArchive'),
        });
      }

      setReason(undefined);
      setNotes("");
      setCreateNewProperty(true);
      setLifecycleOpen(false);
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLifecycleLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('properties.tenantManagement')}
            </DialogTitle>
            <DialogDescription>{t('dialogs.manageTenants.description')} {propertyTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invite New Tenant Section */}
            {isManager && propertyStatus === "active" && (
              <>
                <Collapsible open={inviteOpen} onOpenChange={setInviteOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('dialogs.manageTenants.inviteNewTenant')}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${inviteOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <form onSubmit={handleInviteSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('dialogs.inviteTenant.emailLabel')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t('dialogs.inviteTenant.emailPlaceholder')}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          {t('dialogs.inviteTenant.helpText')}
                        </p>
                      </div>
                      <Button type="submit" disabled={inviteLoading} className="w-full">
                        {inviteLoading ? t('dialogs.inviteTenant.sending') : t('dialogs.manageTenants.sendInvitation')}
                      </Button>
                    </form>
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
              </>
            )}
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

            {/* Property Lifecycle Section - Manager Only */}
            {isManager && propertyStatus !== "inactive" && (
              <>
                <Separator />
                <Collapsible open={lifecycleOpen} onOpenChange={setLifecycleOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <ArchiveIcon className="h-4 w-4" />
                        {t('dialogs.manageTenants.propertyLifecycle')}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${lifecycleOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="bg-warning/10 border border-warning rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-warning mb-1">
                            {propertyStatus === "active" 
                              ? t('dialogs.archiveProperty.warningTitleEndTenancy') 
                              : t('dialogs.archiveProperty.warningTitleArchive')}
                          </p>
                          <p className="text-muted-foreground">
                            {propertyStatus === "active" 
                              ? t('dialogs.archiveProperty.warningMessageEndTenancy') 
                              : t('dialogs.archiveProperty.warningMessageArchive')}
                          </p>
                        </div>
                      </div>

                      {propertyStatus === "active" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="lifecycle-reason">{t('dialogs.archiveProperty.reasonLabel')}</Label>
                            <Select value={reason} onValueChange={(value) => setReason(value as DeleteReason)}>
                              <SelectTrigger id="lifecycle-reason">
                                <SelectValue placeholder={t('dialogs.archiveProperty.reasonPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sold">{t('dialogs.archiveProperty.reasonSold')}</SelectItem>
                                <SelectItem value="no_longer_managing">{t('dialogs.archiveProperty.reasonNoLonger')}</SelectItem>
                                <SelectItem value="merged_with_other_property">{t('dialogs.archiveProperty.reasonMerged')}</SelectItem>
                                <SelectItem value="other">{t('dialogs.archiveProperty.reasonOther')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="lifecycle-notes">{t('dialogs.archiveProperty.notesLabel')}</Label>
                            <Textarea
                              id="lifecycle-notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder={t('dialogs.archiveProperty.notesPlaceholder')}
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="create-new-lifecycle"
                              checked={createNewProperty}
                              onCheckedChange={(checked) => setCreateNewProperty(checked as boolean)}
                            />
                            <Label
                              htmlFor="create-new-lifecycle"
                              className="text-sm font-normal cursor-pointer"
                            >
                              {t('dialogs.archiveProperty.createNewProperty')}
                            </Label>
                          </div>
                        </>
                      )}

                      <Button
                        variant={propertyStatus === "active" ? "default" : "destructive"}
                        onClick={handleLifecycleAction}
                        disabled={lifecycleLoading}
                        className="w-full"
                      >
                        {lifecycleLoading 
                          ? (propertyStatus === "active" 
                              ? t('dialogs.archiveProperty.endingTenancy') 
                              : t('dialogs.archiveProperty.archiving'))
                          : (propertyStatus === "active" 
                              ? t('properties.endTenancy') 
                              : t('dialogs.archiveProperty.archive'))}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
