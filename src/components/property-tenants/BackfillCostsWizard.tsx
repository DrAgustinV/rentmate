import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBackfillCosts, type BackfillEntry } from "@/hooks/useBackfillCosts";
import { Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CostCategory } from "@/types/domain";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COST_CATEGORIES: CostCategory[] = ['community_fee', 'property_tax', 'maintenance', 'exceptional', 'insurance', 'other'];

const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getLastDay(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface MonthOption {
  idx: number;
  label: string;
  year: number;
  month: number;
  dueDate: string;
}

function generateOptions(startYear: number, startMonth: number, recurrenceMonths: number): MonthOption[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const opts: MonthOption[] = [];
  let y = startYear;
  let m = startMonth;
  let i = 0;
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const lastDay = getLastDay(y, m);
    const day = Math.min(1, lastDay);
    opts.push({
      idx: i,
      label: getMonthLabel(y, m),
      year: y,
      month: m,
      dueDate: `${y}-${pad(m)}-${pad(day)}`,
    });
    i++;
    m += recurrenceMonths;
    while (m > 12) { m -= 12; y++; }
  }
  return opts;
}

interface BackfillCostsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function BackfillCostsWizard({ open, onOpenChange, propertyId }: BackfillCostsWizardProps) {
  const { t } = useLanguage();
  const { backfillMutation } = useBackfillCosts(propertyId);

  const [step, setStep] = useState(1);

