import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Trash2, Edit, Mail, Archive } from "lucide-react";
import { useState } from "react";
import { InviteTenantDialog } from "./InviteTenantDialog";
import { EditPropertyDialog } from "./EditPropertyDialog";
import { DeletePropertyDialog } from "./DeletePropertyDialog";

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

export function PropertyCard({ property, isManager, onUpdate }: PropertyCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusColor = property.status === "active" ? "bg-success" : "bg-muted";
  const statusText = property.status === "active" ? "Active" : "Inactive";
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
                <span className="font-medium">Archived Details</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Archived: {new Date(property.deleted_at).toLocaleDateString()}</p>
                {property.delete_reason && (
                  <p>Reason: {property.delete_reason.replace(/_/g, ' ')}</p>
                )}
                {property.modification_reason && (
                  <p className="italic">Notes: {property.modification_reason}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {isManager && property.status === "active" && (
          <CardFooter className="border-t bg-muted/50 pt-4 flex-col gap-2">
            <div className="w-full flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="flex-1 gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="flex-1 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Archive
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="w-full gap-2"
            >
              <Mail className="h-4 w-4" />
              Invite Tenant
            </Button>
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
    </>
  );
}