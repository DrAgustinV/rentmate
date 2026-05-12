import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, Lock, Mail } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
}

interface EditTenantDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  readOnly?: boolean;
}

export function EditTenantDialog({ tenant, open, onOpenChange, propertyId, readOnly = false, invitationStatus = 'none' }: EditTenantDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState<Date | undefined>(
    tenant ? new Date(tenant.started_at) : undefined
  );
  const [tenancyStatus, setTenancyStatus] = useState<'active' | 'ending_tenancy' | 'historic'>(
    tenant?.tenancy_status || "active"
  );
  const [notes, setNotes] = useState(tenant?.notes || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tenant || !startDate) return;

      const { error } = await supabase
        .from("property_tenants")
        .update({
          started_at: startDate.toISOString(),
          tenancy_status: tenancyStatus,
          notes: notes.trim() || null,
        })
        .eq("id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("tenants.tenantUpdated"),
        description: t("tenants.tenantUpdatedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["current-tenant", propertyId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!tenant) return null;

  const tenantName = tenant.first_name && tenant.last_name
    ? `${tenant.first_name} ${tenant.last_name}`
    : tenant.first_name || tenant.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("tenants.editTenant")}: {tenantName}</DialogTitle>
          <DialogDescription>{t("tenants.editTenantDesc")}</DialogDescription>
        </DialogHeader>

        {readOnly && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("rentals.cannotEditArchived")}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Read-only tenant info */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t("auth.email")}</Label>
            <div className="text-sm font-medium">{tenant.email}</div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>{t("tenants.tenantStartDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={readOnly}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>{t("maintenance.createTask.pickDate")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tenancy Status */}
          <div className="space-y-2">
            <Label>{t("tenants.tenancyStatus")}</Label>
              <Select value={tenancyStatus} onValueChange={(val) => setTenancyStatus(val as 'active' | 'ending_tenancy' | 'historic')} disabled={readOnly}>
                <SelectTrigger disabled={readOnly}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("tenants.statusActive")}</SelectItem>
                  <SelectItem value="ending_tenancy">{t("tenants.statusEndingTenancy")}</SelectItem>
                  <SelectItem value="historic">{t("tenants.statusHistoric")}</SelectItem>
                </SelectContent>
              </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("tenants.tenantNotes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("tenants.tenantNotesPlaceholder")}
              rows={4}
              maxLength={500}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 {t("dialogs.createTicket.characters")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? t("common.close") : t("common.cancel")}
          </Button>
          {!readOnly && (
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !startDate}>
              {updateMutation.isPending ? t("settings.saving") : t("tenants.updateTenant")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
