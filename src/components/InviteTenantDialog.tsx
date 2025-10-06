import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
});

interface InviteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  onSuccess: () => void;
}

export function InviteTenantDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  onSuccess,
}: InviteTenantDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = inviteSchema.parse({ email });

      // Check if user exists with this email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      // Check if already a tenant
      if (profiles) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId)
          .eq("tenant_id", profiles.id)
          .maybeSingle();

        if (existing) {
          throw new Error("This user is already a tenant of this property");
        }
      }

      // Check for existing invitation
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id")
        .eq("email", data.email)
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        throw new Error("An invitation has already been sent to this email");
      }

      // Generate token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("invitations").insert({
        token,
        email: data.email,
        property_id: propertyId,
        expires_at: expiresAt.toISOString(),
        invited_user_id: profiles?.id || null,
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${data.email}`,
      });

      setEmail("");
      onSuccess();
      onOpenChange(false);
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
          <DialogTitle>Invite Tenant to {propertyTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenant@example.com"
              required
            />
            <p className="text-sm text-muted-foreground">
              If the user exists, they'll be added immediately. Otherwise, they'll receive an invitation.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}