  const [category, setCategory] = useState<CostCategory>("community_fee");
  const [description, setDescription] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [recurrence, setRecurrence] = useState("monthly");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);

  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(0);

  const [rows, setRows] = useState<BackfillEntry[]>([]);
  const [notes, setNotes] = useState("");

  const recurrenceMonths = RECURRENCE_MONTHS[recurrence] || 1;

  const generatedOptions = useMemo(
    () => generateOptions(startYear, startMonth, recurrenceMonths),
    [startYear, startMonth, recurrenceMonths],
  );

  const safeFromIdx = Math.min(fromIdx, generatedOptions.length - 1);
  const safeToIdx = Math.min(toIdx, generatedOptions.length - 1);
  const visibleOptions = generatedOptions.slice(safeFromIdx, safeToIdx + 1);

  useEffect(() => {
    if (step === 1) {
      setFromIdx(0);
      setToIdx(generatedOptions.length - 1);
    }
  }, [category, recurrence, startYear, startMonth, generatedOptions.length, step]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setCategory("community_fee");
      setDescription("");
      setAmountCents(0);
      setRecurrence("monthly");
      setStartYear(new Date().getFullYear());
      setStartMonth(new Date().getMonth() + 1);
      setFromIdx(0);
      setToIdx(0);
      setRows([]);
      setNotes("");
    }
  }, [open]);

  const isDefined = category && amountCents > 0;

  const handleProceedFromStep1 = () => {
    setStep(2);
  };

  const handleProceedFromStep2 = () => {
    const newRows: BackfillEntry[] = visibleOptions.map(o => ({
      key: `${o.year}-${pad(o.month)}`,
      monthLabel: o.label,
      dueDate: o.dueDate,
      amountCents,
      status: "paid" as const,
    }));
    setRows(newRows);
    setStep(3);
  };

  const handleProceedFromStep3 = () => {
    setStep(4);
  };

  const handleMarkAllPaid = () => {
    setRows(prev => prev.map(r => ({ ...r, status: "paid" as const })));
  };

  const handleRowChange = (key: string, field: "amountCents" | "status", value: number | BackfillEntry["status"]) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleSave = () => {
    const toCreate = rows.filter(r => r.status !== "missed");
    if (toCreate.length === 0) return;
    backfillMutation.mutate(toCreate, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const totalCreate = rows.filter(r => r.status !== "missed").length;
  const totalAmountCents = rows.filter(r => r.status !== "missed").reduce((s, r) => s + r.amountCents, 0);

  const yearOptions = useMemo(() => {
    const now = new Date();
    const years: number[] = [];
    for (let y = now.getFullYear() - 5; y <= now.getFullYear(); y++) {
      years.push(y);
    }
    return years;
  }, []);

  const optionLabels = useMemo(() => generatedOptions.map(o => ({
    value: `${o.year}-${pad(o.month)}`,
    label: o.label,
  })), [generatedOptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("costs.backfill.title")}</DialogTitle>
          <DialogDescription>
            {step === 1 && t("costs.backfill.step1.desc")}
            {step === 2 && t("costs.backfill.step2.desc")}
            {step === 3 && t("costs.backfill.step2.desc")}
            {step === 4 && t("costs.backfill.step3.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-4">
          {[1, 2, 3, 4].map(s => (
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
                  ? t("costs.backfill.step1.short")
                  : s === 2
                    ? t("costs.backfill.step2.short")
                    : s === 3
                      ? t("costs.backfill.step2.short")
                      : t("costs.backfill.step3.short")}
              </span>
              {s < 4 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>{t("costs.fields.category")}</Label>
              <Select value={category} onValueChange={(v: CostCategory) => setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {t(`costs.filters.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("costs.fields.description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("costs.fields.description")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("costs.fields.amount")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountCents > 0 ? (amountCents / 100).toFixed(2) : ""}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                  setAmountCents(cents);
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("costs.fields.recurrence")}</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("costs.fields.monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("costs.fields.quarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("costs.fields.yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("costs.fields.dueDate")}</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={String(startMonth)}
                    onValueChange={(v) => setStartMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select
                    value={String(startYear)}
                    onValueChange={(v) => setStartYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("costs.fields.category")}</span>
                <span className="font-medium">{t(`costs.filters.${category}`)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("costs.fields.amount")}</span>
                <span className="font-medium">€{(amountCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t("costs.fields.recurrence")}</span>
                <span className="font-medium">{t(`costs.fields.${recurrence}`)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t("payments.backfill.step1.range")}</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={optionLabels[safeFromIdx]?.value || ""}
                    onValueChange={(val) => {
                      const idx = optionLabels.findIndex(o => o.value === val);
                      if (idx >= 0 && idx <= safeToIdx) setFromIdx(idx);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {optionLabels.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex-1">
                  <Select
                    value={optionLabels[safeToIdx]?.value || ""}
                    onValueChange={(val) => {
                      const idx = optionLabels.findIndex(o => o.value === val);
                      if (idx >= safeFromIdx) setToIdx(idx);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {optionLabels.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("costs.backfill.step1.monthsSelected").replace("{count}", String(visibleOptions.length))}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleMarkAllPaid}>
                <Check className="h-4 w-4 mr-2" />
                {t("costs.backfill.step2.markAllPaid")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("costs.backfill.step1.monthsSelected").replace("{count}", String(rows.length))}
              </span>
            </div>

            <div className="max-h-[360px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("costs.backfill.step2.month")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("costs.backfill.step2.amount")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t("costs.backfill.step2.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.key} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">{row.monthLabel}</td>
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
                          onValueChange={(v: BackfillEntry["status"]) => handleRowChange(row.key, "status", v)}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">{t("costs.backfill.status.paid")}</SelectItem>
                            <SelectItem value="pending">{t("costs.backfill.status.pending")}</SelectItem>
                            <SelectItem value="missed">{t("costs.backfill.status.missed")}</SelectItem>
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

        {step === 4 && (
          <div className="space-y-6 py-2">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-lg font-semibold">
                {t("costs.backfill.step3.summary")
                  .replace("{count}", String(totalCreate))
                  .replace("{amount}", `€${(totalAmountCents / 100).toFixed(2)}`)}
              </p>
              {rows.length > totalCreate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("costs.backfill.step3.skipped").replace("{count}", String(rows.length - totalCreate))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("costs.backfill.step3.notesLabel")}</Label>
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

          {step < 4 ? (
            <Button
              onClick={step === 1 ? handleProceedFromStep1 : step === 2 ? handleProceedFromStep2 : handleProceedFromStep3}
              disabled={step === 1 ? !isDefined : step === 2 ? visibleOptions.length === 0 : false}
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
                t("costs.backfill.save")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
