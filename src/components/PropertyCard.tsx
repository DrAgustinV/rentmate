import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Edit, Mail, Archive, Users, Home, Image as ImageIcon, Eye, Ticket, Wrench, Banknote, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export interface PropertyStatusIndicators {
  property_id: string;
  rent_overdue: boolean;
  rent_has_data: boolean;
  utility_overdue: boolean;
  utility_has_data: boolean;
  tickets_open: boolean;
  tickets_has_data: boolean;
  maintenance_overdue: boolean;
  maintenance_has_data: boolean;
}

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
  statusIndicators?: PropertyStatusIndicators;
}

export function PropertyCard({ property, isManager, onUpdate, statusIndicators }: PropertyCardProps) {
  const { t } = useLanguage();
  const [tenantStatus, setTenantStatus] = useState<{
    status: "occupied" | "invited" | "free";
    tenant_name?: string;
    tenant_email?: string;
    pending_invites?: number;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
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

  // Fetch signed URL for property photo
  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (property.images?.[0]) {
        const { data } = await supabase.storage.from("property-photos").createSignedUrl(property.images[0], 3600);

        if (data) {
          setPhotoUrl(data.signedUrl);
        }
      } else {
        setPhotoUrl(undefined);
      }
    };

    fetchPhotoUrl();
  }, [property.images]);

  const getStatusBadge = () => {
    if (property.status === "active") {
      // For active properties, show tenant status
      if (tenantStatus?.status === "occupied") {
        return {
          variant: "success" as const,
          text: t("properties.active"),
        };
      } else {
        // Free or invited - use brand primary color
        return {
          variant: "default" as const,
          text: t("properties.free"),
        };
      }
    } else if (property.status === "ending_tenancy") {
      return {
        variant: "warning" as const,
        text: t("properties.endingTenancy"),
      };
    } else {
      return { variant: "secondary" as const, text: t("properties.inactive") };
    }
  };

  const statusBadge = getStatusBadge();
  const isArchived = property.status === "inactive";
  const isEndingTenancy = property.status === "ending_tenancy";

  return (
    <>
      <Card
        className="overflow-hidden hover-lift group animate-fade-in min-h-[420px] cursor-pointer transition-all duration-200 hover:shadow-lg"
        onClick={() => navigate(`/properties/${property.id}/tenants`)}
        style={{
          borderTop: `3px solid ${
            property.status === "active"
              ? tenantStatus?.status === "occupied"
                ? "hsl(142 71% 45%)" // Green for occupied
                : "hsl(217 91% 60%)" // Blue for free
              : property.status === "ending_tenancy"
                ? "hsl(var(--warning))"
                : "hsl(var(--muted))"
          }`,
        }}
      >
        <CardHeader className="bg-gradient-to-br from-card to-secondary/20 pb-4 relative p-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Property Photo - Full Width at Top */}
          <div className="relative group/image w-full">
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt={property.title}
                  className="w-full aspect-video object-cover rounded-t-lg shadow-sm transition-transform duration-300 group-hover/image:scale-[1.02]"
                />
                <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full aspect-video rounded-t-lg bg-muted/50 flex items-center justify-center border-b-2 border-dashed border-border transition-colors duration-200 hover:border-primary/50">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Property Details - Below Photo */}
          <div className="p-6 pb-2">
            <div className="flex items-start justify-between gap-2 mb-3">
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
                <Badge variant={statusBadge.variant}>
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

                {/* Status Indicators - Small colored icons (always visible for managers) */}
                {isManager && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2.5 mt-3">
                      {/* Rent */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Banknote className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.rent_has_data ? "text-muted-foreground/40" :
                            statusIndicators.rent_overdue ? "text-red-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.rentPayments")}
                        </TooltipContent>
                      </Tooltip>

                      {/* Utilities */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Zap className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.utility_has_data ? "text-muted-foreground/40" :
                            statusIndicators.utility_overdue ? "text-red-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.utilityPayments")}
                        </TooltipContent>
                      </Tooltip>

                      {/* Tickets */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Ticket className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.tickets_has_data ? "text-muted-foreground/40" :
                            statusIndicators.tickets_open ? "text-yellow-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.tickets")}
                        </TooltipContent>
                      </Tooltip>

                      {/* Maintenance */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Wrench className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.maintenance_has_data ? "text-muted-foreground/40" :
                            statusIndicators.maintenance_overdue ? "text-red-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.scheduledMaintenance")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}
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

        {/* Tenant Actions */}
        {(property.status === "active" || property.status === "ending_tenancy") && !isManager && (
          <CardFooter className="border-t bg-muted/50 pt-4 flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/tickets`);
              }}
              className="w-full gap-2"
              aria-label={`${t("properties.myTickets")} ${property.title}`}
            >
              <Ticket className="h-4 w-4" />
              {t("properties.myTickets")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/maintenance`);
              }}
              className="w-full gap-2"
              aria-label={`${t("properties.maintenance")} ${property.title}`}
            >
              <Wrench className="h-4 w-4" />
              {t("properties.maintenance")}
            </Button>
          </CardFooter>
        )}

        {/* Manager Actions - Invite Tenant */}
        {property.status === "active" && isManager && tenantStatus?.status === "free" && (
          <CardFooter className="border-t bg-primary/5 pt-4">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate({ pathname: `/properties/${property.id}/tenants`, search: '?tab=tenants' });
              }}
              className="w-full gap-2"
              aria-label={`${t("properties.inviteTenant")} ${property.title}`}
            >
              <Mail className="h-4 w-4" />
              {t("properties.inviteTenantButton")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
