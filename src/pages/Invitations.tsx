import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

interface Invitation {
  id: string;
  property_id: string;
  email: string;
  expires_at: string;
  properties: {
    title: string;
    address: string | null;
    description: string | null;
  } | null;
}

export default function Invitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchInvitations();
  };

  const fetchInvitations = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("invitations")
        .select(`
          id,
          property_id,
          email,
          expires_at,
          properties (
            title,
            address,
            description
          )
        `)
        .eq("email", profile.email)
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
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string, propertyId: string) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add user as tenant
      const { error: tenantError } = await supabase
        .from("property_tenants")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
        });

      if (tenantError) throw tenantError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "accepted",
          invited_user_id: user.id,
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      toast({
        title: t('invitations.accepted'),
        description: t('invitations.acceptedDesc'),
      });

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: t('invitations.declined'),
        description: t('invitations.declinedDesc'),
      });

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('invitations.title')}</h1>
        <p className="text-muted-foreground mb-8">
          {t('invitations.description')}
        </p>

        {invitations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">{t('invitations.noPending')}</p>
              <Button
                variant="default"
                className="mt-4"
                onClick={() => navigate("/dashboard")}
              >
                {t('invitations.goToDashboard')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader>
                  <CardTitle>{invitation.properties?.title || t('invitations.property')}</CardTitle>
                  <CardDescription>
                    {invitation.properties?.address || t('invitations.noAddress')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitation.properties?.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {invitation.properties.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('invitations.expires')}: {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAccept(invitation.id, invitation.property_id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('invitations.accept')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('invitations.decline')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
