import { useState } from "react";
import { authService, documentService, paymentService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/toastUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, XCircle, Loader2, Download, ZoomIn, ZoomOut, X } from "lucide-react";

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
  const [imageZoom, setImageZoom] = useState(1);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async ({ status }: { status: "approved" | "rejected" }) => {
      const updates: Record<string, unknown> = {
        manager_reviewed: true,
        manager_reviewed_at: new Date().toISOString(),
        manager_reviewed_by: (await authService.getCurrentUser())?.id,
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

      await paymentService.updateRentPaymentSimple(paymentId, updates);

      // If rejected, delete the file from storage
      if (status === "rejected" && proofUrl) {
        await documentService.deleteFile(STORAGE_BUCKETS.PAYMENT_PROOFS, proofUrl);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rent-payments"] });
      showToast.success(t("common.success"), variables.status === "approved" 
        ? t("payments.proofReview.approvedSuccess")
        : t("payments.proofReview.rejectedSuccess"));
      onOpenChange(false);
      setNotes("");
    },
    onError: (error) => {
      console.error("Error reviewing proof:", error);
      showToast.error(t("common.error"), t("payments.proofReview.reviewError"));
    },
  });

  const formatCurrency = (cents: number, curr: string) => {
    return new Intl.NumberFormat(t("locale"), {
      style: "currency",
      currency: curr.toUpperCase(),
    }).format(cents / 100);
  };

  const handleDownload = async () => {
    try {
      const data = await documentService.downloadFile(STORAGE_BUCKETS.PAYMENT_PROOFS, proofUrl);

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = proofUrl.split('/').pop() || 'payment-proof';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast.success(t("common.success"), t("payments.proofReview.downloadSuccess"));
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast.error(t("common.error"), t("payments.proofReview.downloadError"));
    }
  };

  const isPdf = proofUrl.toLowerCase().endsWith('.pdf');

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
            <div className="flex items-center justify-between">
              <Label>{t("payments.proofReview.proofDocument")}</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("common.download")}
                </Button>
                {!isPdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowZoomModal(true)}
                  >
                    <ZoomIn className="h-4 w-4 mr-2" />
                    {t("payments.proofReview.zoomImage")}
                  </Button>
                )}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-background">
              {isPdf ? (
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
                      className="w-full h-auto max-h-[500px] object-contain cursor-pointer"
                      onError={() => setImageError(true)}
                      onClick={() => setShowZoomModal(true)}
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

      {/* Zoom Modal */}
      {showZoomModal && !isPdf && (
        <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <div className="relative w-full h-[95vh] bg-black">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
                onClick={() => setShowZoomModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background/80 hover:bg-background"
                  onClick={() => setImageZoom(Math.min(imageZoom + 0.5, 5))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background/80 hover:bg-background"
                  onClick={() => setImageZoom(Math.max(imageZoom - 0.5, 0.5))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/80 hover:bg-background"
                  onClick={() => setImageZoom(1)}
                >
                  Reset
                </Button>
              </div>
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={proofUrl}
                  alt="Payment Proof - Zoomed"
                  className="max-w-none"
                  style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center' }}
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
