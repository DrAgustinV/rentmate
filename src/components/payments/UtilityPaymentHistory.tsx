import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUtilityPayments, useUtilityPaymentMutations, type UtilityPayment } from "@/hooks/useUtilityPayments";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateUtils";
import { CheckCircle2, Clock, Loader2, Upload, Eye, FileText } from "lucide-react";
import { UtilityProofUpload } from "./UtilityProofUpload";
import { UtilityProofReview } from "./UtilityProofReview";
import { EmptyState } from "@/components/EmptyState";

interface UtilityPaymentHistoryProps {
  propertyId: string;
  isManager: boolean;
}

export function UtilityPaymentHistory({ propertyId, isManager }: UtilityPaymentHistoryProps) {
  const { t } = useLanguage();
  const { data: payments, isLoading } = useUtilityPayments(propertyId);
  const { markAsPaid } = useUtilityPaymentMutations();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UtilityPayment | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const getUtilityLabel = (type: string, customName?: string) => {
    if (type === 'other' && customName) return customName;
    return t(`utilities.types.${type}`);
  };

  // Simplified status badge matching RentPaymentHistory
  const getSimpleStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {t("payments.status.paid")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {t("payments.status.due")}
      </Badge>
    );
  };

  const handleUploadClick = (payment: UtilityPayment) => {
    setSelectedPayment(payment);
    setUploadDialogOpen(true);
  };

  const handleReviewClick = (payment: UtilityPayment) => {
    setSelectedPayment(payment);
    setReviewDialogOpen(true);
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    setMarkingId(paymentId);
    try {
      await markAsPaid.mutateAsync(paymentId);
    } finally {
      setMarkingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t("utilityPayments.noPayments")}
        description={t("utilityPayments.noPaymentsDesc")}
        variant="info"
      />
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("utilityPayments.utilityType")}</TableHead>
              <TableHead>{t("common.dueDate")}</TableHead>
              <TableHead>{t("common.amount")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {getUtilityLabel(payment.utility_type, payment.custom_utility_name)}
                </TableCell>
                <TableCell>
                  {formatDate(payment.payment_due_date)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amount_cents, payment.currency)}
                </TableCell>
                <TableCell>
                  {getSimpleStatusBadge(payment.status)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {/* Tenant: Upload proof */}
                    {!isManager && payment.status !== 'paid' && !payment.proof_of_payment_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUploadClick(payment)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t("payments.markPaidBtn")}
                      </Button>
                    )}
                    {/* Manager: Review proof */}
                    {isManager && payment.proof_of_payment_url && payment.proof_review_status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewClick(payment)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("payments.reviewBtn")}
                      </Button>
                    )}
                    {/* Manager: Mark as paid directly */}
                    {isManager && payment.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(payment.id)}
                        disabled={markingId === payment.id}
                      >
                        {markingId === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("payments.markPaidBtn")}
                          </>
                        )}
                      </Button>
                    )}
                    {/* No actions for paid payments */}
                    {payment.status === 'paid' && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedPayment && (
        <>
          <UtilityProofUpload
            paymentId={selectedPayment.id}
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            onSuccess={() => {
              setUploadDialogOpen(false);
              setSelectedPayment(null);
            }}
          />
          <UtilityProofReview
            payment={selectedPayment}
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            onSuccess={() => {
              setReviewDialogOpen(false);
              setSelectedPayment(null);
            }}
          />
        </>
      )}
    </>
  );
}
