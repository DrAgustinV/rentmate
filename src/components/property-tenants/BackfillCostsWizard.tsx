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

function findFirstOption(options: MonthOption[], year: number, month: number): number {
  const idx = options.findIndex(o => o.year > year || (o.year === year && o.month >= month));
  return idx >= 0 ? idx : 0;
}

function findLastOption(options: MonthOption[], year: number, month: number): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (options[i].year < year || (options[i].year === year && options[i].month <= month)) {
      return i;
    }
  }
  return options.length - 1;
}

interface BackfillCostsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyCreatedAt?: string;
}

export function BackfillCostsWizard({ open, onOpenChange, propertyId, propertyCreatedAt }: BackfillCostsWizardProps) {
  const { t } = useLanguage();
  const { backfillMutation } = useBackfillCosts(propertyId);

  const [step, setStep] = useState(1);

  const [category, setCategory] = useState<CostCategory>("community_fee");
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const amountCents = useMemo(() => Math.round(parseFloat(amountRaw || "0") * 100), [amountRaw]);
  const [recurrence, setRecurrence] = useState("monthly");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { minYear, minMonth } = useMemo(() => {
    const fiftyYearsAgo = currentYear - 50;
    if (!propertyCreatedAt) return { minYear: fiftyYearsAgo, minMonth: 1 };
    const d = new Date(propertyCreatedAt);
    const propYear = d.getFullYear();
    const propMonth = d.getMonth() + 1;
    if (propYear < fiftyYearsAgo) return { minYear: propYear, minMonth: propMonth };
    return { minYear: fiftyYearsAgo, minMonth: 1 };
  }, [propertyCreatedAt, currentYear]);

  const [fromYear, setFromYear] = useState(minYear);
  const [fromMonth, setFromMonth] = useState(minMonth);
  const [toYear, setToYear] = useState(currentYear);
  const [toMonth, setToMonth] = useState(currentMonth);

  const [rows, setRows] = useState<BackfillEntry[]>([]);
  const [notes, setNotes] = useState("");

  const recurrenceMonths = RECURRENCE_MONTHS[recurrence] || 1;

  const generatedOptions = useMemo(
    () => generateOptions(minYear, minMonth, recurrenceMonths),
    [minYear, minMonth, recurrenceMonths],
  );

  const safeFromIdx = useMemo(
    () => Math.min(findFirstOption(generatedOptions, fromYear, fromMonth), generatedOptions.length - 1),
    [generatedOptions, fromYear, fromMonth],
  );

  const safeToIdx = useMemo(() => {
    const idx = findLastOption(generatedOptions, toYear, toMonth);
    return Math.max(idx, safeFromIdx);
  }, [generatedOptions, toYear, toMonth, safeFromIdx]);

  const visibleOptions = generatedOptions.slice(safeFromIdx, safeToIdx + 1);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = minYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [minYear, currentYear]);

  const fromMonthOptions = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    if (fromYear === minYear) return months.slice(minMonth - 1);
    return months;
  }, [fromYear, minYear, minMonth]);

  const toMonthOptions = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    if (toYear === currentYear) return months.slice(0, currentMonth);
    return months;
  }, [toYear, currentYear, currentMonth]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setCategory("community_fee");
      setDescription("");
      setAmountRaw("");
      setRecurrence("monthly");
      setFromYear(minYear);
      setFromMonth(minMonth);
      setToYear(currentYear);
      setToMonth(currentMonth);
      setRows([]);
      setNotes("");
    }
  }, [open, minYear, minMonth, currentYear, currentMonth]);

  const isDefined = category && amountCents > 0;

  const handleProceedFromStep1 = () => {
    const newRows: BackfillEntry[] = visibleOptions.map(o => ({
      key: `${o.year}-${pad(o.month)}`,
      monthLabel: o.label,
      dueDate: o.dueDate,
      amountCents,
      status: "paid" as const,
      costCategory: category,
      description,
    }));
    setRows(newRows);
    setStep(2);
  };

  const handleProceedFromStep2 = () => {
    setStep(3);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("costs.backfill.title")}</DialogTitle>
          <DialogDescription>
            {step === 1 && t("costs.backfill.step1.desc")}
            {step === 2 && t("costs.backfill.step2.desc")}
            {step === 3 && t("costs.backfill.step3.desc")}
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
                  ? t("costs.backfill.step1.short")
                  : s === 2
                    ? t("costs.backfill.step2.short")
                    : t("costs.backfill.step3.short")}
              </span>
              {s < 3 && <div className="w-6 h-px bg-border" />}
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
                type="text"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(val) || val === "") setAmountRaw(val);
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
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(fromMonth)} onValueChange={(v) => setFromMonth(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fromMonthOptions.map(m => (
                          <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m - 1]}</SelectItem>
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
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(toMonth)} onValueChange={(v) => setToMonth(parseInt(v))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {toMonthOptions.map(m => (
                          <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m - 1]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {t("costs.backfill.step1.monthsSelected").replace("{count}", String(visibleOptions.length))}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
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

          {step < 3 ? (
            <Button
              onClick={step === 1 ? handleProceedFromStep1 : handleProceedFromStep2}
              disabled={step === 1 ? (!isDefined || visibleOptions.length === 0) : false}
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
