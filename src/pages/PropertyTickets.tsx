import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { propertyService, ticketService } from "@/services";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketsList } from "@/components/TicketsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layouts/AppLayout";

const PropertyTickets = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setCreateDialogOpen(true);
      searchParams.delete("create");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      return propertyService.getPropertyBasicInfo(propertyId!);
    },
    enabled: !!propertyId,
  });

  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["property-tickets", propertyId],
    queryFn: async () => {
      return ticketService.getPropertyTickets(propertyId!);
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
          <h1 className="text-3xl font-bold">{property?.title}</h1>
          <p className="text-muted-foreground">
            {property?.address ? `${property.address} - ` : ""}Manage tickets and requests
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TicketsList tickets={tickets || []} isLoading={isLoadingTickets} showRecurringBadge />
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "open") || []}
            isLoading={isLoadingTickets}
            showRecurringBadge
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "in_progress") || []}
            isLoading={isLoadingTickets}
            showRecurringBadge
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "resolved") || []}
            isLoading={isLoadingTickets}
            showRecurringBadge
          />
        </TabsContent>
      </Tabs>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        propertyId={propertyId}
        onSuccess={() => {}}
      />
    </AppLayout>
  );
};

export default PropertyTickets;
