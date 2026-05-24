import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Edit, Mail, Archive, Users, Home, Image as ImageIcon, Eye, Ticket, Wrench, Zap, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export interface TenantStatusInfo {
  status: "occupied" | "invited" | "free";
  tenant_name?: string;
  tenant_email?: string;
  pending_invites?: number;
}

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    address?: string | null;
    status: string;
    deletedAt?: string | null;
    createdAt?: string;
    images?: string[] | null;
  };
  isManager: boolean;
  onUpdate: () => void;
  statusIndicators?: PropertyStatusIndicators;
  tenantStatus?: TenantStatusInfo | null;
  isTenantStatusLoading?: boolean;
  photoUrl?: string;
}

export function PropertyCard({ property, isManager, onUpdate, statusIndicators, tenantStatus, isTenantStatusLoading = false, photoUrl }: PropertyCardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

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
                ? "hsl(var(--success))" // Green for occupied
                : "hsl(var(--info))" // Blue for free
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
                  className="w-full h-24 object-cover rounded-t-lg shadow-sm transition-transform duration-300 group-hover/image:scale-[1.02]"
                />
                <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full h-24 rounded-t-lg bg-muted/50 flex items-center justify-center border-b border-dashed border-border transition-colors duration-200 hover:border-primary/50">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{property.title}</CardTitle>
                {property.address && (
                  <CardDescription className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </CardDescription>
                )}
              </div>
              {isTenantStatusLoading ? (
                <Skeleton className="h-5 w-14" />
              ) : (
                <Badge variant={statusBadge.variant} className="text-xs px-2 py-0.5">
                  {statusBadge.text}
                </Badge>
              )}
            </div>

            {/* Tenant Status */}
            {!isEndingTenancy && !isArchived && (
              <div className="mt-1.5 pt-1.5 border-t border-border/50">
                {isTenantStatusLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  tenantStatus && (
                    <>
                      {tenantStatus.status === "occupied" && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-success" />
                          <span className="font-medium text-success truncate">
                            {tenantStatus.tenant_name}
                          </span>
                        </div>
                      )}

                      {tenantStatus.status === "invited" && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3.5 w-3.5 text-warning" />
                          <span className="font-medium text-warning">
                            {tenantStatus.pending_invites} {t("properties.pending")}
                          </span>
                        </div>
                      )}

                      {tenantStatus.status === "free" && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Home className="h-3.5 w-3.5 text-info" />
                          <span className="font-medium text-info">{t("properties.freeToRent")}</span>
                        </div>
                      )}
                    </>
                  )
                )}

                {/* Status Indicators */}
                {isManager && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Zap className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.utility_has_data ? "text-muted-foreground/40" :
                            statusIndicators.utility_overdue ? "text-destructive" : "text-success"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.utilityPayments")}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Ticket className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.tickets_has_data ? "text-muted-foreground/40" :
                            statusIndicators.tickets_open ? "text-warning" : "text-success"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {t("properties.tickets")}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Wrench className={cn(
                            "h-3.5 w-3.5 cursor-help transition-colors",
                            !statusIndicators?.maintenance_has_data ? "text-muted-foreground/40" :
                            statusIndicators.maintenance_overdue ? "text-destructive" : "text-success"
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

        {/* Archived Details Only */}
        {isArchived && property.deletedAt && (
          <CardContent className="p-3 pt-0">
            <div className="pt-1.5 border-t border-border">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Archive className="h-3.5 w-3.5" />
                <span>{formatDate(property.deletedAt)}</span>
              </div>
            </div>
          </CardContent>
        )}

        {/* Tenant Actions */}
        {(property.status === "active" || property.status === "ending_tenancy") && !isManager && (
          <CardFooter className="border-t bg-muted/50 p-2 flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/tickets`);
              }}
              className="w-full gap-1.5 h-8 text-sm"
              aria-label={`${t("properties.myTickets")} ${property.title}`}
            >
              <Ticket className="h-3.5 w-3.5" />
              {t("properties.myTickets")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}/maintenance`);
              }}
              className="w-full gap-1.5 h-8 text-sm"
              aria-label={`${t("properties.maintenance")} ${property.title}`}
            >
              <Wrench className="h-3.5 w-3.5" />
              {t("properties.maintenance")}
            </Button>
          </CardFooter>
        )}

      </Card>
    </>
  );
}
