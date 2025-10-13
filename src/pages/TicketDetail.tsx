import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { CommentsList } from "@/components/ticket/CommentsList";
import { CommentInput } from "@/components/ticket/CommentInput";
import { AttachmentGallery } from "@/components/ticket/AttachmentGallery";
import { AttachmentUpload } from "@/components/ticket/AttachmentUpload";
import { ActivityTimeline } from "@/components/ticket/ActivityTimeline";
import { StatusManager } from "@/components/ticket/StatusManager";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";

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
  const { ticketId } = useParams<{ propertyId: string; ticketId: string }>();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          properties (id, title, address, manager_id),
          profiles!tickets_created_by_fkey (id, first_name, last_name, email),
          ticket_templates (title, description)
        `)
        .eq("id", ticketId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select(`
          *,
          profiles (first_name, last_name, email)
        `)
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select(`
          *,
          profiles (first_name, last_name)
        `)
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ["ticket-activities", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_activities")
        .select(`
          *,
          profiles (first_name, last_name)
        `)
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Get current user and check if manager
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const isManager = ticket?.properties?.manager_id === currentUser?.id;
  const canDelete = currentUser?.id === ticket?.created_by && 
    !["resolved", "cancelled"].includes(ticket?.status);

  // Real-time subscription for comments
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          // Refetch comments when new one is added
          supabase
            .from("ticket_comments")
            .select(`*, profiles (first_name, last_name, email)`)
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true })
            .then(({ data }) => {
              if (data) {
                // Update query cache
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  if (isLoading) {
    return (
      <AppLayout>
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Ticket not found</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid gap-6 animate-fade-in">
        <Card className="hover-lift">
          <CardHeader className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent rounded-t-lg" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                  {ticket.source_template_id && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <RotateCw className="h-3 w-3" />
                      Scheduled Maintenance
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {ticket.properties?.title}
                  {ticket.properties?.address && ` - ${ticket.properties.address}`}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                    {ticket.priority}
                  </Badge>
                </div>
                <StatusManager
                  ticketId={ticket.id}
                  currentStatus={ticket.status}
                  currentPriority={ticket.priority}
                  isManager={isManager}
                />
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
                  <p>{formatDate(ticket.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p>
                    {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.resolution_notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Resolution Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
                  {ticket.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolved on {formatDate(ticket.resolved_at)}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              Photos and videos related to this ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AttachmentGallery
              attachments={attachments}
              ticketId={ticket.id}
              canDelete={canDelete}
            />
            {!["resolved", "cancelled"].includes(ticket.status) && (
              <>
                <Separator />
                <AttachmentUpload ticketId={ticket.id} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>
              Discuss this ticket with your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommentsList comments={comments} />
            {!["resolved", "cancelled"].includes(ticket.status) && (
              <CommentInput ticketId={ticket.id} isManager={isManager} />
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Track all changes and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TicketDetail;
