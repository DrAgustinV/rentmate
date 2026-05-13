import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Ticket } from "lucide-react";
import { OccupancyBadge, PaymentBadge, TicketCount } from "@/components/ui/status-badges";
import { ImageIcon } from "lucide-react";

interface PropertyDashboardCardProps {
  property: {
    id: string;
    title: string;
    address?: string;
    city?: string;
    images?: string[];
  };
  dashboard: {
    occupancy_status: string;
    tenant_name: string | null;
    payment_status: string;
    open_tickets_count: number;
  } | undefined;
  photoUrl?: string;
}

export function PropertyDashboardCard({ property, dashboard, photoUrl }: PropertyDashboardCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden cursor-pointer" onClick={() => navigate(`/properties/${property.id}/overview`)}>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={property.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{property.title}</CardTitle>
            {(property.address || property.city) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{property.address}{property.city ? `, ${property.city}` : ''}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Occupancy:</span>
            <div onClick={(e) => { e.stopPropagation(); navigate(`/properties/${property.id}/tenants?tab=contracts`); }}>
              <OccupancyBadge status={(dashboard?.occupancy_status as any) || 'Vacant'} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Tickets:</span>
            <TicketCount count={dashboard?.open_tickets_count || 0} />
          </div>
        </div>
        
        {dashboard?.tenant_name && (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{dashboard.tenant_name}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <PaymentBadge status={(dashboard?.payment_status as any) || 'Due'} />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/properties/${property.id}/tenants?tab=contracts`);
            }}
          >
            Contracts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}