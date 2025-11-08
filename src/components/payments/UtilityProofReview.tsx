import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";

interface UtilityProofReviewProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UtilityProofReview({ payment, open, onOpenChange, onSuccess }: UtilityProofReviewProps) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState("");
  const [imageError, setImageError] = useState(false);
  const { reviewProof } = useUtilityPaymentMutations();

  const getProofUrl = () => {
    if (!payment.proof_of_payment_url) return null;
    const { data } = supabase.storage
      .from('utility-payment-proofs')
      .getPublicUrl(payment.proof_of_payment_url);
    return data.publicUrl;
  };

  const handleReview = (status: 'approved' | 'rejected') => {
    reviewProof.mutate(
      { paymentId: payment.id, status, notes: notes || undefined },
      {
        onSuccess: () => {
          setNotes("");
          onSuccess();
        },
      }
    );
  };

  const proofUrl = getProofUrl();
  const isPdf = payment.proof_of_payment_url?.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("utilities.reviewProof")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t("utilities.paymentDetails")}</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">{t("utilities.utilityType")}:</span> {t(`utilities.types.${payment.utility_type}`)}</p>
              <p><span className="font-medium">{t("utilities.amount")}:</span> {(payment.amount_cents / 100).toFixed(2)} {payment.currency.toUpperCase()}</p>
            </div>
          </div>

          {proofUrl && (
            <div className="space-y-2">
              <Label>{t("utilities.uploadedProof")}</Label>
              <div className="border rounded-lg overflow-hidden bg-muted">
                {isPdf ? (
                  <iframe
                    src={proofUrl}
                    className="w-full h-96"
                    title="Payment Proof PDF"
                  />
                ) : (
                  !imageError ? (
                    <img
                      src={proofUrl}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-96 object-contain"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                      {t("utilities.imageLoadError")}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-notes">{t("utilities.reviewNotes")} ({t("common.optional")})</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("utilities.reviewNotesPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview('rejected')}
            disabled={reviewProof.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t("utilities.reject")}
          </Button>
          <Button
            onClick={() => handleReview('approved')}
            disabled={reviewProof.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t("utilities.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
