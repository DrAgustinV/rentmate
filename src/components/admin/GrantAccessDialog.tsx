import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Crown, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface GrantAccessDialogProps {
  userId: string;
  currentPlanSlug: string;
  targetPlan: "pro" | "enterprise";
  subscriptionType?: string;
  currentPeriodEnd?: string | null;
}

type ActionMode = "grant" | "extend" | "revoke";

export function GrantAccessDialog({ 
  userId, 
  currentPlanSlug, 
  targetPlan,
  subscriptionType,
  currentPeriodEnd 
}: GrantAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [actionMode, setActionMode] = useState<ActionMode>("grant");
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const isPro = targetPlan === "pro";
  const planLabel = isPro ? "Pro" : "Enterprise";
  const Icon = isPro ? Gift : Crown;

  // Determine if this is an existing admin grant for the target plan
  const isCurrentPlanMatch = currentPlanSlug === targetPlan;
  const isAdminGrant = subscriptionType === "admin_grant";
  const isManageMode = isCurrentPlanMatch && isAdminGrant;

  // Check if button should be disabled
  const isStripeSubscription = subscriptionType === "stripe";
  const isDowngrade = targetPlan === "pro" && currentPlanSlug === "enterprise";
  const isDisabled = isStripeSubscription || isDowngrade;

  const grantAccessMutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data: targetPlanData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("slug", targetPlan)
        .single();

      if (planError || !targetPlanData) throw new Error(`${planLabel} plan not found`);

      const { data: currentSub, error: subError } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id")
        .eq("user_id", userId)
        .single();

      if (subError) throw subError;

      const currentPeriodEndDate = new Date();
      currentPeriodEndDate.setDate(currentPeriodEndDate.getDate() + parseInt(duration));

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: targetPlanData.id,
          subscription_type: "admin_grant",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: currentPeriodEndDate.toISOString(),
          admin_granted_by: user.id,
          admin_granted_at: new Date().toISOString(),
          admin_granted_reason: reason,
          admin_granted_duration_days: parseInt(duration),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      await supabase.from("subscription_history").insert({
        user_id: userId,
        from_plan_id: currentSub.plan_id,
        to_plan_id: targetPlanData.id,
        change_reason: "admin_grant",
        changed_by: user.id,
        metadata: { duration_days: parseInt(duration), reason, target_plan: targetPlan },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`${planLabel} access granted for ${duration} days`);
      resetAndClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  const extendAccessMutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentSub, error: subError } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, current_period_end, admin_granted_duration_days, admin_granted_reason")
        .eq("user_id", userId)
        .single();

      if (subError) throw subError;

      // Calculate new end date by adding days to existing end date
      const existingEnd = currentSub.current_period_end 
        ? new Date(currentSub.current_period_end) 
        : new Date();
      const newEndDate = new Date(Math.max(existingEnd.getTime(), Date.now()));
      newEndDate.setDate(newEndDate.getDate() + parseInt(duration));

      const newTotalDays = (currentSub.admin_granted_duration_days || 0) + parseInt(duration);

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          current_period_end: newEndDate.toISOString(),
          admin_granted_at: new Date().toISOString(),
          admin_granted_by: user.id,
          admin_granted_duration_days: newTotalDays,
          admin_granted_reason: reason || currentSub.admin_granted_reason,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      await supabase.from("subscription_history").insert({
        user_id: userId,
        from_plan_id: currentSub.plan_id,
        to_plan_id: currentSub.plan_id,
        change_reason: "admin_extend",
        changed_by: user.id,
        metadata: { 
          extension_days: parseInt(duration), 
          new_total_days: newTotalDays,
          reason, 
          target_plan: targetPlan 
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`${planLabel} access extended by ${duration} days`);
      resetAndClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to extend access: ${error.message}`);
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data: freePlan, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("slug", "free")
        .single();

      if (planError || !freePlan) throw new Error("Free plan not found");

      const { data: currentSub, error: subError } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id")
        .eq("user_id", userId)
        .single();

      if (subError) throw subError;

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: freePlan.id,
          subscription_type: "free",
          status: "active",
          current_period_start: null,
          current_period_end: null,
          admin_granted_by: null,
          admin_granted_at: null,
          admin_granted_reason: null,
          admin_granted_duration_days: null,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      await supabase.from("subscription_history").insert({
        user_id: userId,
        from_plan_id: currentSub.plan_id,
        to_plan_id: freePlan.id,
        change_reason: "admin_revoke",
        changed_by: user.id,
        metadata: { reason, revoked_plan: targetPlan },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`${planLabel} access revoked - user downgraded to Free`);
      resetAndClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    },
  });

  const resetAndClose = () => {
    setOpen(false);
    setDuration("30");
    setReason("");
    setActionMode("grant");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && isManageMode) {
      setActionMode("extend"); // Default to extend when managing
    } else if (newOpen) {
      setActionMode("grant");
    }
  };

  const handleAction = () => {
    if (actionMode === "grant") {
      grantAccessMutation.mutate();
    } else if (actionMode === "extend") {
      extendAccessMutation.mutate();
    } else if (actionMode === "revoke") {
      revokeAccessMutation.mutate();
    }
  };

  const isPending = grantAccessMutation.isPending || extendAccessMutation.isPending || revokeAccessMutation.isPending;

  const getDialogTitle = () => {
    if (isManageMode) return `Manage ${planLabel} Access`;
    return `Grant ${planLabel} Access`;
  };

  const getDialogDescription = () => {
    if (isManageMode) {
      const expiryText = currentPeriodEnd 
        ? `Current access expires: ${format(new Date(currentPeriodEnd), "PPP")}`
        : "No expiry date set";
      return `${expiryText}. You can extend access or revoke it entirely.`;
    }
    return `Give this user temporary ${planLabel} access. They will be automatically downgraded when the duration expires.`;
  };

  const getActionButtonText = () => {
    if (actionMode === "grant") return "Grant Access";
    if (actionMode === "extend") return "Extend Access";
    if (actionMode === "revoke") return "Revoke Access";
    return "Confirm";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isDisabled} className="whitespace-nowrap">
          <Icon className="h-4 w-4 mr-1" />
          {planLabel}
          {isManageMode && <Check className="h-3 w-3 ml-1" />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isManageMode && (
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionMode} onValueChange={(v) => setActionMode(v as ActionMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extend">Extend Access</SelectItem>
                  <SelectItem value="revoke">Revoke Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {actionMode !== "revoke" && (
            <div className="space-y-2">
              <Label htmlFor="duration">
                {actionMode === "extend" ? "Extend by" : "Duration"}
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days (3 months)</SelectItem>
                  <SelectItem value="365">365 days (1 year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder={t('placeholders.grantAccessReason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {actionMode === "revoke" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              This will immediately downgrade the user to the Free plan.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isPending}
            variant={actionMode === "revoke" ? "destructive" : "default"}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getActionButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
