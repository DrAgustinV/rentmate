import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUtilityPayments } from "@/hooks/useUtilityPayments";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { UtilityProofUpload } from "./UtilityProofUpload";
import { UtilityProofReview } from "./UtilityProofReview";

interface UtilityPaymentHistoryProps {
  propertyId: string;
  isManager: boolean;
}

export function UtilityPaymentHistory({ propertyId, isManager }: UtilityPaymentHistoryProps) {
  const { t } = useLanguage();
  const { data: payments, isLoading } = useUtilityPayments(propertyId);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getUtilityLabel = (type: string, customName?: string) => {
    if (type === 'other' && customName) return customName;
    return t(`utilities.types.${type}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, label: t('utilities.status.pending') },
      paid: { variant: 'default' as const, label: t('utilities.status.paid') },
      overdue: { variant: 'destructive' as const, label: t('utilities.status.overdue') },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProofReviewBadge = (status: string) => {
    const icons = {
      pending: <Clock className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
    };
    const variants = {
      pending: 'outline' as const,
      approved: 'default' as const,
      rejected: 'destructive' as const,
    };
    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        {t(`utilities.proofReview.${status}`)}
      </Badge>
    );
  };

  const handleUploadClick = (payment: any) => {
    setSelectedPayment(payment);
    setUploadDialogOpen(true);
  };

  const handleReviewClick = (payment: any) => {
    setSelectedPayment(payment);
    setReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("utilities.paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("utilities.paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("utilities.noPayments")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("utilities.paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {getUtilityLabel(payment.utility_type, payment.custom_utility_name)}
                    </span>
                    {getStatusBadge(payment.status)}
                    {payment.proof_of_payment_url && getProofReviewBadge(payment.proof_review_status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("utilities.billingPeriod")}: {format(new Date(payment.billing_period_start), 'dd/MM/yyyy')} - {format(new Date(payment.billing_period_end), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-sm">
                    {t("utilities.dueDate")}: {format(new Date(payment.payment_due_date), 'dd/MM/yyyy')}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(payment.amount_cents, payment.currency)}</div>
                  </div>

                  {!isManager && payment.status === 'pending' && !payment.proof_of_payment_url && (
                    <Button size="sm" onClick={() => handleUploadClick(payment)}>
                      <Upload className="h-4 w-4 mr-2" />
                      {t("utilities.uploadProof")}
                    </Button>
                  )}

                  {isManager && payment.proof_of_payment_url && payment.proof_review_status === 'pending' && (
                    <Button size="sm" onClick={() => handleReviewClick(payment)}>
                      {t("utilities.reviewProof")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
