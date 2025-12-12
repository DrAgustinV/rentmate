import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Gift, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface GrantAccessDialogProps {
  userId: string;
  currentPlanSlug: string;
  targetPlan: "pro" | "enterprise";
}

export function GrantAccessDialog({ userId, currentPlanSlug, targetPlan }: GrantAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const isPro = targetPlan === "pro";
  const planLabel = isPro ? "Pro" : "Enterprise";
  const Icon = isPro ? Gift : Crown;

  const grantAccessMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + parseInt(duration));

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: targetPlanData.id,
          subscription_type: "admin_grant",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
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
      setOpen(false);
      setDuration("30");
      setReason("");
    },
    onError: (error: any) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  const isDisabled = currentPlanSlug === targetPlan || 
    (targetPlan === "pro" && currentPlanSlug === "enterprise");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isDisabled} className="whitespace-nowrap">
          <Icon className="h-4 w-4 mr-1" />
          {planLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant {planLabel} Access</DialogTitle>
          <DialogDescription>
            Give this user temporary {planLabel} access. They will be automatically downgraded when the duration expires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => grantAccessMutation.mutate()}
            disabled={grantAccessMutation.isPending}
          >
            {grantAccessMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
