import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const propertySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  onSuccess: () => void;
}

export function EditPropertyDialog({ open, onOpenChange, property, onSuccess }: EditPropertyDialogProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (property) {
      setTitle(property.title || "");
      setAddress(property.address || "");
      setDescription(property.description || "");
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = propertySchema.parse({ title, address, description });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("properties")
        .update({
          title: data.title,
          address: data.address || null,
          description: data.description || null,
          last_modified_by: user.id,
        })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Property Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beachfront Villa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Ocean Drive"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beautiful property with ocean views..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}