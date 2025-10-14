import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

const createInviteSchema = (t: (key: string) => string) => z.object({
  email: z.string().trim().email({ message: t('dialogs.inviteTenant.emailPlaceholder') }),
});

interface InviteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  onSuccess: () => void;
}

export function InviteTenantDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  onSuccess,
}: InviteTenantDialogProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const inviteSchema = createInviteSchema(t);
      const data = inviteSchema.parse({ email });

      // Check if user exists with this email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      // Check if already a tenant
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

      // Check for existing invitation
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

      // Generate token
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

      // Get current user's profile for manager name
      const { data: { user } } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ''} ${managerProfile.last_name || ''}`.trim() || 'Property Manager'
        : 'Property Manager';

      // Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-tenant-invitation', {
          body: {
            email: data.email,
            propertyTitle: propertyTitle,
            propertyAddress: null, // Could be enhanced to include address
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
      onSuccess();
      onOpenChange(false);
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogs.inviteTenant.title')} {propertyTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('dialogs.inviteTenant.sending') : t('dialogs.inviteTenant.send')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}