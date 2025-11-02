import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, CheckCircle2, Edit } from 'lucide-react';
import { useRentAgreementMutations } from '@/hooks/useRentAgreements';

const ibanSchema = z.object({
  iban: z
    .string()
    .min(15, 'IBAN must be at least 15 characters')
    .max(34, 'IBAN must not exceed 34 characters')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Invalid IBAN format (e.g., DE89370400440532013000)'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the SEPA mandate terms',
  }),
});

type IBANFormData = z.infer<typeof ibanSchema>;

interface TenantIBANFormProps {
  agreement: {
    id: string;
    tenant_iban: string | null;
    mandate_status: string;
    rent_amount_cents: number;
    currency: string;
    payment_day: number;
  };
}

export function TenantIBANForm({ agreement }: TenantIBANFormProps) {
  const { t } = useLanguage();
  const { updateIban } = useRentAgreementMutations();
  const [isEditing, setIsEditing] = useState(!agreement.tenant_iban);

  const form = useForm<IBANFormData>({
    resolver: zodResolver(ibanSchema),
    defaultValues: {
      iban: agreement.tenant_iban || '',
      consent: false,
    },
  });

  const onSubmit = (data: IBANFormData) => {
    updateIban.mutate({
      agreement_id: agreement.id,
      tenant_iban: data.iban.toUpperCase().replace(/\s/g, ''),
    });
    setIsEditing(false);
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  if (agreement.tenant_iban && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t('rentAgreements.ibanConfigured')}
          </CardTitle>
          <CardDescription>{t('rentAgreements.ibanConfiguredDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('rentAgreements.iban')}</p>
              <p className="font-mono text-xs sm:text-sm break-all">
                {agreement.tenant_iban.replace(/(.{4})/g, '$1 ').trim()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('rentAgreements.mandateStatus')}</p>
              <p className="capitalize">{agreement.mandate_status}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Drawer open={isEditing} onOpenChange={setIsEditing}>
      <DrawerTrigger asChild>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle>{t('rentAgreements.setupPayment')}</CardTitle>
            <CardDescription>{t('rentAgreements.setupPaymentDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                {t('rentAgreements.paymentInfo')
                  .replace('{amount}', formatCurrency(agreement.rent_amount_cents, agreement.currency))
                  .replace('{day}', agreement.payment_day.toString())}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t('rentAgreements.setupPayment')}</DrawerTitle>
          <DrawerDescription>{t('rentAgreements.setupPaymentDescription')}</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4 max-h-[60vh]">
          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              {t('rentAgreements.paymentInfo')
                .replace('{amount}', formatCurrency(agreement.rent_amount_cents, agreement.currency))
                .replace('{day}', agreement.payment_day.toString())}
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('rentAgreements.iban')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DE89370400440532013000"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/\s/g, '');
                          field.onChange(value);
                        }}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('rentAgreements.ibanDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('rentAgreements.sepaConsent')}</FormLabel>
                      <FormDescription className="text-xs">
                        {t('rentAgreements.sepaConsentDescription')}
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DrawerFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={updateIban.isPending}>
            {updateIban.isPending ? t('common.loading') : t('common.submit')}
          </Button>
          <DrawerClose asChild>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                form.reset();
              }}
            >
              {t('common.cancel')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
