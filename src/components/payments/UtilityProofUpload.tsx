import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";

interface UtilityProofUploadProps {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UtilityProofUpload({ paymentId, open, onOpenChange, onSuccess }: UtilityProofUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const { uploadProof } = useUtilityPaymentMutations();

  const handleUpload = async () => {
    if (!file) return;

    uploadProof.mutate(
      { paymentId, file },
      {
        onSuccess: () => {
          setFile(null);
          onSuccess();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("utilities.uploadProof")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proof-file">{t("utilities.selectProofFile")}</Label>
            <Input
              id="proof-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              {t("utilities.acceptedFormats")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploadProof.isPending}>
            {uploadProof.isPending ? t("common.uploading") : t("common.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
