import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBackfillPayments } from "@/hooks/useBackfillPayments";
import { Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface BackfillRow {
  key: string;
  monthLabel: string;
  dueDate: string;
  amountCents: number;
  status: "paid" | "partial" | "late" | "missed";
}

interface BackfillPaymentsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
  tenantProfileId?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function BackfillPaymentsWizard({ open, onOpenChange, propertyId, tenancyId, tenantProfileId }: BackfillPaymentsWizardProps) {
  const { t } = useLanguage();
  const { gapAnalysis, backfillMutation } = useBackfillPayments(propertyId, tenancyId, tenantProfileId);

  const [step, setStep] = useState(1);
  const [fromYear, setFromYear] = useState(0);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(0);
  const [toMonth, setToMonth] = useState(1);
  const [rows, setRows] = useState<BackfillRow[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (gapAnalysis && gapAnalysis.months.length > 0 && step === 1) {
      const first = gapAnalysis.months[0];
      const last = gapAnalysis.months[gapAnalysis.months.length - 1];
      setFromYear(first.year);
      setFromMonth(first.month);
      setToYear(last.year);
      setToMonth(last.month);
      setNotes(t("payments.backfill.notesDefault").replace("{date}", formatDate(new Date())));
    }
  }, [gapAnalysis, step, t]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setRows([]);
      setFromYear(0);
      setFromMonth(1);
      setToYear(0);
      setToMonth(1);
    }
  }, [open]);

  const gapYears = useMemo(() => {
    if (!gapAnalysis) return [];
    return [...new Set(gapAnalysis.months.map(m => m.year))].sort();
  }, [gapAnalysis]);

  const fromMonthEntries = useMemo(() => {
    if (!gapAnalysis) return [];
    return gapAnalysis.months
      .filter(m => m.year === fromYear)
      .map(m => ({ value: m.month, label: MONTH_NAMES[m.month - 1] }));
  }, [gapAnalysis, fromYear]);

  const toMonthEntries = useMemo(() => {
    if (!gapAnalysis) return [];
    return gapAnalysis.months
      .filter(m => m.year === toYear)
      .map(m => ({ value: m.month, label: MONTH_NAMES[m.month - 1] }));
  }, [gapAnalysis, toYear]);

  const safeFromIdx = useMemo(() => {
    if (!gapAnalysis) return 0;
    const idx = gapAnalysis.months.findIndex(
      m => m.year > fromYear || (m.year === fromYear && m.month >= fromMonth)
    );
    return idx >= 0 ? idx : 0;
  }, [gapAnalysis, fromYear, fromMonth]);

  const safeToIdx = useMemo(() => {
    if (!gapAnalysis) return 0;
    let idx = -1;
    for (let i = gapAnalysis.months.length - 1; i >= 0; i--) {
      if (gapAnalysis.months[i].year < toYear || (gapAnalysis.months[i].year === toYear && gapAnalysis.months[i].month <= toMonth)) {
        idx = i;
        break;
      }
    }
    idx = idx >= 0 ? idx : gapAnalysis.months.length - 1;
    return Math.max(idx, safeFromIdx);
  }, [gapAnalysis, toYear, toMonth, safeFromIdx]);

  const visibleMonths = useMemo(() => {
    if (!gapAnalysis) return [];
    return gapAnalysis.months.slice(safeFromIdx, safeToIdx + 1);
  }, [gapAnalysis, safeFromIdx, safeToIdx]);

  const handleProceedToStep2 = () => {
    const newRows: BackfillRow[] = visibleMonths.map(m => ({
      key: `${m.year}-${pad(m.month)}`,
      monthLabel: m.monthLabel,
      dueDate: m.dueDate,
      amountCents: m.amountCents,
      status: "paid" as const,
    }));
    setRows(newRows);
    setStep(2);
  };

  const handleProceedToStep3 = () => {
    setStep(3);
  };

  const handleMarkAllPaid = () => {
    const originalAmount = gapAnalysis?.monthlyRentCents ?? 0;
    setRows(prev => prev.map(r => ({
      ...r,
      amountCents: originalAmount,
      status: "paid" as const,
    })));
  };

  const handleRowChange = (key: string, field: "amountCents" | "status", value: number | BackfillRow["status"]) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleSave = () => {
    const toCreate = rows.filter(r => r.status !== "missed");
    if (toCreate.length === 0) return;
    backfillMutation.mutate(
      toCreate.map(r => ({
        year: parseInt(r.key.split("-")[0]),
        month: parseInt(r.key.split("-")[1]),
        monthLabel: r.monthLabel,
        dueDate: r.dueDate,
        amountCents: r.amountCents,
        receivedDate: r.dueDate,
      })),
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const totalCreate = rows.filter(r => r.status !== "missed").length;
  const totalAmountCents = rows.filter(r => r.status !== "missed").reduce((s, r) => s + r.amountCents, 0);

  if (!gapAnalysis) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payments.backfill.title")}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            {t("payments.backfill.noData")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t("payments.backfill.title")}</DialogTitle>
          <DialogDescription>
            {step === 1 && t("payments.backfill.step1.desc")}
            {step === 2 && t("payments.backfill.step2.desc")}
            {step === 3 && t("payments.backfill.step3.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span
                className={cn(
                  "text-xs",
                  step === s ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {s === 1
                  ? t("payments.backfill.step1.short")
                  : s === 2
                    ? t("payments.backfill.step2.short")
                    : t("payments.backfill.step3.short")}
              </span>
              {s < 3 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{t("payments.backfill.step1.startDate")}</span>
                <span className="font-medium">{gapAnalysis.months[0]?.monthLabel}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{t("payments.backfill.step1.monthlyRent")}</span>
                <span className="font-medium">€{(gapAnalysis.monthlyRentCents / 100).toFixed(2)}</span>
              </div>
              <div className="text-center py-4">
                <p className="text-lg font-semibold">
                  {t("payments.backfill.step1.calculation").replace("{count}", String(gapAnalysis.totalCount))}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t("payments.backfill.step1.range")}</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">{t("common.from")}</span>
                  <div className="flex gap-2">
                    <Select value={String(fromYear)} onValueChange={(v) => setFromYear(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gapYears.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(fromMonth)} onValueChange={(v) => setFromMonth(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fromMonthEntries.map(e => (
                          <SelectItem key={e.value} value={String(e.value)}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <span className="text-muted-foreground mt-5">→</span>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">{t("common.to")}</span>
                  <div className="flex gap-2">
                    <Select value={String(toYear)} onValueChange={(v) => setToYear(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gapYears.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(toMonth)} onValueChange={(v) => setToMonth(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {toMonthEntries.map(e => (
                          <SelectItem key={e.value} value={String(e.value)}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("payments.backfill.step1.monthsSelected").replace("{count}", String(visibleMonths.length))}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleMarkAllPaid}>
                <Check className="h-4 w-4 mr-2" />
                {t("payments.backfill.step2.markAllPaid")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("payments.backfill.step1.monthsSelected").replace("{count}", String(rows.length))}
              </span>
            </div>

            <div className="max-h-[320px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("payments.backfill.step2.month")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("payments.backfill.step2.amount")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("payments.backfill.step2.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.key} className="border-t">
                      <td className="px-3 py-2">{row.monthLabel}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-8 w-24"
                          value={(row.amountCents / 100).toFixed(2)}
                          onChange={(e) => {
                            const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                            handleRowChange(row.key, "amountCents", cents);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.status}
                          onValueChange={(v: BackfillRow["status"]) => handleRowChange(row.key, "status", v)}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">{t("payments.backfill.status.paid")}</SelectItem>
                            <SelectItem value="partial">{t("payments.backfill.status.partial")}</SelectItem>
                            <SelectItem value="late">{t("payments.backfill.status.late")}</SelectItem>
                            <SelectItem value="missed">{t("payments.backfill.status.missed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-2">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-lg font-semibold">
                {t("payments.backfill.step3.summary")
                  .replace("{count}", String(totalCreate))
                  .replace("{amount}", `€${(totalAmountCents / 100).toFixed(2)}`)}
              </p>
              {rows.length > totalCreate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("payments.backfill.step3.skipped").replace("{count}", String(rows.length - totalCreate))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("payments.backfill.step3.notesLabel")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={backfillMutation.isPending}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={backfillMutation.isPending}>
              {t("common.cancel")}
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={step === 1 ? handleProceedToStep2 : handleProceedToStep3}
              disabled={visibleMonths.length === 0}
            >
              {t("common.next")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={backfillMutation.isPending || totalCreate === 0}>
              {backfillMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("payments.backfill.save")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
