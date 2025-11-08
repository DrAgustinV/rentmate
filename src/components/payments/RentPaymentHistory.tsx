import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, Eye, XCircle, Bell, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ProofOfPaymentUpload } from '@/components/ProofOfPaymentUpload';
import { PaymentProofReview } from './PaymentProofReview';
import { PaymentStatistics } from './PaymentStatistics';
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
  reminder_sent?: boolean;
  reminder_type?: 'upcoming' | 'overdue';
  reminder_sent_at?: string;
  reminder_count?: number;
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

  useEffect(() => {
    fetchPayments();
  }, [propertyId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          payment_reminders:payment_reminders(
            reminder_type,
            sent_at,
            status
          )
        `)
        .eq('property_id', propertyId)
        .order('payment_due_date', { ascending: false });

      if (error) throw error;
      
      const mappedPayments: RentPayment[] = (data || []).map(p => {
        const reminders = (p as any).payment_reminders || [];
        const latestReminder = reminders.length > 0 
          ? reminders.sort((a: any, b: any) => 
              new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
            )[0]
          : null;

        return {
          ...p,
          proof_review_status: (p.proof_review_status as 'pending' | 'approved' | 'rejected') || 'pending',
          reminder_sent: reminders.length > 0,
          reminder_type: latestReminder?.reminder_type,
          reminder_sent_at: latestReminder?.sent_at,
          reminder_count: reminders.filter((r: any) => r.status === 'sent').length,
        };
      });
      
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

      toast.success('Payment marked as received');
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMarking(null);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("payments.status.paid")}
          </Badge>
        );
      case 'proof_uploaded':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
            <Upload className="h-3 w-3" />
            {t("payments.status.proofUploaded")}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("payments.status.pending")}
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("payments.status.overdue")}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("payments.status.failed")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProofReviewBadge = (payment: RentPayment) => {
    if (!payment.proof_of_payment_url && payment.status !== 'proof_uploaded') return null;
    
    switch (payment.proof_review_status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("payments.proofReview.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("payments.proofReview.rejected")}
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("payments.proofReview.pendingReview")}
          </Badge>
        );
    }
  };

  const getReminderBadge = (payment: RentPayment) => {
    if (!payment.reminder_sent || !payment.reminder_sent_at) return null;
    
    const reminderDate = format(new Date(payment.reminder_sent_at), 'MMM d, HH:mm');
    const variant = payment.reminder_type === 'overdue' ? 'destructive' : 'secondary';
    
    return (
      <Badge variant={variant} className="gap-1">
        <Bell className="h-3 w-3" />
        {payment.reminder_count && payment.reminder_count > 1 
          ? `${payment.reminder_count} ${t("payments.reminders.sent")}`
          : `${t("payments.reminders.sentOn")} ${reminderDate}`}
      </Badge>
    );
  };

  const getUrgencyIndicator = (payment: RentPayment) => {
    if (isManager) return null;
    
    const daysLate = differenceInDays(new Date(), new Date(payment.payment_due_date));
    
    if (payment.status === 'overdue' || (payment.status === 'pending' && daysLate > 0)) {
      return (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t("payments.urgency.overdue")} - {daysLate} {t("common.days")} {t("common.late")}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  const getProofThumbnail = (payment: RentPayment) => {
    if (!payment.proof_of_payment_url) return null;

    const { data } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(payment.proof_of_payment_url);

    const isPdf = payment.proof_of_payment_url.toLowerCase().endsWith('.pdf');

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileImage className="h-3 w-3" />
        {isPdf ? (
          <span>PDF</span>
        ) : (
          <img 
            src={data.publicUrl} 
            alt="Proof thumbnail" 
            className="h-8 w-8 object-cover rounded border"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    );
  };

  const upcomingPayments = payments.filter(p => p.status === 'pending' && new Date(p.payment_due_date) >= new Date());
  const pastPayments = payments.filter(p => p.status !== 'pending' || new Date(p.payment_due_date) < new Date());

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasPayments = payments.length > 0;

  return (
    <div className="space-y-6">
      {/* Payment Statistics */}
      <PaymentStatistics payments={payments} hasData={hasPayments} />
      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("payments.upcomingPaymentsTitle")}
          </CardTitle>
          <CardDescription>{t("payments.upcomingPaymentsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingPayments.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t("payments.emptyStates.noUpcoming")}
              description={hasRentAgreement ? t("payments.emptyStates.noPaymentsDesc") : t("payments.emptyStates.waitingForAgreement")}
              variant="info"
            />
          ) : (
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div key={payment.id} className="space-y-2">
                  {getUrgencyIndicator(payment)}
                  <div className={`flex items-center justify-between p-4 border rounded-lg ${
                    !isManager && payment.reminder_sent 
                      ? payment.reminder_type === 'overdue' 
                        ? 'border-l-4 border-l-destructive' 
                        : 'border-l-4 border-l-primary'
                      : ''
                  }`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {!isManager && payment.reminder_sent && (
                          <Bell className={`h-4 w-4 ${
                            payment.reminder_type === 'overdue' ? 'text-destructive animate-pulse' : 'text-primary'
                          }`} />
                        )}
                        <p className="font-medium">
                          {formatCurrency(payment.amount_cents, payment.currency)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("common.due")}: {format(new Date(payment.payment_due_date), 'PPP')}
                      </p>
                      {!isManager && payment.reminder_sent && payment.reminder_sent_at && (
                        <p className="text-xs text-muted-foreground">
                          {t("payments.reminders.sentOn")} {format(new Date(payment.reminder_sent_at), 'PPP')}
                        </p>
                      )}
                      {getProofThumbnail(payment)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(payment.status)}
                        {getProofReviewBadge(payment)}
                        {isManager && getReminderBadge(payment)}
                      </div>
                      {!isManager && (payment.status === 'pending' || payment.proof_review_status === 'rejected') && !payment.proof_of_payment_url && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPaymentId(payment.id);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {payment.proof_review_status === 'rejected' 
                            ? t("payments.reuploadProofBtn")
                            : t("payments.uploadProofBtn")}
                        </Button>
                      )}
                      {isManager && (payment.proof_of_payment_url || payment.status === 'proof_uploaded') && !payment.manager_reviewed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewPayment(payment);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("payments.reviewProofBtn")}
                        </Button>
                      )}
                      {isManager && payment.status === 'pending' && !payment.proof_of_payment_url && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(payment.id)}
                          disabled={marking === payment.id}
                        >
                          {marking === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t("payments.markAsPaidBtn")
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("payments.paymentHistoryTitle")}
          </CardTitle>
          <CardDescription>{t("payments.paymentHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {pastPayments.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title={t("payments.emptyStates.noHistory")}
              description={t("payments.emptyStates.noPaymentsDesc")}
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
                    <TableHead>{t("common.paidOn")}</TableHead>
                    {isManager && <TableHead>{t("common.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!isManager && payment.reminder_sent && (
                            <Bell className={`h-3 w-3 ${
                              payment.reminder_type === 'overdue' ? 'text-destructive' : 'text-primary'
                            }`} />
                          )}
                          {format(new Date(payment.payment_due_date), 'PP')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount_cents, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(payment.status)}
                          {getProofReviewBadge(payment)}
                          {isManager && getReminderBadge(payment)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.payment_received_date
                          ? format(new Date(payment.payment_received_date), 'PP')
                          : '-'}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.proof_of_payment_url && !payment.manager_reviewed && (
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
                            {payment.status === 'pending' && !payment.proof_of_payment_url && (
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
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPaymentId && (
        <ProofOfPaymentUpload
          paymentId={selectedPaymentId}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={fetchPayments}
        />
      )}

      {reviewPayment && (
        <PaymentProofReview
          paymentId={reviewPayment.id}
          proofUrl={reviewPayment.proof_of_payment_url || ""}
          tenantName="Tenant"
          amount={reviewPayment.amount_cents}
          currency={reviewPayment.currency}
          uploadedAt={reviewPayment.tenant_confirmed_at || new Date().toISOString()}
          open={reviewDialogOpen}
          onOpenChange={(open) => {
            setReviewDialogOpen(open);
            if (!open) {
              setReviewPayment(null);
              fetchPayments();
            }
          }}
        />
      )}
    </div>
  );
}
