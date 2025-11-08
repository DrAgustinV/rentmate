import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF file");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `${paymentId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update payment record with proof_uploaded status
      const { error: updateError } = await supabase
        .from("rent_payments")
        .update({
          proof_of_payment_url: filePath,
          status: 'proof_uploaded',
          tenant_confirmed: true,
          tenant_confirmed_at: new Date().toISOString(),
          proof_review_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      toast.success("Proof of payment uploaded successfully");
      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Proof of Payment</DialogTitle>
          <DialogDescription>
            Upload a receipt, bank transfer screenshot, or other proof that you
            made the rent payment.
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
              Accepted formats: JPG, PNG, WEBP, PDF (max 10MB)
            </p>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
              {uploading ? "Uploading..." : "Upload Proof"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
