import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Edit,
  Mail,
  Archive,
  Users,
  Home,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

export function PropertyCard({ property, isManager, onUpdate }: PropertyCardProps) {
  const { t } = useLanguage();
  const [tenantStatus, setTenantStatus] = useState<{
    status: "occupied" | "invited" | "free";
    tenant_name?: string;
    tenant_email?: string;
    pending_invites?: number;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState<"sold" | "no_longer_managing" | "merged_with_other_property" | "other">("sold");
  const [archiveNotes, setArchiveNotes] = useState<string>('');
  const navigate = useNavigate();

  const fetchTenantStatus = async () => {
    try {
      setLoadingStatus(true);
      const { data, error } = await supabase.rpc("get_property_tenant_status", { p_property_id: property.id });

      if (error) throw error;
      if (data && data.length > 0) {
        setTenantStatus(data[0] as any);
      }
    } catch (error) {
      console.error("Error fetching tenant status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchTenantStatus();
  }, [property.id]);

  const archivePropertyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'inactive',
          deleted_at: new Date().toISOString(),
          delete_reason: archiveReason as "sold" | "no_longer_managing" | "merged_with_other_property" | "other",
          modification_reason: archiveNotes || null,
        })
        .eq('id', property.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("properties.propertyArchived"));
      setShowArchiveDialog(false);
      setArchiveReason('sold');
      setArchiveNotes('');
      onUpdate();
    },
    onError: (error) => {
      toast.error(t("properties.archiveFailed"));
      console.error('Archive error:', error);
    },
  });

  const getStatusBadge = () => {
    if (property.status === "active") {
      // For active properties, show tenant status
      if (tenantStatus?.status === "occupied") {
        return {
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600",
          text: t("properties.active"),
        };
      } else {
        // Free or invited
        return {
          variant: "default" as const,
          className: "bg-blue-500 hover:bg-blue-600",
          text: t("properties.free"),
        };
      }
    } else if (property.status === "ending_tenancy") {
      return { variant: "default" as const, className: "bg-orange-500 hover:bg-orange-600", text: t("properties.endingTenancy") };
    } else {
      return { variant: "secondary" as const, className: "", text: t("properties.inactive") };
    }
  };

  const statusBadge = getStatusBadge();
  const isArchived = property.status === "inactive";
  const isEndingTenancy = property.status === "ending_tenancy";

  return (
    <>
      <Card
        className="overflow-hidden hover-lift group animate-fade-in min-h-[420px]"
        style={{
          borderTop: `3px solid ${
            property.status === "active"
              ? tenantStatus?.status === "occupied"
                ? "hsl(142 71% 45%)"  // Green for occupied
                : "hsl(217 91% 60%)"  // Blue for free
              : property.status === "ending_tenancy"
                ? "hsl(var(--warning))"
                : "hsl(var(--muted))"
          }`,
        }}
      >
        <CardHeader className="bg-gradient-to-br from-card to-secondary/20 pb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-start gap-4">
            {/* Property Photo */}
            <div className="flex-shrink-0 relative group/image">
              {property.images?.[0] ? (
                <>
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-24 h-24 rounded-lg object-cover shadow-md border-2 border-border transition-transform duration-300 group-hover/image:scale-105"
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted/50 flex items-center justify-center border-2 border-dashed border-border transition-colors duration-200 hover:border-primary/50">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl mb-2 truncate">{property.title}</CardTitle>
                  {property.address && (
                    <CardDescription className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </CardDescription>
                  )}
                </div>
                {loadingStatus ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <Badge variant={statusBadge.variant} className={statusBadge.className}>
                    {statusBadge.text}
                  </Badge>
                )}
              </div>

              {/* Tenant Status */}
              {!isEndingTenancy && !isArchived && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  {loadingStatus ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    tenantStatus && (
                      <>
                        {tenantStatus.status === "occupied" && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {t("properties.tenant")}: {tenantStatus.tenant_name}
                            </span>
                          </div>
                        )}

                        {tenantStatus.status === "invited" && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-orange-600">
                              {t("properties.invited")} ({tenantStatus.pending_invites} {t("properties.pending")})
                            </span>
                          </div>
                        )}

                        {tenantStatus.status === "free" && (
                          <div className="flex items-center gap-2 text-sm">
                            <Home className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">{t("properties.freeToRent")}</span>
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="min-h-[2.5rem] mb-4">
            {property.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{property.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t("properties.noDescription")}</p>
            )}
          </div>
          {isArchived && property.deleted_at && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Archive className="h-4 w-4" />
                <span className="font-medium">{t("properties.archivedDetails")}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("properties.archivedOn")}: {formatDate(property.deleted_at)}
                </p>
                {property.delete_reason && (
                  <p>
                    {t("properties.reason")}: {property.delete_reason.replace(/_/g, " ")}
                  </p>
                )}
                {property.modification_reason && (
                  <p className="italic">
                    {t("properties.notes")}: {property.modification_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {(property.status === "active" || property.status === "ending_tenancy") && isManager && (
          <CardFooter className="border-t bg-muted/50 pt-4 flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/properties/${property.id}/details`)}
              className="w-full gap-2"
            >
              <Edit className="h-4 w-4" />
              {t("properties.editProperty")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/properties/${property.id}/tenants`)}
              className="w-full gap-2"
            >
              <Users className="h-4 w-4" />
              {!tenantStatus || tenantStatus.status === "free" ? t("properties.inviteTenant") : ""}
              {tenantStatus?.status === "occupied" && `${t("properties.tenants")} (${tenantStatus.tenant_name})`}
              {tenantStatus?.status === "invited" && `${t("properties.pending")} (${tenantStatus.pending_invites})`}
            </Button>
            
            {tenantStatus?.status === 'free' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowArchiveDialog(true)}
                className="w-full gap-2 text-destructive hover:text-destructive"
              >
                <Archive className="h-4 w-4" />
                {t("properties.archiveProperty")}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.archivePropertyTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("properties.archivePropertyDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("properties.archiveReason")}</Label>
              <Select value={archiveReason} onValueChange={(value) => setArchiveReason(value as "sold" | "no_longer_managing" | "merged_with_other_property" | "other")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("properties.selectReason")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sold">{t("properties.archiveReasonSold")}</SelectItem>
                  <SelectItem value="no_longer_managing">{t("properties.archiveReasonNoLongerManaging")}</SelectItem>
                  <SelectItem value="merged_with_other_property">{t("properties.archiveReasonMerged")}</SelectItem>
                  <SelectItem value="other">{t("properties.archiveReasonOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t("properties.archiveNotes")}</Label>
              <Textarea 
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                placeholder={t("properties.archiveNotesPlaceholder")}
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => archivePropertyMutation.mutate()}
              disabled={!archiveReason}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("properties.confirmArchive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
