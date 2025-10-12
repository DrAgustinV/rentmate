import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar as CalendarIcon, FileText, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";
import { CreateRecurringScheduleDialog } from "@/components/CreateRecurringScheduleDialog";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketsList } from "@/components/TicketsList";
import MaintenanceCalendar from "./MaintenanceCalendar";
import TemplatesManager from "./TemplatesManager";

const PropertyMaintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);

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

  const { data: recurringTickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["recurring-tickets", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          properties (id, title),
          profiles!tickets_created_by_fkey (id, first_name, last_name, email),
          ticket_templates (id, title)
        `,
        )
        .eq("property_id", propertyId!)
        .not("source_template_id", "is", null)
        .order("created_at", { ascending: false });

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
        {/* <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateScheduleOpen(true)}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
          <Button onClick={() => setCreateMaintenanceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Maintenance
          </Button>
        </div> */}
      </div>

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="mt-6">
          <Card>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <TicketsList
                    tickets={recurringTickets || []}
                    isLoading={isLoadingTickets}
                    showRecurringBadge={true}
                  />
                </TabsContent>

                <TabsContent value="active">
                  <TicketsList
                    tickets={recurringTickets?.filter((t) => t.status === "open" || t.status === "in_progress") || []}
                    isLoading={isLoadingTickets}
                    showRecurringBadge={true}
                  />
                </TabsContent>

                <TabsContent value="resolved">
                  <TicketsList
                    tickets={recurringTickets?.filter((t) => t.status === "resolved") || []}
                    isLoading={isLoadingTickets}
                    showRecurringBadge={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Maintenance Templates
              </h2>
              <Button onClick={() => setCreateTemplateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
            <TemplatesManager />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <MaintenanceCalendar />
        </TabsContent>
      </Tabs>

      <CreateTemplateDialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen} propertyId={propertyId!} />

      <CreateRecurringScheduleDialog
        open={createScheduleOpen}
        onOpenChange={setCreateScheduleOpen}
        propertyId={propertyId!}
      />

      <CreateTicketDialog
        open={createMaintenanceOpen}
        onOpenChange={setCreateMaintenanceOpen}
        propertyId={propertyId}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default PropertyMaintenance;
