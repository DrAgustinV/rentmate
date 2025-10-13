import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Trash2, Edit, Mail, Archive, Users, Ticket, Wrench, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InviteTenantDialog } from "./InviteTenantDialog";
import { EditPropertyDialog } from "./EditPropertyDialog";
import { DeletePropertyDialog } from "./DeletePropertyDialog";
import { PropertyTenantsDialog } from "./PropertyTenantsDialog";
import PropertyDocumentsDialog from "./PropertyDocumentsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

export function PropertyCard({ property, isManager, onUpdate }: PropertyCardProps) {
  const { t } = useLanguage();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [tenantCount, setTenantCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isManager) {
      fetchTenantCount();
    }
    fetchTicketCount();
    fetchDocumentCount();
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
        const uniqueTitles = new Set(data.map(d => d.document_title));
        setDocumentCount(uniqueTitles.size);
      }
    } catch (error) {
      console.error("Error fetching document count:", error);
    }
  };

  const statusColor = property.status === "active" ? "bg-success" : "bg-muted";
  const statusText = property.status === "active" ? t('properties.active') : t('properties.inactive');
  const isArchived = property.status === "inactive";

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-gradient-to-br from-card to-secondary/20 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{property.title}</CardTitle>
              {property.address && (
                <CardDescription className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {property.address}
                </CardDescription>
              )}
            </div>
            <Badge variant={property.status === "active" ? "default" : "secondary"} className={statusColor}>
              {statusText}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{property.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(property.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {isArchived && property.deleted_at && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Archive className="h-4 w-4" />
                <span className="font-medium">{t('properties.archivedDetails')}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{t('properties.archivedOn')}: {new Date(property.deleted_at).toLocaleDateString()}</p>
                {property.delete_reason && (
                  <p>{t('properties.reason')}: {property.delete_reason.replace(/_/g, ' ')}</p>
                )}
                {property.modification_reason && (
                  <p className="italic">{t('properties.notes')}: {property.modification_reason}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {property.status === "active" && (
          <CardFooter className="border-t bg-muted/50 pt-4 flex-col gap-2">
            <div className="w-full flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/properties/${property.id}/tickets`)}
                className="flex-1 gap-2"
              >
                <Ticket className="h-4 w-4" />
                {t('properties.tickets')} {ticketCount > 0 && `(${ticketCount})`}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/properties/${property.id}/maintenance`)}
                className="flex-1 gap-2"
              >
                <Wrench className="h-4 w-4" />
                {t('properties.maintenance')}
              </Button>
            </div>
            <div className="w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocumentsOpen(true)}
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                {t('properties.documents')} {documentCount > 0 && `(${documentCount})`}
              </Button>
            </div>
            {isManager && (
              <>
                <div className="w-full flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {t('properties.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="flex-1 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('properties.archive')}
                  </Button>
                </div>
                <div className="w-full flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTenantsOpen(true)}
                    className="flex-1 gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {t('properties.manageTenants')} {tenantCount > 0 && `(${tenantCount})`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInviteOpen(true)}
                    className="flex-1 gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {t('properties.inviteTenant')}
                  </Button>
                </div>
              </>
            )}
          </CardFooter>
        )}
      </Card>

      <InviteTenantDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        propertyId={property.id}
        propertyTitle={property.title}
        onSuccess={onUpdate}
      />

      <EditPropertyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
        onSuccess={() => {
          setEditOpen(false);
          onUpdate();
        }}
      />

      <DeletePropertyDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        property={property}
        onSuccess={() => {
          setDeleteOpen(false);
          onUpdate();
        }}
      />

      <PropertyTenantsDialog
        open={tenantsOpen}
        onOpenChange={setTenantsOpen}
        propertyId={property.id}
        propertyTitle={property.title}
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