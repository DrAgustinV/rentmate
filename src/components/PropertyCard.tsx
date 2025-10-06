import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Mail } from "lucide-react";
import { useState } from "react";
import { InviteTenantDialog } from "./InviteTenantDialog";

interface PropertyCardProps {
  property: any;
  isManager: boolean;
  onUpdate: () => void;
}

export function PropertyCard({ property, isManager, onUpdate }: PropertyCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const statusColor = property.status === "active" ? "bg-success" : "bg-muted";
  const statusText = property.status === "active" ? "Active" : "Inactive";

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
        </CardContent>

        {isManager && property.status === "active" && (
          <CardFooter className="border-t bg-muted/50 pt-4">
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
    </>
  );
}