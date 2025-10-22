import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ticketBaseSchema } from "@/lib/validations";
import { z } from "zod";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  onSuccess?: () => void;
}

export function CreateTicketDialog({ open, onOpenChange, propertyId, onSuccess }: CreateTicketDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "issue" as "issue" | "request" | "incident",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    propertyId: propertyId || "",
  });

  const queryClient = useQueryClient();

  const { data: currentUserData } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      return await supabase.auth.getUser();
    },
  });

  const user = currentUserData?.data?.user;

  // Fetch current user's tenancy for the selected property
  const { data: userTenancy } = useQuery({
    queryKey: ["user-tenancy", formData.propertyId, user?.id],
    queryFn: async () => {
      if (!user || !formData.propertyId) return null;
      
      const { data, error } = await supabase
        .from("property_tenants")
        .select("id")
        .eq("property_id", formData.propertyId)
        .eq("tenant_id", user.id)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!formData.propertyId,
  });

  const { data: properties } = useQuery({
    queryKey: ["user-properties"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Step 1: Get property IDs where user is a tenant
      const { data: tenantProps } = await supabase
        .from("property_tenants")
        .select("property_id")
        .eq("tenant_id", user.id);

      const tenantPropertyIds = tenantProps?.map(tp => tp.property_id) || [];

      // Step 2: Fetch properties where user is manager OR tenant
      let query = supabase
        .from("properties")
        .select("id, title")
        .eq("status", "active");

      if (tenantPropertyIds.length > 0) {
        query = query.or(`manager_id.eq.${user.id},id.in.(${tenantPropertyIds.join(",")})`);
      } else {
        query = query.eq("manager_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          property_id: formData.propertyId,
          created_by: user.id,
          tenancy_id: userTenancy?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["property-tickets"] });
      toast.success("Ticket created", {
        description: "Your ticket has been created successfully.",
      });
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        type: "issue",
        priority: "medium",
        propertyId: propertyId || "",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      ticketBaseSchema.parse({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        propertyId: formData.propertyId,
      });
      createMutation.mutate();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Submit a new ticket for a property issue or request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!propertyId && (
            <div className="space-y-2">
              <Label htmlFor="property">Property *</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) =>
                  setFormData({ ...formData, propertyId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "issue" | "request" | "incident") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="request">Request</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Brief description of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed description of the issue or request"
              rows={4}
              maxLength={2000}
            />
            <p className="text-sm text-muted-foreground">
              {formData.description.length}/2000 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}