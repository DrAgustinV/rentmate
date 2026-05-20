import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";
import { documentService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";
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
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const { reviewProof } = useUtilityPaymentMutations();

  useEffect(() => {
    if (!payment.proof_of_payment_url) {
      setProofUrl(null);
      return;
    }
    documentService.getPublicUrl(STORAGE_BUCKETS.UTILITY_PAYMENT_PROOFS, payment.proof_of_payment_url)
      .then(setProofUrl)
      .catch(() => setProofUrl(null));
  }, [payment.proof_of_payment_url]);

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

  const isPdf = payment.proof_of_payment_url?.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("utilityPayments.reviewProof")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t("utilityPayments.paymentDetails")}</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">{t("utilityPayments.utilityType")}:</span> {t(`utilities.types.${payment.utility_type}`)}</p>
              <p><span className="font-medium">{t("utilityPayments.amount")}:</span> {(payment.amount_cents / 100).toFixed(2)} {payment.currency.toUpperCase()}</p>
            </div>
          </div>

          {proofUrl && (
            <div className="space-y-2">
              <Label>{t("utilityPayments.uploadedProof")}</Label>
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
                      {t("utilityPayments.imageLoadError")}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-notes">{t("utilityPayments.reviewNotes")} ({t("common.optional")})</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("utilityPayments.reviewNotesPlaceholder")}
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
            {t("utilityPayments.reject")}
          </Button>
          <Button
            onClick={() => handleReview('approved')}
            disabled={reviewProof.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t("utilityPayments.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
