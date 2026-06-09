import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService, ticketService } from "@/services";
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
import { useEffect, lazy, Suspense } from "react";
import { RotateCw, FileX } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { ticketStatusColors, ticketPriorityColors } from "@/lib/statusColors";

const StatusManager = lazy(() => 
  import("@/components/ticket/StatusManager").then(m => ({ default: m.StatusManager }))
);

const TicketDetail = () => {
  const { ticketId } = useParams<{ propertyId: string; ticketId: string }>();
  const { t } = useLanguage();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      return ticketService.getTicketDetail(ticketId!);
    },
    enabled: !!ticketId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      return ticketService.getTicketComments(ticketId!);
    },
    enabled: !!ticketId,
  });

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: async () => {
      return ticketService.getTicketAttachments(ticketId!);
    },
    enabled: !!ticketId,
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ["ticket-activities", ticketId],
    queryFn: async () => {
      return ticketService.getTicketActivities(ticketId!);
    },
    enabled: !!ticketId,
  });

  // Get current user and check if manager
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
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
        <EmptyState
          icon={FileX}
          title={t("tickets.ticketNotFound")}
          description={t("tickets.ticketNotFoundDesc")}
          variant="error"
        />
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
                      {t("tickets.scheduledMaintenance")}
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
                  <Badge className={ticketStatusColors[ticket.status as keyof typeof ticketStatusColors] || ""}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <Badge className={ticketPriorityColors[ticket.priority as keyof typeof ticketPriorityColors] || ""}>
                    {ticket.priority}
                  </Badge>
                </div>
                {isManager && (
                  <Suspense fallback={<div className="h-10 w-[300px] bg-muted animate-pulse rounded" />}>
                    <StatusManager
                      ticketId={ticket.id}
                      currentStatus={ticket.status}
                      currentPriority={ticket.priority}
                      isManager={isManager}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{t("tickets.ticketInformation")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("tickets.ticketNumber")}</p>
                  <p className="font-mono">{ticket.ticket_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("tickets.type")}</p>
                  <p className="capitalize">{ticket.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("tickets.created")}</p>
                  <p>{formatDate(ticket.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("tickets.createdBy")}</p>
                  <p>
                    {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">{t("tickets.description")}</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.resolution_notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">{t("tickets.resolutionNotes")}</h3>
                  <p className="text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
                  {ticket.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("tickets.resolvedOn")} {formatDate(ticket.resolved_at)}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>{t("tickets.attachments")}</CardTitle>
            <CardDescription>
              {t("tickets.attachmentsDesc")}
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
            <CardTitle>{t("tickets.comments")}</CardTitle>
            <CardDescription>
              {t("tickets.commentsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommentsList comments={comments} />
            {!["resolved", "cancelled"].includes(ticket.status) && (
              <CommentInput 
                ticketId={ticket.id} 
                isManager={isManager} 
                ticketContext={{
                  title: ticket.title,
                  type: ticket.type,
                  priority: ticket.priority,
                  description: ticket.description,
                  recentComments: comments.map((c: { comment: string }) => ({ comment: c.comment }))
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>{t("tickets.activityTimeline")}</CardTitle>
            <CardDescription>
              {t("tickets.activityTimelineDesc")}
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
