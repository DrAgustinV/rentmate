import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserMinus, Users } from "lucide-react";

interface Tenant {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface PropertyTenantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

export function PropertyTenantsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
}: PropertyTenantsDialogProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingTenant, setRemovingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTenants();
    }
  }, [open, propertyId]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          id,
          tenant_id,
          created_at,
          profiles!fk_property_tenants_profiles (
            email,
            first_name,
            last_name
          )
        `
        )
        .eq("property_id", propertyId);

      if (error) throw error;

      const formattedTenants =
        data?.map((item: any) => ({
          id: item.id,
          tenant_id: item.tenant_id,
          email: item.profiles?.email || "Unknown",
          first_name: item.profiles?.first_name,
          last_name: item.profiles?.last_name,
          created_at: item.created_at,
        })) || [];

      setTenants(formattedTenants);
    } catch (error: any) {
      toast({
        title: "Error loading tenants",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTenant = async () => {
    if (!removingTenant) return;

    try {
      const { error } = await supabase
        .from("property_tenants")
        .delete()
        .eq("id", removingTenant.id);

      if (error) throw error;

      toast({
        title: "Tenant removed",
        description: `${getTenantName(removingTenant)} has been removed from ${propertyTitle}`,
      });

      setTenants(tenants.filter((t) => t.id !== removingTenant.id));
      setRemovingTenant(null);
    } catch (error: any) {
      toast({
        title: "Error removing tenant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Tenants
            </DialogTitle>
            <DialogDescription>
              Tenants assigned to {propertyTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading tenants...
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tenants yet - invite someone to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{getTenantName(tenant)}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRemovingTenant(tenant)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removingTenant}
        onOpenChange={(open) => !open && setRemovingTenant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removingTenant && getTenantName(removingTenant)} from{" "}
              {propertyTitle}? They will lose access to this property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveTenant}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
