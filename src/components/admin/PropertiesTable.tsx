import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";

export function PropertiesTable() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: properties, isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const managerIds = [...new Set(properties.map(p => p.manager_id))];
      const { data: managers } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", managerIds);

      return properties.map(property => ({
        ...property,
        manager: managers?.find(m => m.id === property.manager_id)
      }));
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">{t('admin.loadingProperties')}</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.propertyTitle')}</TableHead>
            <TableHead>{t('admin.address')}</TableHead>
            <TableHead>{t('admin.manager')}</TableHead>
            <TableHead>{t('admin.status')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties?.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="font-medium">{property.title}</TableCell>
              <TableCell>{property.address || "-"}</TableCell>
              <TableCell>
                {property.manager
                  ? `${property.manager.first_name} ${property.manager.last_name}`
                  : "-"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    property.status === "active"
                      ? "default"
                      : property.status === "inactive"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {property.status}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(property.created_at)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/properties/${property.id}/tickets`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
