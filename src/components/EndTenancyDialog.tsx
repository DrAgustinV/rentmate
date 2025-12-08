import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface EndTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  onConfirm: (plannedEndDate: string) => void;
  isPending?: boolean;
}

export function EndTenancyDialog({
  open,
  onOpenChange,
  tenantName,
  onConfirm,
  isPending,
}: EndTenancyDialogProps) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(format(selectedDate, "yyyy-MM-dd"));
      setSelectedDate(undefined);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedDate(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.endTenancy.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.endTenancy.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t("dialogs.endTenancy.tenantLabel")}: <strong>{tenantName}</strong>
          </p>
          <div className="space-y-2">
            <Label>{t("dialogs.endTenancy.selectEndDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : t("dialogs.endTenancy.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dialogs.endTenancy.parallelSetupHint")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
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