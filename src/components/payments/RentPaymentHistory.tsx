import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
}

interface RentPaymentHistoryProps {
  propertyId: string;
  isManager: boolean;
}

export function RentPaymentHistory({ propertyId, isManager }: RentPaymentHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

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
      
      // Map database columns to component interface
      const mappedPayments: RentPayment[] = (data || []).map(p => ({
        id: p.id,
        rent_agreement_id: p.rent_agreement_id,
        property_id: p.property_id,
        tenant_id: p.tenant_id,
        manager_id: p.manager_id,
        amount_cents: p.amount_cents,
        currency: p.currency,
        payment_due_date: p.payment_due_date,
        payment_received_date: p.payment_received_date,
        status: p.status,
        payment_method: p.payment_method || 'sepa_direct_debit',
        notes: p.notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
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
                    {getStatusBadge(payment.status)}
                    {isManager && payment.status === 'pending' && (
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
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.payment_received_date
                          ? format(new Date(payment.payment_received_date), 'PP')
                          : '-'}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {payment.status === 'pending' && (
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
    </div>
  );
}
