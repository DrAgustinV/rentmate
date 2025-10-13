import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";

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

export function PropertyTenantsDialog({ open, onOpenChange, propertyId, propertyTitle }: PropertyTenantsDialogProps) {
  const { t } = useLanguage();
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
        `,
        )
        .eq("property_id", propertyId);

      if (error) throw error;

      const formattedTenants =
        data?.map((item: any) => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

          return {
            id: item.id,
            tenant_id: item.tenant_id,
            email: profile?.email || "Unknown",
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            created_at: item.created_at,
          };
        }) || [];

      setTenants(formattedTenants);
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
      const { error } = await supabase.from("property_tenants").delete().eq("id", removingTenant.id);

      if (error) throw error;

      toast({
        title: t('dialogs.manageTenants.removed'),
        description: `${getTenantName(removingTenant)} ${t('dialogs.manageTenants.removedDesc')} ${propertyTitle}`,
      });

      setTenants(tenants.filter((t) => t.id !== removingTenant.id));
      setRemovingTenant(null);
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
              {t('dialogs.manageTenants.title')}
            </DialogTitle>
            <DialogDescription>{t('dialogs.manageTenants.description')} {propertyTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{t('dialogs.manageTenants.loading')}</div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('dialogs.manageTenants.noTenants')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{getTenantName(tenant)}</p>
                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('dialogs.manageTenants.added')} {formatDate(tenant.created_at)}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setRemovingTenant(tenant)}>
                      <UserMinus className="h-4 w-4 mr-2" />
                      {t('dialogs.manageTenants.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removingTenant} onOpenChange={(open) => !open && setRemovingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.manageTenants.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.manageTenants.removeDescription')} {removingTenant && getTenantName(removingTenant)} {t('dialogs.manageTenants.removeDescription')} {propertyTitle}? {t('dialogs.manageTenants.removeMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveTenant}>{t('dialogs.manageTenants.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
