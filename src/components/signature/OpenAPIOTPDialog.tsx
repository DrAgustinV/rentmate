import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OpenAPIOTPDialogProps {
  open: boolean;
  sessionId: string;
  phoneNumber: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpenAPIOTPDialog({
  open,
  sessionId,
  phoneNumber,
  onSuccess,
  onCancel,
}: OpenAPIOTPDialogProps) {
  const { t } = useLanguage();
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error(t("signature.otp.enterSixDigitCode"));
      return;
    }

    setVerifying(true);
    try {
      const data = await identityService.verifyOpenAPIOTP({ otp, sessionId });

      if (data.success) {
        toast.success(t("signature.otp.verificationSuccess"));
        onSuccess();
      } else {
        toast.error(data.error || t("signature.otp.invalidCode"));
      }
    } catch (error: unknown) {
      console.error("OTP verification error:", error);
      toast.error(error instanceof Error ? error.message : t("signature.otp.verificationFailed"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Verification Code</DialogTitle>
          <DialogDescription>
            We've sent a 6-digit verification code to {phoneNumber}. Please enter it below
            to complete your signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest"
              disabled={verifying}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={verifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifying || otp.length !== 6}
              className="flex-1"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
