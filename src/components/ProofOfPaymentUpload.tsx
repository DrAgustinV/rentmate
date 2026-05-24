import { useState } from "react";
import { documentService, paymentService } from "@/services";
import { STORAGE_BUCKETS, FILE_SIZE_LIMITS } from "@/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProofOfPaymentUploadProps {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProofOfPaymentUpload({
  paymentId,
  open,
  onOpenChange,
  onSuccess,
}: ProofOfPaymentUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error(t("payments.selectFile"));
      return;
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      toast.error(t("payments.invalidFileType"));
      return;
    }

    if (file.size > FILE_SIZE_LIMITS.PAYMENT_PROOF) {
      toast.error(t("payments.fileTooLarge"));
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `${paymentId}/${fileName}`;

      await documentService.uploadFile(STORAGE_BUCKETS.PAYMENT_PROOFS, filePath, file);

      // Update payment record with proof_uploaded status
      await paymentService.updateRentPaymentSimple(paymentId, {
        proof_of_payment_url: filePath,
        status: 'proof_uploaded',
        tenant_confirmed: true,
        tenant_confirmed_at: new Date().toISOString(),
        proof_review_status: 'pending',
        updated_at: new Date().toISOString(),
      });

      toast.success(t("payments.proofUploaded"));
      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.uploadProof")}</DialogTitle>
          <DialogDescription>
            {t("payments.uploadProofDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              {t("payments.proofFormatsHint")}
            </p>
            {file && (
              <p className="text-sm text-muted-foreground">
                {t("payments.selectedFile")}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? t("common.uploading") : t("payments.uploadProof")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
