import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const rentAgreementSchema = z.object({
  rent_amount: z.string().min(1, 'Rent amount is required').refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Rent amount must be a positive number' }
  ),
  security_deposit: z.string().optional().refine(
    (val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Security deposit must be a positive number or zero' }
  ),
  deposit_return_days: z.string().optional(),
  utilities_tenant: z.string().optional(),
  utilities_manager: z.string().optional(),
  payment_day: z.string().min(1, 'Payment day is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date().optional(),
  currency: z.string().min(1, 'Currency is required'),
});

type RentAgreementFormData = z.infer<typeof rentAgreementSchema>;

interface RentAgreement {
  id: string;
  rent_amount_cents: number;
  payment_day: number;
  start_date: string;
  end_date: string | null;
  currency: string;
  security_deposit_cents: number | null;
  deposit_return_days: number | null;
  utilities_tenant_responsible: string | null;
  utilities_manager_responsible: string | null;
  mandate_status: string;
}

interface EditRentAgreementDrawerProps {
  agreement: RentAgreement;
  isContractSigning: boolean;
  trigger?: React.ReactNode;
}

export function EditRentAgreementDrawer({
  agreement,
  isContractSigning,
  trigger,
}: EditRentAgreementDrawerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { updateAgreement } = useRentAgreementMutations();

  const form = useForm<RentAgreementFormData>({
    resolver: zodResolver(rentAgreementSchema),
    defaultValues: {
      rent_amount: (agreement.rent_amount_cents / 100).toString(),
      security_deposit: agreement.security_deposit_cents 
        ? (agreement.security_deposit_cents / 100).toString() 
        : '',
      deposit_return_days: agreement.deposit_return_days?.toString() || '30',
      utilities_tenant: agreement.utilities_tenant_responsible || '',
      utilities_manager: agreement.utilities_manager_responsible || '',
      payment_day: agreement.payment_day.toString(),
      start_date: parseISO(agreement.start_date),
      end_date: agreement.end_date ? parseISO(agreement.end_date) : undefined,
      currency: agreement.currency,
    },
  });

  const handleFormSubmit = (data: RentAgreementFormData) => {
    // Show warning dialog if mandate is active or contract was signed
    if (agreement.mandate_status === 'active') {
      setShowWarning(true);
      return;
    }
    
    submitUpdate(data);
  };

  const submitUpdate = (data: RentAgreementFormData) => {
    const updateData = {
      agreement_id: agreement.id,
      rent_amount_cents: Math.round(parseFloat(data.rent_amount) * 100),
      security_deposit_cents: data.security_deposit && data.security_deposit !== '' 
        ? Math.round(parseFloat(data.security_deposit) * 100) 
        : null,
      deposit_return_days: data.deposit_return_days ? parseInt(data.deposit_return_days) : 30,
      utilities_tenant_responsible: data.utilities_tenant || null,
      utilities_manager_responsible: data.utilities_manager || null,
      payment_day: parseInt(data.payment_day),
      start_date: format(data.start_date, 'yyyy-MM-dd'),
      end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : null,
      currency: data.currency,
    };

    updateAgreement.mutate(updateData, {
      onSuccess: () => {
        setOpen(false);
        setShowWarning(false);
        form.reset();
      }
    });
  };

  const handleWarningConfirm = () => {
    const data = form.getValues();
    submitUpdate(data);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger || (
            <Button 
              variant="outline" 
              size="sm"
              disabled={isContractSigning}
              title={isContractSigning ? "Cannot edit during contract signing" : "Edit rent agreement"}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Edit Rent Agreement</DrawerTitle>
            <DrawerDescription>
              Update the rent agreement details. Tenant will be notified of changes.
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-4 max-h-[60vh]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="security_deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit ({t('common.optional')})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="2000.00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Amount held as security deposit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deposit_return_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Return Period ({t('common.optional')})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Days to return deposit after tenancy ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="utilities_tenant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Utilities ({t('common.optional')})</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Electricity, Water, Gas"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of utilities paid by tenant
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="utilities_manager"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Utilities ({t('common.optional')})</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Heating, Internet"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of utilities paid by manager
                        </FormDescription>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <FormLabel>{t('rentAgreements.endDate')} ({t('common.optional')})</FormLabel>
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
              </form>
            </Form>
          </div>

          <DrawerFooter>
            <Button 
              type="submit" 
              onClick={form.handleSubmit(handleFormSubmit)} 
              disabled={updateAgreement.isPending}
            >
              {updateAgreement.isPending ? t('common.loading') : t('common.save')}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                {t('common.cancel')}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              This rent agreement has an active SEPA mandate. Changing the agreement details will notify the tenant, and may require updating the payment mandate. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
