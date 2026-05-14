import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Edit, Mail, Archive, Users, Home, Image as ImageIcon, Eye, Ticket, Wrench, Zap, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { propertyService, documentService } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";

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
      const status = await propertyService.getPropertyTenantStatus(property.id);
      if (status) {
        setTenantStatus(status as any);
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
        try {
          const url = await documentService.getSignedUrl(STORAGE_BUCKETS.PROPERTY_PHOTOS, property.images[0], SIGNED_URL_TTL);
          setPhotoUrl(url);
        } catch (e) {
          // ignore
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
          text: t("properties.status.active"),
        };
      } else {
        // Free or invited - use brand primary color
        return {
          variant: "default" as const,
          text: t("properties.occupancy.free"),
        };
      }
    } else if (property.status === "ending_tenancy") {
      return {
        variant: "warning" as const,
        text: t("properties.status.ending_tenancy"),
      };
    } else {
      return { variant: "secondary" as const, text: t("properties.status.archived") };
    }
  };

  const statusBadge = getStatusBadge();
  const isArchived = property.status === "inactive";
  const isEndingTenancy = property.status === "ending_tenancy";

  return (
    <>
      <Card
        className="overflow-hidden hover-lift group animate-fade-in cursor-pointer transition-all duration-200 hover:shadow-lg"
        onClick={() => navigate(`/properties/${property.id}/tenants`)}
        style={{
          borderTop: `2px solid ${
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
        <CardHeader className="bg-gradient-to-br from-card to-secondary/20 pb-2 relative p-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Property Photo - Compact */}
          <div className="relative group/image w-full">
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt={property.title}
                  className="w-full h-20 object-cover rounded-t-lg shadow-sm transition-transform duration-300 group-hover/image:scale-[1.02]"
                />
                <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full h-20 rounded-t-lg bg-muted/50 flex items-center justify-center border-b border-dashed border-border transition-colors duration-200 hover:border-primary/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Property Details - Compact */}
          <div className="p-2">
            <div className="flex items-start justify-between gap-1 mb-1">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm truncate">{property.title}</CardTitle>
                {property.address && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </CardDescription>
                )}
              </div>
              {loadingStatus ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <Badge variant={statusBadge.variant} className="text-[10px] px-1.5 py-0">
                  {statusBadge.text}
                </Badge>
              )}
            </div>

            {/* Tenant Status - Compact */}
            {!isEndingTenancy && !isArchived && (
              <div className="mt-1 pt-1 border-t border-border/50">
                {loadingStatus ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  tenantStatus && (
                    <>
                      {tenantStatus.status === "occupied" && (
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-600 truncate">
                            {tenantStatus.tenant_name}
                          </span>
                        </div>
                      )}

                      {tenantStatus.status === "invited" && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3 text-orange-600" />
                          <span className="font-medium text-orange-600">
                            {tenantStatus.pending_invites} {t("properties.pending")}
                          </span>
                        </div>
                      )}

                      {tenantStatus.status === "free" && (
                        <div className="flex items-center gap-1 text-xs">
                          <Home className="h-3 w-3 text-blue-600" />
                          <span className="font-medium text-blue-600">{t("properties.freeToRent")}</span>
                        </div>
                      )}
                    </>
                  )
                )}

                {/* Status Indicators - Compact */}
                {isManager && (
                  <TooltipProvider>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Zap className={cn(
                            "h-3 w-3 cursor-help transition-colors",
                            !statusIndicators?.utility_has_data ? "text-muted-foreground/40" :
                            statusIndicators.utility_overdue ? "text-red-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.utilityPayments")}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Ticket className={cn(
                            "h-3 w-3 cursor-help transition-colors",
                            !statusIndicators?.tickets_has_data ? "text-muted-foreground/40" :
                            statusIndicators.tickets_open ? "text-yellow-500" : "text-green-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.tickets")}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Wrench className={cn(
                            "h-3 w-3 cursor-help transition-colors",
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

        {/* Archived Details Only - No Description */}
        {isArchived && property.deletedAt && (
          <CardContent className="p-2 pt-0">
            <div className="pt-1 border-t border-border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Archive className="h-3 w-3" />
                <span>{formatDate(property.deletedAt)}</span>
              </div>
            </div>
          </CardContent>
        )}

        {/* Tenant Actions - Compact */}
        {(property.status === "active" || property.status === "ending_tenancy") && !isManager && (
          <CardFooter className="border-t bg-muted/50 p-1.5 flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/tickets`);
              }}
              className="w-full gap-1 h-7 text-xs"
              aria-label={`${t("properties.myTickets")} ${property.title}`}
            >
              <Ticket className="h-3 w-3" />
              {t("properties.myTickets")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/maintenance`);
              }}
              className="w-full gap-1 h-7 text-xs"
              aria-label={`${t("properties.maintenance")} ${property.title}`}
            >
              <Wrench className="h-3 w-3" />
              {t("properties.maintenance")}
            </Button>
          </CardFooter>
        )}

      </Card>
    </>
  );
}
