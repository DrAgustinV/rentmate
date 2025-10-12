import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar as CalendarIcon, FileText, Wrench, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";
import { CreateRecurringScheduleDialog } from "@/components/CreateRecurringScheduleDialog";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketsList } from "@/components/TicketsList";
import MaintenanceCalendar from "./MaintenanceCalendar";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PropertyMaintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

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
          ticket_templates (id, title),
          resolver:profiles!tickets_resolved_by_fkey (id, first_name, last_name)
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

  const { data: templates } = useQuery({
    queryKey: ["ticket-templates", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("ticket_templates")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("ticket_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules"] });
      toast.success("Template deleted");
      setDeleteTemplateId(null);
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    },
  });

  const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateScheduleOpen(true)}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
          <Button onClick={() => setCreateMaintenanceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Maintenance Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="tasks">Maintenance Tasks</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Maintenance Tasks
                </CardTitle>
                <Button onClick={() => setCreateTemplateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium">{template.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {template.type}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`capitalize ${
                            priorityColors[template.priority as keyof typeof priorityColors]
                          } text-white`}
                        >
                          {template.priority}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTemplateId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {!templates?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    No maintenance tasks yet. Create your first task.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <Card>
            <CardContent>
              <TicketsList
                tickets={recurringTickets?.filter((t) => t.status === "open" || t.status === "in_progress") || []}
                isLoading={isLoadingTickets}
                showRecurringBadge={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardContent>
              <TicketsList
                tickets={recurringTickets?.filter((t) => t.status === "resolved") || []}
                isLoading={isLoadingTickets}
                showRecurringBadge={true}
              />
            </CardContent>
          </Card>
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

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This will also delete any recurring
              schedules associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PropertyMaintenance;
