import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onComplete: (notes: string) => void;
  isLoading?: boolean;
  ticketId?: string;
  propertyId?: string;
}

export const CompleteTaskDialog = ({
  open,
  onOpenChange,
  taskTitle,
  onComplete,
  isLoading = false,
  ticketId,
  propertyId,
}: CompleteTaskDialogProps) => {
  const navigate = useNavigate();
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleComplete = () => {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Please describe the work completed",
        variant: "destructive",
      });
      return;
    }
    onComplete(resolutionNotes.trim());
    
    // Navigate to ticket detail after completion if available
    if (ticketId && propertyId) {
      setTimeout(() => {
        navigate(`/properties/${propertyId}/tickets/${ticketId}`);
      }, 500);
    }
  };

  const handleClose = () => {
    setResolutionNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Maintenance Task</DialogTitle>
          <DialogDescription>
            Please provide notes about the work completed for: {taskTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resolution-notes">Completion Notes *</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe what was done, any issues encountered, parts replaced, etc..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isLoading}>
            {isLoading ? "Completing..." : "Mark as Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
