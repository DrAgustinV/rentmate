import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProofOfPaymentUpload } from '@/components/ProofOfPaymentUpload';
import { PaymentProofReview } from './PaymentProofReview';

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
}

export function RentPaymentHistory({ propertyId, isManager }: RentPaymentHistoryProps) {
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
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProofReviewBadge = (payment: RentPayment) => {
    if (!payment.proof_of_payment_url) return null;
    
    switch (payment.proof_review_status) {
      case "approved":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
    }
  };

  const upcomingPayments = payments.filter(p => p.status === 'pending' && new Date(p.payment_due_date) >= new Date());
  const pastPayments = payments.filter(p => p.status !== 'pending' || new Date(p.payment_due_date) < new Date());

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading payment history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>Rent payments due this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {formatCurrency(payment.amount_cents, payment.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(payment.payment_due_date), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(payment.status)}
                      {getProofReviewBadge(payment)}
                    </div>
                    {!isManager && payment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPaymentId(payment.id);
                          setUploadDialogOpen(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Proof
                      </Button>
                    )}
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
                        Review Proof
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
                          'Mark as Paid'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Previous rent payments</CardDescription>
        </CardHeader>
        <CardContent>
          {pastPayments.length === 0 ? (
            <Alert>
              <AlertDescription>No payment history yet</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid On</TableHead>
                    {isManager && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_due_date), 'PP')}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount_cents, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(payment.status)}
                          {getProofReviewBadge(payment)}
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
                                Review
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
                                  'Mark Paid'
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
