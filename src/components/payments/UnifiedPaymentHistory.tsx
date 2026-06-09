import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useRentPaymentMutations } from "@/hooks/useRentPayments";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";
import { ProofOfPaymentUpload } from "@/components/ProofOfPaymentUpload";
import { PaymentProofReview } from "./PaymentProofReview";
import { UtilityProofUpload } from "./UtilityProofUpload";
import { UtilityProofReview } from "./UtilityProofReview";
import { FileText, CheckCircle2, Clock, Upload, Eye, Loader2, DollarSign, Zap } from "lucide-react";
import { format } from "date-fns";
import { RentPayment } from "@/hooks/useRentPayments";
import { UtilityPayment } from "@/hooks/useUtilityPayments";

type PaymentType = 'rent' | 'utility';

export interface UnifiedPayment {
  id: string;
  type: PaymentType;
  dueDate: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue';
  proofOfPaymentUrl?: string;
  proofReviewStatus?: 'pending' | 'approved' | 'rejected';
  data: RentPayment | UtilityPayment;
}

interface UnifiedPaymentHistoryProps {
  propertyId: string;
  isManager: boolean;
  payments: UnifiedPayment[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  hasTenant: boolean;
  hasPayments: boolean;
  noAgreements: boolean;
}

export function UnifiedPaymentHistory({
  propertyId,
  isManager,
  payments,
  totalPages,
  currentPage,
  onPageChange,
  hasTenant,
  hasPayments,
  noAgreements,
}: UnifiedPaymentHistoryProps) {
  const { t } = useLanguage();
  const { markAsPaid: markRentPaid } = useRentPaymentMutations();
  const { markAsPaid: markUtilityPaid } = useUtilityPaymentMutations();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UnifiedPayment | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {t("payments.status.paid")}
        </Badge>
      );
    }
    if (status === 'overdue') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Clock className="h-3 w-4" />
          {t("payments.filters.overdue")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {t("payments.filters.pending")}
      </Badge>
    );
  };

  const getTypeLabel = (payment: UnifiedPayment) => {
    if (payment.type === 'rent') {
      return (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span>{t("payments.filters.rent")}</span>
        </div>
      );
    }
    const utilityData = payment.data as UtilityPayment;
    return (
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span>{utilityData.utility_type ? t(`utilities.types.${utilityData.utility_type}`) : t("payments.filters.utility")}</span>
      </div>
    );
  };

  const handleMarkAsPaid = async (payment: UnifiedPayment) => {
    setMarkingId(payment.id);
    try {
      if (payment.type === 'rent') {
        await markRentPaid.mutateAsync(payment.id);
      } else {
        await markUtilityPaid.mutateAsync(payment.id);
      }
    } finally {
      setMarkingId(null);
    }
  };

  const handleUploadClick = (payment: UnifiedPayment) => {
    setSelectedPayment(payment);
    setUploadDialogOpen(true);
  };

  const handleReviewClick = (payment: UnifiedPayment) => {
    setSelectedPayment(payment);
    setReviewDialogOpen(true);
  };

  if (!hasTenant) {
    return (
      <div className="text-center py-12 animate-fade-in" role="status" aria-live="polite">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">{t("payments.emptyStates.noHistory")}</h3>
        <p className="text-muted-foreground">{t("payments.emptyStates.noTenancy")}</p>
      </div>
    );
  }

  if (!hasPayments) {
    return (
      <div className="text-center py-12 animate-fade-in" role="status" aria-live="polite">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">{t("payments.emptyStates.noHistory")}</h3>
        <p className="text-muted-foreground">{noAgreements ? t("payments.emptyStates.waitingForAgreement") : t("payments.emptyStates.noPaymentsDesc")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("payments.filters.type")}</TableHead>
              <TableHead>{t("common.dueDate")}</TableHead>
              <TableHead>{t("common.amount")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={`${payment.type}-${payment.id}`}>
                <TableCell className="font-medium">
                  {getTypeLabel(payment)}
                </TableCell>
                <TableCell>
                  {format(new Date(payment.dueDate), 'PP')}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amountCents, payment.currency)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(payment.status)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!isManager && payment.status !== 'paid' && !payment.proofOfPaymentUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUploadClick(payment)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t("payments.markPaidBtn")}
                      </Button>
                    )}
                    {isManager && payment.proofOfPaymentUrl && payment.proofReviewStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewClick(payment)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("payments.reviewBtn")}
                      </Button>
                    )}
                    {isManager && payment.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(payment)}
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

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {selectedPayment && selectedPayment.type === 'rent' && (
        <ProofOfPaymentUpload
          paymentId={selectedPayment.id}
          open={uploadDialogOpen}
          onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open) setSelectedPayment(null);
          }}
          onSuccess={() => {
            setUploadDialogOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {selectedPayment && selectedPayment.type === 'utility' && (
        <>
          {uploadDialogOpen && (
            <UtilityProofUpload
              paymentId={selectedPayment.id}
              open={uploadDialogOpen}
              onOpenChange={(open) => {
                setUploadDialogOpen(open);
                if (!open) setSelectedPayment(null);
              }}
              onSuccess={() => {
                setUploadDialogOpen(false);
                setSelectedPayment(null);
              }}
            />
          )}
          {reviewDialogOpen && (
            <UtilityProofReview
              payment={selectedPayment.data as UtilityPayment}
              open={reviewDialogOpen}
              onOpenChange={(open) => {
                setReviewDialogOpen(open);
                if (!open) setSelectedPayment(null);
              }}
              onSuccess={() => {
                setReviewDialogOpen(false);
                setSelectedPayment(null);
              }}
            />
          )}
        </>
      )}

      {selectedPayment && selectedPayment.type === 'rent' && selectedPayment.proofOfPaymentUrl && reviewDialogOpen && (
        <PaymentProofReview
          paymentId={selectedPayment.id}
          proofUrl={selectedPayment.proofOfPaymentUrl}
          tenantName=""
          amount={(selectedPayment.data as RentPayment).amount_cents / 100}
          currency={(selectedPayment.data as RentPayment).currency}
          uploadedAt={(selectedPayment.data as RentPayment).updated_at}
          open={reviewDialogOpen}
          onOpenChange={(open) => {
            setReviewDialogOpen(open);
            if (!open) setSelectedPayment(null);
          }}
        />
      )}
    </>
  );
}

export default UnifiedPaymentHistory;