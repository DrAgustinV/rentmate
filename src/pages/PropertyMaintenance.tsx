import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateMaintenanceTaskDialog } from "@/components/CreateMaintenanceTaskDialog";
import MaintenanceCalendar from "./MaintenanceCalendar";
import TemplatesManager from "./TemplatesManager";
import ScheduledTasks from "./ScheduledTasks";

const PropertyMaintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
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


  if (isLoadingProperty) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-8 w-96 mb-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
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

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="tasks">Maintenance Tasks</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

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
    </div>
  );
};

export default PropertyMaintenance;
