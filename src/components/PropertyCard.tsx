import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Trash2,
  Edit,
  Mail,
  Archive,
  Users,
  Ticket,
  Wrench,
  FileText,
  Home,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EditPropertyDialog } from "./EditPropertyDialog";
import { PropertyTenantsDialog } from "./PropertyTenantsDialog";
import PropertyDocumentsDialog from "./PropertyDocumentsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

export function PropertyCard({ property, isManager, onUpdate }: PropertyCardProps) {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [tenantCount, setTenantCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [tenantStatus, setTenantStatus] = useState<{
    status: "occupied" | "invited" | "free";
    tenant_name?: string;
    tenant_email?: string;
    pending_invites?: number;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
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
    if (isManager) {
      fetchTenantCount();
    }
    fetchTicketCount();
    fetchDocumentCount();
    fetchTenantStatus();
  }, [property.id, isManager]);

  const fetchTenantCount = async () => {
    try {
      const { count, error } = await supabase
        .from("property_tenants")
        .select("*", { count: "exact", head: true })
        .eq("property_id", property.id);

      if (error) throw error;
      setTenantCount(count || 0);
    } catch (error) {
      console.error("Error fetching tenant count:", error);
    }
  };

  const fetchTicketCount = async () => {
    try {
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("property_id", property.id)
        .in("status", ["open", "in_progress"]);

      if (error) throw error;
      setTicketCount(count || 0);
    } catch (error) {
      console.error("Error fetching ticket count:", error);
    }
  };

  const fetchDocumentCount = async () => {
    try {
      const { data, error } = await supabase
        .from("property_documents")
        .select("document_title", { count: "exact", head: false })
        .eq("property_id", property.id)
        .eq("is_latest_version", true);

      if (error) throw error;
      if (data) {
        const uniqueTitles = new Set(data.map((d) => d.document_title));
        setDocumentCount(uniqueTitles.size);
      }
    } catch (error) {
      console.error("Error fetching document count:", error);
    }
  };

  const getStatusBadge = () => {
    if (property.status === "active") {
      return {
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600",
        text: t("properties.active"),
      };
    } else if (property.status === "ending_tenancy") {
      return { variant: "default" as const, className: "bg-orange-500 hover:bg-orange-600", text: "Ending Tenancy" };
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
              ? "hsl(var(--success))"
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
                <Badge variant={statusBadge.variant} className={statusBadge.className}>
                  {statusBadge.text}
                </Badge>
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
          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{property.description}</p>
          )}
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

        {(property.status === "active" || property.status === "ending_tenancy") && (
          <CardFooter className="border-t bg-muted/50 pt-4 flex-col gap-2">
            {isManager && (
              <div className="w-full flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1 gap-2">
                  <Edit className="h-4 w-4" />
                  {t("properties.edit")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTenantsOpen(true)} className="flex-1 gap-2">
                  <Users className="h-4 w-4" />
                  {t("properties.manageTenants")}
                </Button>
              </div>
            )}
            <div className="w-full flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/properties/${property.id}/tickets`)}
                className="flex-1 gap-2"
              >
                <Ticket className="h-4 w-4" />
                {t("properties.tickets")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/properties/${property.id}/maintenance`)}
                className="flex-1 gap-2"
              >
                <Wrench className="h-4 w-4" />
                {t("properties.maintenance")}
              </Button>
            </div>
            <div className="w-full">
              <Button variant="outline" size="sm" onClick={() => setDocumentsOpen(true)} className="w-full gap-2">
                <FileText className="h-4 w-4" />
                {t("properties.documents")}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <EditPropertyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
        onSuccess={() => {
          setEditOpen(false);
          onUpdate();
        }}
      />

      <PropertyTenantsDialog
        open={tenantsOpen}
        onOpenChange={setTenantsOpen}
        propertyId={property.id}
        propertyTitle={property.title}
        propertyStatus={property.status}
        propertyAddress={property.address}
        property={property}
        isManager={isManager}
        onUpdate={onUpdate}
      />

      <PropertyDocumentsDialog
        open={documentsOpen}
        onOpenChange={setDocumentsOpen}
        propertyId={property.id}
        isManager={isManager}
      />
    </>
  );
}
