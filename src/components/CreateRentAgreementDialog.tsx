import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useRentAgreementMutations } from '@/hooks/useRentAgreements';

const rentAgreementSchema = z.object({
  tenancy_id: z.string().min(1, 'Please select a tenant'),
  tenant_id: z.string().min(1),
  rent_amount: z.string().min(1, 'Rent amount is required').refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Rent amount must be a positive number' }
  ),
  payment_day: z.string().min(1, 'Payment day is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date().optional(),
  currency: z.string().min(1, 'Currency is required'),
});

type RentAgreementFormData = z.infer<typeof rentAgreementSchema>;

interface CreateRentAgreementDialogProps {
  propertyId: string;
  activeTenant?: {
    id: string;
    tenant_id: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  };
  trigger?: React.ReactNode;
}

export function CreateRentAgreementDialog({
  propertyId,
  activeTenant,
  trigger,
}: CreateRentAgreementDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { createAgreement } = useRentAgreementMutations();

  const form = useForm<RentAgreementFormData>({
    resolver: zodResolver(rentAgreementSchema),
    defaultValues: {
      tenancy_id: activeTenant?.id || '',
      tenant_id: activeTenant?.tenant_id || '',
      rent_amount: '',
      payment_day: '1',
      currency: 'eur',
    },
  });

  const onSubmit = (data: RentAgreementFormData) => {
    const agreementData = {
      property_id: propertyId,
      tenancy_id: data.tenancy_id,
      tenant_id: data.tenant_id,
      rent_amount_cents: Math.round(parseFloat(data.rent_amount) * 100),
      payment_day: parseInt(data.payment_day),
      start_date: format(data.start_date, 'yyyy-MM-dd'),
      end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : undefined,
      currency: data.currency,
    };

    createAgreement.mutate(agreementData);
    setOpen(false);
    form.reset();
  };

  if (!activeTenant) {
    return null;
  }

  const tenantName = `${activeTenant.profiles.first_name || ''} ${activeTenant.profiles.last_name || ''}`.trim() || activeTenant.profiles.email;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>{t('rentAgreements.createAgreement')}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('rentAgreements.createAgreement')}</DialogTitle>
          <DialogDescription>{t('rentAgreements.createAgreementDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenancy_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('rentAgreements.tenant')}</FormLabel>
                  <FormControl>
                    <Input value={tenantName} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rent_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('rentAgreements.rentAmount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('rentAgreements.currency')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('rentAgreements.paymentDay')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('rentAgreements.paymentDayDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('rentAgreements.startDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('rentAgreements.selectDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('rentAgreements.endDate')} {t('common.optional')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('rentAgreements.selectDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < (form.getValues('start_date') || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createAgreement.isPending}>
                {createAgreement.isPending ? t('common.loading') : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
