import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/toastUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PaymentProofReviewProps {
  paymentId: string;
  proofUrl: string;
  tenantName: string;
  amount: number;
  currency: string;
  uploadedAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentProofReview({
  paymentId,
  proofUrl,
  tenantName,
  amount,
  currency,
  uploadedAt,
  open,
  onOpenChange,
}: PaymentProofReviewProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [imageError, setImageError] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async ({ status }: { status: "approved" | "rejected" }) => {
      const updates: any = {
        manager_reviewed: true,
        manager_reviewed_at: new Date().toISOString(),
        manager_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        proof_review_status: status,
        proof_review_notes: notes || null,
      };

      if (status === "approved") {
        // Approved: mark as paid
        updates.status = "paid";
        updates.payment_received_date = new Date().toISOString().split("T")[0];
      } else {
        // Rejected: reset to pending and clear proof
        updates.status = "pending";
        updates.proof_of_payment_url = null;
        updates.tenant_confirmed = false;
        updates.tenant_confirmed_at = null;
      }

      const { error } = await supabase
        .from("rent_payments")
        .update(updates)
        .eq("id", paymentId);

      if (error) throw error;

      // If rejected, delete the file from storage
      if (status === "rejected" && proofUrl) {
        await supabase.storage.from("payment-proofs").remove([proofUrl]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rent-payments"] });
      showToast.success({
        title: t("common.success"),
        description: variables.status === "approved" 
          ? t("payments.proofReview.approvedSuccess")
          : t("payments.proofReview.rejectedSuccess"),
      });
      onOpenChange(false);
      setNotes("");
    },
    onError: (error) => {
      console.error("Error reviewing proof:", error);
      showToast.error({
        title: t("common.error"),
        description: t("payments.proofReview.reviewError"),
      });
    },
  });

  const formatCurrency = (cents: number, curr: string) => {
    return new Intl.NumberFormat(t("locale"), {
      style: "currency",
      currency: curr.toUpperCase(),
    }).format(cents / 100);
  };

  const getPublicUrl = async () => {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .getPublicUrl(proofUrl);
    return data.publicUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("payments.proofReview.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("payments.tenant")}:</span>
              <span className="font-medium">{tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("payments.amount")}:</span>
              <span className="font-medium">{formatCurrency(amount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("payments.proofReview.uploadedAt")}:</span>
              <span className="font-medium">{new Date(uploadedAt).toLocaleString(t("locale"))}</span>
            </div>
          </div>

          {/* Proof of Payment Image/PDF */}
          <div className="space-y-2">
            <Label>{t("payments.proofReview.proofDocument")}</Label>
            <div className="border rounded-lg overflow-hidden bg-background">
              {proofUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={proofUrl}
                  className="w-full h-[400px]"
                  title="Payment Proof PDF"
                />
              ) : (
                <>
                  {!imageError ? (
                    <img
                      src={proofUrl}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-[500px] object-contain"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] bg-muted">
                      <p className="text-muted-foreground">{t("payments.proofReview.imageLoadError")}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("payments.proofReview.notes")} ({t("common.optional")})</Label>
            <Textarea
              id="notes"
              placeholder={t("payments.proofReview.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNotes("");
            }}
            disabled={reviewMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => reviewMutation.mutate({ status: "rejected" })}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {t("payments.proofReview.reject")}
          </Button>
          <Button
            onClick={() => reviewMutation.mutate({ status: "approved" })}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {t("payments.proofReview.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
