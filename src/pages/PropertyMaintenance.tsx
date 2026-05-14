import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tenantService, authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateMaintenanceTaskDialog } from "@/components/CreateMaintenanceTaskDialog";
import MaintenanceCalendar from "./MaintenanceCalendar";
import TemplatesManager from "./TemplatesManager";
import ScheduledTasks from "./ScheduledTasks";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const PropertyMaintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const { t } = useLanguage();

  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, address")
        .eq("id", propertyId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) return { isManager: false, isTenant: false };
      
      // Check if manager
      const { data: property } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId!)
        .maybeSingle();
      
      const isManager = property?.manager_id === user.id;
      
      // Check if tenant using tenantService
      const tenancies = await tenantService.getTenanciesByProperty(propertyId!);
      const tenantRel = tenancies.find(t => t.tenantId === user.id) || null;
      const isTenant = !!tenantRel;
      
      return { isManager, isTenant };
    },
    enabled: !!propertyId,
  });


  if (isLoadingProperty) {
    return (
      <AppLayout>
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-8 w-96 mb-8" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            {t('maintenance.title')}
          </h1>
          <p className="text-muted-foreground">
            {property?.title} {property?.address ? `- ${property.address}` : ""} - {t('maintenance.manageScheduled')}
          </p>
        </div>
      </div>

      <Tabs defaultValue={userRole?.isManager ? "library" : "scheduled"} className="w-full animate-fade-in">
        <TabsList className={`grid w-full max-w-2xl ${userRole?.isManager ? 'grid-cols-3' : 'grid-cols-2'} transition-all duration-200`}>
          {userRole?.isManager && (
            <TabsTrigger value="library">{t('maintenance.tabs.library') || 'Maintenance Library'}</TabsTrigger>
          )}
          <TabsTrigger value="scheduled">{t('maintenance.tabs.scheduled')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('maintenance.tabs.calendar')}</TabsTrigger>
        </TabsList>

        {userRole?.isManager && (
          <TabsContent value="library" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="default" onClick={() => setCreateTaskOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('maintenance.buttons.createCustomTask') || 'Create Custom Task'}
                </Button>
              </div>
              <TemplatesManager propertyId={propertyId!} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="scheduled" className="mt-6">
          <ScheduledTasks propertyId={propertyId!} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <MaintenanceCalendar />
        </TabsContent>
      </Tabs>

      <CreateMaintenanceTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        propertyId={propertyId!}
      />
    </AppLayout>
  );
};

export default PropertyMaintenance;
