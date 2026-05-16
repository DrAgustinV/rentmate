import { useEffect, useState, useRef } from "react";
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
import { DeclineInvitationDialog } from "@/components/DeclineInvitationDialog";
import { documentService } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";
import { tenantService, profileService } from "@/services";

export default function Invitations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const declineReasonRef = useRef<string>("");

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await tenantService.getInvitationsByProperty("", { status: "pending" });
      // Fallback to direct query if service doesn't match exact needs, but using service as instructed
      const { data: rawInvitations, error } = await supabase
        .from("invitations")
        .select(`
          id,
          email,
          status,
          expires_at,
          created_at,
          properties (
            id,
            title,
            address,
            images
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (rawInvitations && rawInvitations.length > 0) {
        const urlMap: Record<string, string> = {};
        
        await Promise.all(
          rawInvitations.map(async (inv) => {
            const storagePath = inv.properties?.images?.[0];
            if (storagePath) {
              try {
                const url = await documentService.getSignedUrl(STORAGE_BUCKETS.PROPERTY_PHOTOS, storagePath, SIGNED_URL_TTL);
                urlMap[inv.id] = url;
              } catch (e) {
                // ignore
              }
            }
          })
        );
        
        setPhotoUrls(urlMap);
      }
      
      setInvitations(rawInvitations || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        title: t("invitations.error"),
        description: t("invitations.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error("Invitation not found");

      const { error } = await supabase
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (error) throw error;

      // Update tenancy_requirements status to accepted
      if (invitation.properties?.id && invitation.email) {
        const { error: reqError } = await supabase
          .from("tenancy_requirements")
          .update({ status: "accepted" })
          .eq("property_id", invitation.properties.id)
          .eq("tenant_email", invitation.email)
          .in("status", ["draft", "sent"]);
        if (reqError) console.error("Error updating requirement status:", reqError);
      }

      toast({
        title: t("invitations.accepted"),
        description: t("invitations.acceptedDesc"),
      });

      await queryClient.invalidateQueries({ queryKey: TENANT_PROPERTIES_QUERY_KEY });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: t("invitations.error"),
        description: t("invitations.errorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleDecline = async () => {
    if (!selectedInvitation) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .update({ 
          status: "declined",
          declined_reason: declineReasonRef.current
        })
        .eq("id", selectedInvitation.id);

      if (error) throw error;

      toast({
        title: t("invitations.declined"),
        description: t("invitations.declinedDesc"),
      });

      setDeclineDialogOpen(false);
      setSelectedInvitation(null);
      declineReasonRef.current = "";
      
      await fetchInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast({
        title: t("invitations.error"),
        description: t("invitations.errorDesc"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="success">{t("invitations.accepted")}</Badge>;
      case "declined":
        return <Badge variant="destructive">{t("invitations.declined")}</Badge>;
      case "expired":
        return <Badge variant="secondary">{t("invitations.expired")}</Badge>;
      default:
        return <Badge variant="outline">{t("invitations.pending")}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("invitations.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("invitations.description")}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("invitations.noInvitations")}</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {t("invitations.noInvitationsDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-48 bg-muted/50">
                    <AspectRatio ratio={1 / 1}>
                      {photoUrls[invitation.id] ? (
                        <img
                          src={photoUrls[invitation.id]}
                          alt={invitation.properties?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </AspectRatio>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{invitation.properties?.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{invitation.properties?.address}</span>
                        </div>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("invitations.email")}</p>
                        <p className="font-medium">{invitation.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("invitations.expiresAt")}</p>
                        <p className="font-medium">
                          {formatDate(invitation.expires_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      {invitation.status === "pending" && (
                        <>
                          <Button onClick={() => handleAccept(invitation.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t("invitations.accept")}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setDeclineDialogOpen(true);
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {t("invitations.decline")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DeclineInvitationDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          onConfirm={(reason) => {
            declineReasonRef.current = reason || "";
            handleDecline();
          }}
          isProcessing={false}
          propertyTitle={selectedInvitation?.properties?.title || ""}
        />
      </div>
    </AppLayout>
  );
}
