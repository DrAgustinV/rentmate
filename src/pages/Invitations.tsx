import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { TENANT_PROPERTIES_QUERY_KEY } from '@/hooks/useTenantProperties';
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
  const queryClient = useQueryClient();

  const [invitationPreview, setInvitationPreview] = useState<Invitation | null>(null);
  const [showDecisionPage, setShowDecisionPage] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

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
    
    // Get token from URL search params
    const token = searchParams.get('token');
    
    console.log('[Invitations] checkAuth - session:', !!session, 'token:', token);
    
    if (!session) {
      // If not logged in and has token, detect account and redirect
      if (token) {
        console.log('[Invitations] Anonymous user with token, fetching invitation...');
        
        // For anonymous users, fetch ONLY invitation data (no properties join)
        // Properties table RLS blocks anonymous access, so we skip the join
        const { data: invitation, error: invitationError } = await supabase
          .from("invitations")
          .select("id, property_id, email, token, expires_at")
          .eq("token", token)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .single();
        
        console.log('[Invitations] Invitation fetch result:', { invitation, error: invitationError });
        
        if (!invitation || invitationError) {
          console.log('[Invitations] Invitation not found, redirecting to /auth');
          toast({
            title: "Invitation Not Found",
            description: "This invitation may have expired or been used already.",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        // Check if email has an existing account using SECURITY DEFINER function
        const { data: hasAccount, error: rpcError } = await supabase
          .rpc('check_email_has_account', { check_email: invitation.email });

        console.log('[Invitations] check_email_has_account result:', { email: invitation.email, hasAccount, rpcError });

        // Determine mode based on whether user exists
        const mode = hasAccount ? 'signin' : 'signup';
        
        console.log('[Invitations] Redirecting to /auth with mode:', mode);
        // Redirect to auth with appropriate mode and detection flag
        navigate(`/auth?mode=${mode}&token=${token}&detected=true`);
        return;
      } else {
        console.log('[Invitations] No token, redirecting to /auth');
        navigate("/auth");
      }
      return;
    }
    
    // If logged in, proceed to fetch invitations
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
      
      // Fetch signed URLs for all property images
      if (data && data.length > 0) {
        const urlMap: Record<string, string> = {};
        
        await Promise.all(
          data.map(async (inv) => {
            const storagePath = inv.properties?.images?.[0];
            if (storagePath) {
              const { data: signedData } = await supabase.storage
                .from('property-photos')
                .createSignedUrl(storagePath, 3600);
              
              if (signedData) {
                urlMap[inv.id] = signedData.signedUrl;
              }
            }
          })
        );
        
        setPhotoUrls(urlMap);
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

  const handleAccept = async (invitationId: string, propertyId: string) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's profile for email
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      // Mark email as verified - clicking invitation link proves email ownership
      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);

      // Add user as tenant with active status
      const { data: newTenancy, error: tenantError } = await supabase
        .from("property_tenants")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
          tenancy_status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

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

      // Find matching tenancy_requirements for this invitation
      const { data: requirements } = await supabase
        .from("tenancy_requirements")
        .select("*")
        .eq("property_id", propertyId)
        .eq("tenant_email", userProfile?.email || '')
        .in("status", ["sent", "draft"])
        .maybeSingle();

      if (requirements && newTenancy) {
        // Get property manager_id for rent_agreement
        const { data: propertyData } = await supabase
          .from("properties")
          .select("manager_id")
          .eq("id", propertyId)
          .single();

        // Create rent_agreement from requirements if rent data exists
        if (requirements.rent_amount_cents && propertyData?.manager_id) {
          await supabase.from("rent_agreements").insert({
            property_id: propertyId,
            tenancy_id: newTenancy.id,
            manager_id: propertyData.manager_id,
            tenant_id: user.id,
            rent_amount_cents: requirements.rent_amount_cents,
            currency: requirements.currency || 'EUR',
            security_deposit_cents: requirements.security_deposit_cents,
            payment_day: requirements.payment_day || 1,
            start_date: requirements.start_date,
            end_date: requirements.end_date,
          });
        }

        // Update tenancy_requirements to link to tenancy and mark as accepted
        await supabase
          .from("tenancy_requirements")
          .update({ 
            tenancy_id: newTenancy.id,
            status: 'accepted' 
          })
          .eq("id", requirements.id);
      }

      // Enforce FIFO tenancy limit (delete oldest inactive if > 5 tenancies)
      await supabase.functions.invoke("manage-tenancy-limit", {
        body: { property_id: propertyId },
      });

      // Invalidate tenant properties cache to refresh the list
      await queryClient.invalidateQueries({ 
        queryKey: [TENANT_PROPERTIES_QUERY_KEY] 
      });

      toast({
        title: t('invitations.accepted'),
        description: t('invitations.acceptedDesc'),
      });

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      
      // Redirect to property hub
      navigate(`/properties/${propertyId}/tenants`);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to accept invitation. Please try again.',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setAutoAcceptInvitation(null);
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

  // Decision page for unauthenticated users with invitation token
  if (showDecisionPage && invitationPreview) {
    const propertyImageUrl = photoUrls[invitationPreview.id];
    const token = searchParams.get('token');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl overflow-hidden">
          {propertyImageUrl && (
            <AspectRatio ratio={16 / 9}>
              <img
                src={propertyImageUrl}
                alt={invitationPreview.properties?.title || "Property"}
                className="object-cover w-full h-full"
              />
            </AspectRatio>
          )}
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Home className="h-5 w-5 mr-2" />
                You're Invited!
              </Badge>
            </div>
            <CardTitle>{invitationPreview.properties?.title}</CardTitle>
            {invitationPreview.properties?.address && (
              <CardDescription className="flex items-center justify-center gap-2 text-base mt-2">
                <MapPin className="h-4 w-4" />
                {invitationPreview.properties.address}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {invitationPreview.properties?.description && (
              <p className="text-center text-muted-foreground">
                {invitationPreview.properties.description}
              </p>
            )}
            
            <div className="bg-muted/50 rounded-lg p-6 text-center space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Do you already have an account?</h3>
              <p className="text-sm text-muted-foreground">
                Choose how you'd like to proceed with this invitation
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => navigate(`/auth?mode=signin&token=${token}`)}
                >
                  <div className="text-base font-semibold">Yes, I have an account</div>
                  <div className="text-xs text-muted-foreground font-normal">Sign in to accept</div>
                </Button>
                
                <Button
                  size="lg"
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => navigate(`/auth?mode=signup&token=${token}`)}
                >
                  <div className="text-base font-semibold">No, I'm new here</div>
                  <div className="text-xs text-muted-foreground font-normal">Create account to accept</div>
                </Button>
              </div>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              Invitation expires: {formatDate(invitationPreview.expires_at)}
            </div>
          </CardContent>
        </Card>
      </div>
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
              const propertyImageUrl = photoUrls[invitation.id];
              const daysUntilExpiry = Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              return (
                <Card key={invitation.id} className="overflow-hidden">
                  {propertyImageUrl && (
                    <AspectRatio ratio={16 / 9}>
                      <img
                        src={propertyImageUrl}
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
                        <CardTitle>{invitation.properties?.title || t('invitations.property')}</CardTitle>
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
              <AlertDialogTitle className="text-2xl">Welcome to {autoAcceptInvitation?.properties?.title || "your new property"}!</AlertDialogTitle>
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
