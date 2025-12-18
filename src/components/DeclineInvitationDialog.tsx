import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { XCircle, Loader2 } from "lucide-react";

interface DeclineInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyTitle: string;
  onConfirm: (reason?: string) => void;
  isProcessing: boolean;
}

export function DeclineInvitationDialog({
  open,
  onOpenChange,
  propertyTitle,
  onConfirm,
  isProcessing,
}: DeclineInvitationDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            {t('invitations.declineDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('invitations.declineDialog.description')}
            <span className="font-medium text-foreground"> "{propertyTitle}"</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="decline-reason" className="text-sm font-medium">
            {t('invitations.declineDialog.reasonLabel')}
          </Label>
          <Textarea
            id="decline-reason"
            placeholder={t('invitations.declineDialog.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            className="mt-2"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {reason.length}/200
          </p>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('invitations.declineDialog.confirm')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
