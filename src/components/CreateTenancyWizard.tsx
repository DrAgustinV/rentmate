import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  Mail, 
  Shield, 
  FileSignature, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Lock,
  Smartphone,
  FileText,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UtilityConfig, UtilitiesConfig, CreateTenancyRequirementInput } from "@/hooks/useTenancyRequirements";

const UTILITY_TYPES = ['electricity', 'water', 'gas', 'internet', 'heating', 'trash'] as const;

const formSchema = z.object({
  tenant_email: z.string().email("Valid email required"),
  require_email_verification: z.boolean().default(true),
  require_kyc_verification: z.boolean().default(false),
  require_phone_verification: z.boolean().default(false),
  contract_method: z.enum(['digital', 'manual', 'none']),
  selected_template_id: z.string().nullable(),
  rent_amount: z.string().min(1, "Rent amount is required"),
  currency: z.string().default('EUR'),
  security_deposit: z.string().min(1, "Security deposit is required"),
  payment_day: z.string().min(1, "Payment day is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  utilities_config: z.record(z.enum(['manager_pays', 'tenant_pays', 'not_applicable'])).default({}),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTenancyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyCountry?: string;
  templates?: Array<{ id: string; document_title: string }>;
  onSubmit: (data: CreateTenancyRequirementInput) => Promise<void>;
  isSubmitting?: boolean;
  initialData?: {
    tenant_email?: string;
    rent_amount_cents?: number | null;
    currency?: string | null;
    security_deposit_cents?: number | null;
    payment_day?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    contract_method?: string | null;
    require_email_verification?: boolean | null;
    require_kyc_verification?: boolean | null;
    utilities_config?: UtilitiesConfig | Record<string, unknown> | null;
  } | null;
}

const STEPS = [
  { id: 'tenant', label: 'Tenant', icon: Mail },
  { id: 'verification', label: 'Verification', icon: Shield },
  { id: 'contract', label: 'Contract', icon: FileSignature },
  { id: 'rent', label: 'Rent', icon: FileText },
  { id: 'utilities', label: 'Utilities', icon: Zap },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const;

export function CreateTenancyWizard({
  open,
  onOpenChange,
  propertyId,
  propertyCountry,
  templates = [],
  onSubmit,
  isSubmitting = false,
  initialData,
}: CreateTenancyWizardProps) {
  const { t } = useLanguage();
  const { canUseGovernmentIdKYC, isFree } = useSubscription();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  
  const canUseGovId = canUseGovernmentIdKYC();

  // Only allow submission after user has been on review step for a moment
  useEffect(() => {
    if (currentStep === STEPS.length - 1) {
      const timer = setTimeout(() => setIsReadyToSubmit(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsReadyToSubmit(false);
    }
  }, [currentStep]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenant_email: initialData?.tenant_email || '',
      require_email_verification: initialData?.require_email_verification ?? true,
      require_kyc_verification: initialData?.require_kyc_verification ?? false,
      require_phone_verification: false,
      contract_method: (initialData?.contract_method as 'digital' | 'manual' | 'none') || 'manual',
      selected_template_id: null,
      rent_amount: initialData?.rent_amount_cents ? (initialData.rent_amount_cents / 100).toString() : '',
      currency: initialData?.currency || 'EUR',
      security_deposit: initialData?.security_deposit_cents ? (initialData.security_deposit_cents / 100).toString() : '',
      payment_day: initialData?.payment_day?.toString() || '1',
      start_date: initialData?.start_date || '',
      end_date: initialData?.end_date || '',
      utilities_config: (initialData?.utilities_config as Record<string, UtilityConfig>) || {
        electricity: 'not_applicable',
        water: 'not_applicable',
        gas: 'not_applicable',
        internet: 'not_applicable',
        heating: 'not_applicable',
        trash: 'not_applicable',
      },
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        tenant_email: initialData.tenant_email || '',
        require_email_verification: initialData.require_email_verification ?? true,
        require_kyc_verification: initialData.require_kyc_verification ?? false,
        require_phone_verification: false,
        contract_method: (initialData.contract_method as 'digital' | 'manual' | 'none') || 'manual',
        selected_template_id: null,
        rent_amount: initialData.rent_amount_cents ? (initialData.rent_amount_cents / 100).toString() : '',
        currency: initialData.currency || 'EUR',
        security_deposit: initialData.security_deposit_cents ? (initialData.security_deposit_cents / 100).toString() : '',
        payment_day: initialData.payment_day?.toString() || '1',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        utilities_config: (initialData.utilities_config as Record<string, UtilityConfig>) || {
          electricity: 'not_applicable',
          water: 'not_applicable',
          gas: 'not_applicable',
          internet: 'not_applicable',
          heating: 'not_applicable',
          trash: 'not_applicable',
        },
      });
    }
  }, [open, initialData, form]);

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: FormData) => {
    // Guard: Only allow submission if explicitly ready AND on last step
    if (!isReadyToSubmit || currentStep !== STEPS.length - 1) {
      console.log('Blocked premature submission', { isReadyToSubmit, currentStep });
      return;
    }
    
    const input: CreateTenancyRequirementInput = {
      property_id: propertyId,
      tenant_email: data.tenant_email,
      require_email_verification: data.require_email_verification,
      require_kyc_verification: data.require_kyc_verification,
      require_phone_verification: data.require_phone_verification,
      contract_method: data.contract_method,
      selected_template_id: data.selected_template_id,
      rent_amount_cents: data.rent_amount ? Math.round(parseFloat(data.rent_amount) * 100) : null,
      currency: data.currency,
      security_deposit_cents: data.security_deposit ? Math.round(parseFloat(data.security_deposit) * 100) : null,
      payment_day: data.payment_day ? parseInt(data.payment_day) : null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      utilities_config: data.utilities_config as UtilitiesConfig,
    };
    await onSubmit(input);
    // Don't close dialog here - let parent control closing after successful save
    form.reset();
    setCurrentStep(0);
  };

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 0: return ['tenant_email'];
      case 1: return ['require_email_verification', 'require_kyc_verification'];
      case 2: return ['contract_method'];
      case 3: return ['rent_amount', 'currency', 'security_deposit', 'payment_day', 'start_date'];
      case 4: return ['utilities_config'];
      default: return [];
    }
  };

  const isEUCountry = ['ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'BE', 'AT', 'PL', 'GR'].includes(propertyCountry || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tenancy.wizard.title') || 'New Tenancy Setup'}</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 whitespace-nowrap",
                    isActive && "font-medium text-primary",
                    !isActive && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            onKeyDown={(e) => {
              // Prevent Enter key from submitting form prematurely (only allow on last step)
              if (e.key === 'Enter' && currentStep !== STEPS.length - 1) {
                e.preventDefault();
              }
            }}
            className="space-y-6"
          >
            {/* Step 1: Tenant Email */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {t('tenancy.wizard.tenantInfo') || 'Tenant Information'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.tenantInfoDesc') || 'Enter the email address of the tenant you want to invite'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="tenant_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dialogs.inviteTenant.emailLabel') || 'Email Address'} *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t('placeholders.tenantEmail')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Verification Requirements */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('tenancy.wizard.verification') || 'Verification Requirements'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.verificationDesc') || 'Choose which verifications the tenant must complete'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="require_email_verification"
                    render={({ field }) => (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="font-medium">{t('tenancy.wizard.emailVerification') || 'Email Verification'}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('tenancy.wizard.emailVerificationDesc') || 'Tenant must verify their email address'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="require_kyc_verification"
                    render={({ field }) => (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Label className="font-medium">{t('tenancy.wizard.kycVerification') || 'ID Verification'}</Label>
                              <p className="text-sm text-muted-foreground">
                                {t('tenancy.wizard.kycVerificationDesc') || 'Tenant must verify their identity'}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                        
                        {/* Show info about available ID verification methods based on plan */}
                        {field.value && (
                          <Alert className="bg-muted/50">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {canUseGovId ? (
                                <>
                                  <span className="font-medium">{t('tenancy.wizard.availableMethod') || 'Available method'}:</span> {t('tenancy.wizard.governmentIdVerification') || 'Government ID verification'}
                                </>
                              ) : (
                                <>
                                  <span className="block text-muted-foreground">
                                    <Lock className="h-3 w-3 inline mr-1" />
                                    {t('tenancy.wizard.upgradeForIdVerification') || 'Upgrade to PRO for ID verification'}
                                  </span>
                                </>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  />

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{t('tenancy.wizard.phoneVerification') || 'Phone Verification'}</Label>
                          <Badge variant="secondary" className="text-xs">
                            {t('common.comingSoon') || 'Coming Soon'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('tenancy.wizard.phoneVerificationDesc') || 'Tenant must verify their phone number'}
                        </p>
                      </div>
                    </div>
                    <Switch disabled />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Contract Method */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5" />
                    {t('tenancy.wizard.contract') || 'Contract Signing'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.contractDesc') || 'Choose how the rental contract will be signed'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contract_method"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        className="space-y-3"
                      >
                        <label className={cn(
                          "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                          field.value === 'digital' && "border-primary bg-primary/5"
                        )}>
                          <RadioGroupItem value="digital" className="mt-1" />
                          <div className="flex-1">
                            <span className="font-medium">{t('tenancy.wizard.digitalSignature') || 'Digital Signature'}</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('tenancy.wizard.digitalSignatureDesc') || 'Legally binding electronic signature'}
                            </p>
                          </div>
                        </label>

                        <label className={cn(
                          "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                          field.value === 'manual' && "border-primary bg-primary/5"
                        )}>
                          <RadioGroupItem value="manual" className="mt-1" />
                          <div className="flex-1">
                            <span className="font-medium">{t('tenancy.wizard.manualSignature') || 'Manual / Paper'}</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('tenancy.wizard.manualSignatureDesc') || 'Sign physically and upload scanned copy'}
                            </p>
                          </div>
                        </label>

                        <label className={cn(
                          "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                          field.value === 'none' && "border-primary bg-primary/5"
                        )}>
                          <RadioGroupItem value="none" className="mt-1" />
                          <div className="flex-1">
                            <span className="font-medium">{t('tenancy.wizard.skipContract') || 'Skip for Now'}</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('tenancy.wizard.skipContractDesc') || 'Set up contract signing later'}
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    )}
                  />

                  {form.watch('contract_method') && form.watch('contract_method') !== 'none' && templates.length > 0 && (
                    <>
                      <Separator />
                      <FormField
                        control={form.control}
                        name="selected_template_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('tenancy.wizard.selectTemplate') || 'Select Contract Template'}</FormLabel>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('tenancy.wizard.selectTemplatePlaceholder') || 'Choose a template...'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      {template.document_title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('tenancy.wizard.selectTemplateDesc') || 'Select the contract document to be signed'}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Rent & Deposits */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('tenancy.wizard.rent') || 'Rent & Deposits'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.rentDesc') || 'Set up rent amount, payment schedule, and deposits'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rent_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.rentAmount')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1200.00"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.currency')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="security_deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.securityDeposit')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="2400.00"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.paymentDay')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.startDate')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('rentAgreement.endDate')} ({t('common.optional')})</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Utilities */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {t('tenancy.wizard.utilities') || 'Utilities Setup'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.utilitiesDesc') || 'Define who is responsible for each utility'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {UTILITY_TYPES.map((utility) => (
                      <div key={utility} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="capitalize font-medium">
                          {t(`utilities.types.${utility}`) || utility}
                        </Label>
                        <FormField
                          control={form.control}
                          name={`utilities_config.${utility}` as any}
                          render={({ field }) => (
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('common.na') || 'N/A'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manager_pays">
                                  {t('utilities.managerPays') || 'Manager Pays'}
                                </SelectItem>
                                <SelectItem value="tenant_pays">
                                  {t('utilities.tenantPays') || 'Tenant Pays & Uploads'}
                                </SelectItem>
                                <SelectItem value="not_applicable">
                                  {t('utilities.notApplicable') || 'Not Applicable'}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Review */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    {t('tenancy.wizard.review') || 'Review & Confirm'}
                  </CardTitle>
                  <CardDescription>
                    {t('tenancy.wizard.reviewDesc') || 'Review the tenancy setup before sending the invitation'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tenant */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{t('tenancy.wizard.tenantInfo') || 'Tenant'}</span>
                    </div>
                    <p className="text-sm">{form.watch('tenant_email')}</p>
                  </div>

                  {/* Verification */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{t('tenancy.wizard.verification') || 'Verification'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch('require_email_verification') && (
                        <Badge variant="secondary">{t('tenancy.wizard.emailVerification') || 'Email'}</Badge>
                      )}
                      {form.watch('require_kyc_verification') && (
                        <Badge variant="secondary">{t('tenancy.wizard.kycVerification') || 'KYC'}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Contract */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{t('tenancy.wizard.contract') || 'Contract'}</span>
                    </div>
                    <p className="text-sm capitalize">
                      {form.watch('contract_method') === 'digital' && (t('tenancy.wizard.digitalSignature') || 'Digital Signature')}
                      {form.watch('contract_method') === 'manual' && (t('tenancy.wizard.manualSignature') || 'Manual / Paper')}
                      {form.watch('contract_method') === 'none' && (t('tenancy.wizard.skipContract') || 'Skipped')}
                      {!form.watch('contract_method') && 'Not configured'}
                    </p>
                  </div>

                  {/* Rent */}
                  {form.watch('rent_amount') && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{t('tenancy.wizard.rent') || 'Rent'}</span>
                      </div>
                      <p className="text-sm">
                        {form.watch('rent_amount')} {form.watch('currency')} / {t('common.month') || 'month'}
                        {form.watch('security_deposit') && ` • ${t('rentAgreement.securityDeposit')}: ${form.watch('security_deposit')} ${form.watch('currency')}`}
                      </p>
                    </div>
                  )}

                  {/* Utilities */}
                  {Object.keys(form.watch('utilities_config') || {}).length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{t('tenancy.wizard.utilities') || 'Utilities'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(form.watch('utilities_config') || {}).map(([utility, config]) => (
                          config && (
                            <Badge key={utility} variant="outline" className="capitalize text-xs">
                              {utility}: {config === 'tenant_pays' ? 'Tenant' : config === 'manager_pays' ? 'Manager' : 'N/A'}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {currentStep === 0 ? t('common.cancel') : t('common.back')}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  disabled={isSubmitting || !isReadyToSubmit}
                  onClick={() => form.handleSubmit(handleSubmit)()}
                >
                  {isSubmitting ? t('common.saving') || 'Saving...' : t('tenancy.wizard.saveSetup') || 'Save Setup'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
