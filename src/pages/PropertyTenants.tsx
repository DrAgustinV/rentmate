import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { PropertyTenantsDialog } from "@/components/PropertyTenantsDialog";

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [tenantsDialogOpen, setTenantsDialogOpen] = useState(true);

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: propertyData } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId)
        .single();

      return {
        isManager: propertyData?.manager_id === user.id,
      };
    },
    enabled: !!propertyId,
  });

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("properties.notFound")}</p>
        </div>
      </AppLayout>
    );
  }

  const handleDialogClose = () => {
    setTenantsDialogOpen(false);
    navigate("/dashboard");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{t("properties.tenantManagement")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("properties.tenantManagement")}</CardTitle>
            <CardDescription>{t("properties.manageTenantDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setTenantsDialogOpen(true)}>
              {t("properties.openTenantManagement")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {property && userRole && (
        <PropertyTenantsDialog
          open={tenantsDialogOpen}
          onOpenChange={handleDialogClose}
          propertyId={property.id}
          propertyTitle={property.title}
          propertyStatus={property.status}
          propertyAddress={property.address || ""}
          property={property}
          isManager={userRole.isManager}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
          }}
        />
      )}
    </AppLayout>
  );
}
