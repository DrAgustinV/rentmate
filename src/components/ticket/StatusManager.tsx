import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TicketStatus = "open" | "in_progress" | "resolved" | "cancelled";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface StatusManagerProps {
  ticketId: string;
  currentStatus: TicketStatus;
  currentPriority: TicketPriority;
  isManager: boolean;
}

export const StatusManager = ({
  ticketId,
  currentStatus,
  currentPriority,
  isManager,
}: StatusManagerProps) => {
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status?: TicketStatus; priority?: TicketPriority; resolution_notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: any = {};
      if (data.status) updates.status = data.status;
      if (data.priority) updates.priority = data.priority;
      if (data.status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.id;
        updates.resolution_notes = data.resolution_notes;
      }

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Record activity
      if (data.status && data.status !== currentStatus) {
        await supabase.from("ticket_activities").insert({
          ticket_id: ticketId,
          user_id: user.id,
          activity_type: "status_change",
          old_value: { status: currentStatus },
          new_value: { status: data.status },
        });
      }

      if (data.priority && data.priority !== currentPriority) {
        await supabase.from("ticket_activities").insert({
          ticket_id: ticketId,
          user_id: user.id,
          activity_type: "priority_change",
          old_value: { priority: currentPriority },
          new_value: { priority: data.priority },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", ticketId] });
      toast({ title: "Ticket updated successfully" });
      setShowResolutionDialog(false);
      setResolutionNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
      console.error("Error updating ticket:", error);
    },
  });

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (newStatus === "resolved") {
      setShowResolutionDialog(true);
    } else {
      updateStatusMutation.mutate({ status: newStatus });
    }
  };

  const handlePriorityChange = (newPriority: TicketPriority) => {
    updateStatusMutation.mutate({ priority: newPriority });
  };

  const handleResolveWithNotes = () => {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Resolution notes required",
        description: "Please provide notes about how this ticket was resolved",
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate({
      status: "resolved",
      resolution_notes: resolutionNotes.trim(),
    });
  };

  if (!isManager) return null;

  return (
    <>
      <div className="flex gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={currentPriority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Please provide notes about how this ticket was resolved
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Resolution Notes *</Label>
              <Textarea
                id="resolution-notes"
                placeholder="Describe how the issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolutionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveWithNotes}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
