import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Home, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
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

interface Invitation {
  id: string;
  property_id: string;
  email: string;
  token: string;
  expires_at: string;
  properties: {
    title: string;
    address: string | null;
    description: string | null;
    images: string[] | null;
  } | null;
}

export default function Invitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [autoAcceptInvitation, setAutoAcceptInvitation] = useState<Invitation | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !loading && invitations.length > 0 && !autoAcceptInvitation) {
      const invitation = invitations.find(inv => inv.token === token);
      if (invitation) {
        setAutoAcceptInvitation(invitation);
        // Clear token from sessionStorage after using it
        sessionStorage.removeItem('invitation_token');
      }
    }
  }, [searchParams, loading, invitations]);

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
          token,
          expires_at,
          properties (
            title,
            address,
            description,
            images
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

      // Add user as tenant with active status
      const { error: tenantError } = await supabase
        .from("property_tenants")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
          tenancy_status: 'active',
          started_at: new Date().toISOString(),
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

      // Enforce FIFO tenancy limit (delete oldest inactive if > 5 tenancies)
      await supabase.functions.invoke("manage-tenancy-limit", {
        body: { property_id: propertyId },
      });

      toast({
        title: t('invitations.accepted'),
        description: t('invitations.acceptedDesc'),
      });

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      
      // Redirect to property details
      navigate(`/properties/${propertyId}/details`);
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

  const handleTokenAccept = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t('invitations.loginRequired'),
          description: t('invitations.loginRequiredDesc'),
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Find invitation by token
      const invitation = invitations.find(inv => inv.token === token);

      if (!invitation) {
        toast({
          title: t('common.error'),
          description: t('invitations.notFound'),
          variant: "destructive",
        });
        return;
      }

      await handleAccept(invitation.id, invitation.property_id);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
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
          <div className="space-y-6">
            {invitations.map((invitation) => {
              const propertyImage = invitation.properties?.images?.[0];
              const daysUntilExpiry = Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              return (
                <Card key={invitation.id} className="overflow-hidden">
                  {propertyImage && (
                    <AspectRatio ratio={16 / 9}>
                      <img
                        src={propertyImage}
                        alt={invitation.properties?.title || "Property"}
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-5 w-5 text-primary" />
                          <Badge variant="secondary">You're Invited!</Badge>
                        </div>
                        <CardTitle className="text-2xl">{invitation.properties?.title || t('invitations.property')}</CardTitle>
                        {invitation.properties?.address && (
                          <CardDescription className="flex items-center gap-1 mt-2">
                            <MapPin className="h-4 w-4" />
                            {invitation.properties.address}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {invitation.properties?.description && (
                      <p className="text-sm text-muted-foreground">
                        {invitation.properties.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t('invitations.expires')}: {formatDate(invitation.expires_at)}</span>
                      <Badge variant={daysUntilExpiry <= 3 ? "destructive" : "outline"}>
                        Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="lg"
                        className="flex-1"
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
                        size="lg"
                        variant="ghost"
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
              );
            })}
          </div>
        )}

        {/* Auto-Accept Dialog */}
        <AlertDialog open={!!autoAcceptInvitation} onOpenChange={(open) => !open && setAutoAcceptInvitation(null)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl">Welcome to {autoAcceptInvitation?.properties?.title}!</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                {autoAcceptInvitation?.properties?.images?.[0] && (
                  <AspectRatio ratio={16 / 9} className="mt-4">
                    <img
                      src={autoAcceptInvitation.properties.images[0]}
                      alt={autoAcceptInvitation.properties.title}
                      className="object-cover w-full h-full rounded-md"
                    />
                  </AspectRatio>
                )}
                <div className="space-y-2 text-left pt-4">
                  {autoAcceptInvitation?.properties?.address && (
                    <p className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4" />
                      {autoAcceptInvitation.properties.address}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Accept this invitation to access your property dashboard, submit maintenance requests, and manage your tenancy.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Maybe Later</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (autoAcceptInvitation) {
                    handleAccept(autoAcceptInvitation.id, autoAcceptInvitation.property_id);
                    setAutoAcceptInvitation(null);
                  }
                }}
              >
                Accept & Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
