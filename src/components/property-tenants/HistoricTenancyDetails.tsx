import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { paymentService } from "@/services";
import { format } from "date-fns";
import { User, Calendar, DollarSign, CreditCard, Ticket, CheckCircle, Clock } from "lucide-react";

interface HistoricTenancyDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenancy: {
    id: string;
    tenant_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    started_at: string;
    ended_at: string | null;
  };
  propertyId: string;
}

interface RentAgreement {
  monthly_rent_cents: number;
  currency: string;
  is_active: boolean;
}

interface PaymentSummary {
  totalPaid: number;
  lastPaymentDate: string | null;
  totalPayments: number;
}

interface TicketSummary {
  total: number;
  resolved: number;
  open: number;
}

export function HistoricTenancyDetails({
  open,
  onOpenChange,
  tenancy,
  propertyId,
}: HistoricTenancyDetailsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rentAgreement, setRentAgreement] = useState<RentAgreement | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [ticketSummary, setTicketSummary] = useState<TicketSummary | null>(null);

  useEffect(() => {
    if (!open || !tenancy.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch rent agreement for this tenancy
        const { data: agreements } = await supabase
          .from('rent_agreements')
          .select('monthly_rent_cents, currency, is_active')
          .eq('tenancy_id', tenancy.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setRentAgreement(agreements);

        // Fetch payment summary for this tenancy
        const payments = await paymentService.getRentPaymentSummary(tenancy.tenant_id, propertyId);

        if (payments && payments.length > 0) {
          const totalPaid = payments.reduce((sum, p) => sum + p.amount_cents, 0);
          setPaymentSummary({
            totalPaid,
            lastPaymentDate: payments[0]?.payment_received_date || null,
            totalPayments: payments.length,
          });
        }

        // Fetch ticket summary for this property and tenant
        const { data: tickets } = await supabase
          .from('tickets')
          .select('status')
          .eq('property_id', propertyId)
          .eq('tenant_id', tenancy.tenant_id);

        if (tickets) {
          setTicketSummary({
            total: tickets.length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            open: tickets.filter(t => t.status !== 'resolved').length,
          });
        }
      } catch (error) {
        console.error('Error fetching historic tenancy details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, tenancy.id, tenancy.tenant_id, propertyId]);

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const tenantName = tenancy.first_name && tenancy.last_name
    ? `${tenancy.first_name} ${tenancy.last_name}`
    : tenancy.first_name || tenancy.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("historicTenancies.details.title")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tenant Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("historicTenancies.details.tenantInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("common.name")}</span>
                    <span className="text-sm font-medium">{tenantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{tenancy.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tenancy Period */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("historicTenancies.details.tenancyPeriod")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("historicTenancies.details.startDate")}</span>
                    <span className="text-sm font-medium">
                      {tenancy.started_at ? format(new Date(tenancy.started_at), 'PP') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("historicTenancies.details.endDate")}</span>
                    <span className="text-sm font-medium">
                      {tenancy.ended_at ? format(new Date(tenancy.ended_at), 'PP') : '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rent Agreement */}
            {rentAgreement && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("historicTenancies.details.rentAgreement")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("historicTenancies.details.monthlyRent")}</span>
                    <span className="text-sm font-medium">
                      {rentAgreement.monthly_rent_cents
                        ? formatCurrency(rentAgreement.monthly_rent_cents, rentAgreement.currency)
                        : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {paymentSummary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t("historicTenancies.details.paymentSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("historicTenancies.details.totalPaid")}</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(paymentSummary.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("historicTenancies.details.lastPayment")}</span>
                      <span className="text-sm font-medium">
                        {paymentSummary.lastPaymentDate
                          ? format(new Date(paymentSummary.lastPaymentDate), 'PP')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tickets Summary */}
            {ticketSummary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    {t("historicTenancies.details.ticketsSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("historicTenancies.details.totalTickets")}</span>
                      <span className="text-sm font-medium">{ticketSummary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {t("historicTenancies.details.resolved")}
                      </span>
                      <span className="text-sm font-medium text-green-600">{ticketSummary.resolved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        {t("historicTenancies.details.open")}
                      </span>
                      <span className="text-sm font-medium text-amber-600">{ticketSummary.open}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HistoricTenancyDetails;