import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, CheckCircle2, Clock, Loader2, Upload, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProofOfPaymentUpload } from '@/components/ProofOfPaymentUpload';
import { PaymentProofReview } from './PaymentProofReview';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';

interface RentPayment {
  id: string;
  rent_agreement_id: string;
  property_id: string;
  tenant_id: string;
  manager_id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  payment_received_date: string | null;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  proof_of_payment_url?: string;
  tenant_confirmed?: boolean;
  tenant_confirmed_at?: string;
  manager_reviewed?: boolean;
  manager_reviewed_at?: string;
  proof_review_status?: 'pending' | 'approved' | 'rejected';
  proof_review_notes?: string;
}

interface RentPaymentHistoryProps {
  propertyId: string;
  isManager: boolean;
  hasRentAgreement?: boolean;
}

export function RentPaymentHistory({ propertyId, isManager, hasRentAgreement = true }: RentPaymentHistoryProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [marking, setMarking] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<RentPayment | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [propertyId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_due_date', { ascending: false });

      if (error) throw error;
      
      const mappedPayments: RentPayment[] = (data || []).map(p => ({
        ...p,
        proof_review_status: (p.proof_review_status as 'pending' | 'approved' | 'rejected') || 'pending',
      }));
      
      setPayments(mappedPayments);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    setMarking(paymentId);
    try {
      const { error } = await supabase
        .from('rent_payments')
        .update({
          status: 'paid',
          payment_received_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success(t("payments.toasts.markedPaid"));
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMarking(null);
    }
  };

  const handleRetryPayment = async (paymentId: string) => {
    setRetrying(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke('collect-rent-payment', {
        body: { payment_id: paymentId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t("payments.toasts.collectionInitiated"));
        fetchPayments();
      } else {
        toast.error(data.message || t("payments.toasts.retryFailed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("payments.toasts.retryFailed"));
    } finally {
      setRetrying(null);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  // Simplified status: PAID or DUE
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

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const hasPayments = payments.length > 0;

  return (
    <div className="space-y-4">
      {!hasPayments ? (
        <EmptyState
          icon={DollarSign}
          title={t("payments.emptyStates.noHistory")}
          description={hasRentAgreement ? t("payments.emptyStates.noPaymentsDesc") : t("payments.emptyStates.waitingForAgreement")}
          variant="info"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.dueDate")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.payment_due_date), 'PP')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount_cents, payment.currency)}
                  </TableCell>
                  <TableCell>
                    {getSimpleStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Tenant: Upload proof for unpaid payments */}
                      {!isManager && payment.status !== 'paid' && !payment.proof_of_payment_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPaymentId(payment.id);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {t("payments.uploadProofBtn")}
                        </Button>
                      )}
                      {/* Manager: Review proof */}
                      {isManager && payment.proof_of_payment_url && !payment.manager_reviewed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewPayment(payment);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("payments.reviewBtn")}
                        </Button>
                      )}
                      {/* Manager: Mark as paid */}
                      {isManager && payment.status !== 'paid' && !payment.proof_of_payment_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(payment.id)}
                          disabled={marking === payment.id}
                        >
                          {marking === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t("payments.markPaidBtn")
                          )}
                        </Button>
                      )}
                      {/* Manager: Retry failed payment */}
                      {isManager && payment.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryPayment(payment.id)}
                          disabled={retrying === payment.id}
                        >
                          {retrying === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              {t("common.retry")}
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
      )}

      {/* Upload Proof Dialog */}
      {selectedPaymentId && (
        <ProofOfPaymentUpload
          paymentId={selectedPaymentId}
          open={uploadDialogOpen}
          onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open) setSelectedPaymentId(null);
          }}
          onSuccess={() => {
            fetchPayments();
            setUploadDialogOpen(false);
            setSelectedPaymentId(null);
          }}
        />
      )}

      {/* Review Proof Dialog */}
      {reviewPayment && reviewPayment.proof_of_payment_url && (
        <PaymentProofReview
          paymentId={reviewPayment.id}
          proofUrl={reviewPayment.proof_of_payment_url}
          tenantName=""
          amount={reviewPayment.amount_cents / 100}
          currency={reviewPayment.currency}
          uploadedAt={reviewPayment.updated_at}
          open={reviewDialogOpen}
          onOpenChange={(open) => {
            setReviewDialogOpen(open);
            if (!open) setReviewPayment(null);
          }}
        />
      )}
    </div>
  );
}

export default RentPaymentHistory;
