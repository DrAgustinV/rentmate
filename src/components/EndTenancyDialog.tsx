import { useState } from "react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EndTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  canEndImmediately: boolean;
  onConfirm: (plannedEndDate: string | null, mode: 'ending' | 'finalize') => void;
  isPending?: boolean;
}

export function EndTenancyDialog({
  open,
  onOpenChange,
  tenantName,
  canEndImmediately,
  onConfirm,
  isPending,
}: EndTenancyDialogProps) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleConfirm = (mode: 'ending' | 'finalize') => {
    if (mode === 'finalize') {
      onConfirm(null, 'finalize');
    } else if (selectedDate) {
      onConfirm(format(selectedDate, "yyyy-MM-dd"), 'ending');
    }
    setSelectedDate(undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedDate(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("dialogs.endTenancy.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.endTenancy.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-x-hidden">
          <p className="text-sm text-muted-foreground">
            {t("dialogs.endTenancy.tenantLabel")}: <strong>{tenantName}</strong>
          </p>

          {canEndImmediately && (
            <Alert>
              <AlertDescription>
                {t("dialogs.endTenancy.immediateDesc")}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>{t("dialogs.endTenancy.selectEndDate")}</Label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder={t("dialogs.endTenancy.pickDate")}
              disabledDays={(date) => date < new Date()}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {t("dialogs.endTenancy.parallelSetupHint")}
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row sm:flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          {canEndImmediately && (
            <Button
              onClick={() => handleConfirm('finalize')}
              disabled={isPending}
              className="border-red-500 bg-red-500 text-white hover:bg-red-600"
            >
              {t("dialogs.endTenancy.endImmediately")}
            </Button>
          )}
          <Button
            onClick={() => handleConfirm('ending')}
            disabled={!selectedDate || isPending}
            className="border-yellow-500 bg-yellow-500 text-yellow-950 hover:bg-yellow-600"
          >
            {t("dialogs.endTenancy.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
