import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusColors = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  resolved: "bg-green-500",
  cancelled: "bg-gray-500",
};

const priorityColors = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const TicketDetail = () => {
  const { propertyId, ticketId } = useParams<{ propertyId: string; ticketId: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          properties (id, title, address),
          profiles!tickets_created_by_fkey (id, first_name, last_name, email)
        `)
        .eq("id", ticketId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(`/properties/${propertyId}/tickets`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tickets
      </Button>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <CardDescription className="mt-2">
                  {ticket.properties?.title}
                  {ticket.properties?.address && ` - ${ticket.properties.address}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {ticket.status.replace("_", " ")}
                </Badge>
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Ticket Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ticket Number</p>
                  <p className="font-mono">{ticket.ticket_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="capitalize">{ticket.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(ticket.created_at), "PPP")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p>
                    {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.resolution_notes && (
              <div>
                <h3 className="font-semibold mb-2">Resolution Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
                {ticket.resolved_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved on {format(new Date(ticket.resolved_at), "PPP")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments & Activity</CardTitle>
            <CardDescription>
              View ticket history and add comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Comments and activity timeline coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              Photos and videos related to this ticket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              File attachments coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetail;
