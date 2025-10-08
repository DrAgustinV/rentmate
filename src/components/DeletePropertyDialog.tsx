import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DeleteReason = Database["public"]["Enums"]["delete_reason"];

interface DeletePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  onSuccess: () => void;
}

export function DeletePropertyDialog({ open, onOpenChange, property, onSuccess }: DeletePropertyDialogProps) {
  const [reason, setReason] = useState<DeleteReason | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!reason) {
      toast({
        title: "Validation Error",
        description: "Please select a reason for deletion",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("properties")
        .update({
          status: "inactive",
          deleted_at: new Date().toISOString(),
          delete_reason: reason,
          modification_reason: notes || null,
          last_modified_by: user.id,
        })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property archived successfully",
      });

      setReason("");
      setNotes("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Property</DialogTitle>
          <DialogDescription>
            This will mark the property as inactive. You can view it in the archived properties section.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-warning/10 border border-warning rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning mb-1">Warning</p>
            <p className="text-muted-foreground">
              Archiving this property will affect pending invitations and tenant access.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason for Archiving *</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as DeleteReason)}>
              <SelectTrigger id="delete-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="no_longer_managing">No Longer Managing</SelectItem>
                <SelectItem value="merged_with_other_property">Merged with Other Property</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="delete-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Archiving..." : "Archive Property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}