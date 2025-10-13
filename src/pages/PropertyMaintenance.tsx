import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateMaintenanceTaskDialog } from "@/components/CreateMaintenanceTaskDialog";
import MaintenanceCalendar from "./MaintenanceCalendar";
import TemplatesManager from "./TemplatesManager";
import ScheduledTasks from "./ScheduledTasks";
import { AppLayout } from "@/components/layouts/AppLayout";

const PropertyMaintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isManager: false, isTenant: false };
      
      // Check if manager
      const { data: property } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId!)
        .maybeSingle();
      
      const isManager = property?.manager_id === user.id;
      
      // Check if tenant
      const { data: tenantRel } = await supabase
        .from("property_tenants")
        .select("id")
        .eq("property_id", propertyId!)
        .eq("tenant_id", user.id)
        .maybeSingle();
      
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
            Maintenance
          </h1>
          <p className="text-muted-foreground">
            {property?.title} {property?.address ? `- ${property.address}` : ""} - Manage scheduled maintenance
          </p>
        </div>
      </div>

      <Tabs defaultValue={userRole?.isManager ? "tasks" : "scheduled"} className="w-full">
        <TabsList className={`grid w-full max-w-2xl ${userRole?.isManager ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {userRole?.isManager && (
            <TabsTrigger value="tasks">Maintenance Tasks</TabsTrigger>
          )}
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {userRole?.isManager && (
          <TabsContent value="tasks" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setCreateTaskOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Maintenance Task
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
