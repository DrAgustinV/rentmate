import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useUtilityTypes } from "@/hooks/useUtilityTypes";
import { Mail, Shield, FileSignature, FileText, Zap, CheckCircle2, ChevronRight, ChevronLeft, Info, Rocket } from "lucide-react";
import { StepTenantEmail, StepVerification, StepContractMethod, StepRentDeposits, StepUtilities, StepReview } from "@/components/tenancy-wizard";

const formSchema = z.object({
  tenant_email: z.string().email("Valid email required").or(z.literal("")).optional(),
  require_email_verification: z.boolean().default(true),
  require_kyc_verification: z.boolean().default(false),
  require_phone_verification: z.boolean().default(false),
  self_manage_only: z.boolean().default(false),
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
  onSubmit: (data: CreateTenancyRequirementInput, mode: 'new' | 'edit' | 'invite' | 'next_tenancy') => Promise<void>;
  onSaveAndStartAnother?: (data: CreateTenancyRequirementInput, mode: 'new' | 'edit' | 'invite' | 'next_tenancy') => Promise<void>;
  isSubmitting?: boolean;
  initialData?: {
    id?: string;
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
  mode?: 'new' | 'edit' | 'invite' | 'next_tenancy';
  invitationExpiryNotice?: boolean;
}

export function CreateTenancyWizard({
  open,
  onOpenChange,
  propertyId,
  propertyCountry,
  templates = [],
  onSubmit,
  onSaveAndStartAnother,
  isSubmitting = false,
  initialData,
  mode = 'new',
  invitationExpiryNotice = false,
}: CreateTenancyWizardProps) {
  const { t } = useLanguage();
  const STEPS = [
    { id: 'tenant', label: t('tenancy.wizard.steps.tenant'), icon: Mail },
    { id: 'verification', label: t('tenancy.wizard.steps.verification'), icon: Shield },
    { id: 'contract', label: t('tenancy.wizard.steps.contract'), icon: FileSignature },
    { id: 'rent', label: t('tenancy.wizard.steps.rent'), icon: FileText },
    { id: 'utilities', label: t('tenancy.wizard.steps.utilities'), icon: Zap },
    { id: 'review', label: t('tenancy.wizard.steps.confirm'), icon: CheckCircle2 },
  ] as const;
  const { canUseGovernmentIdKYC, isFree } = useSubscription();
  const { utilityTypes } = useUtilityTypes();
  const [currentStep, setCurrentStep] = useState(0);
  
  const canUseGovId = canUseGovernmentIdKYC();

  // Fetch property title for display
  const { data: propertyTitle } = useQuery({
    queryKey: ["property-title", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("title")
        .eq("id", propertyId)
        .single();
      if (error) throw error;
      return data?.title;
    },
    enabled: open,
  });

  // Fetch default rent settings from Configuration page
  const { data: defaultSettings } = useQuery({
    queryKey: ["default-rent-settings"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("default_rent_settings")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.default_rent_settings as { require_kyc?: boolean; default_deposit_amount?: number } | null;
    },
    enabled: open && mode === 'new',
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenant_email: initialData?.tenant_email || '',
      require_email_verification: initialData?.require_email_verification ?? true,
      require_kyc_verification: initialData?.require_kyc_verification ?? defaultSettings?.require_kyc ?? false,
      require_phone_verification: false,
      self_manage_only: false,
      contract_method: (initialData?.contract_method as 'digital' | 'manual' | 'none') || 'manual',
      selected_template_id: null,
      rent_amount: initialData?.rent_amount_cents ? (initialData.rent_amount_cents / 100).toString() : '',
      currency: initialData?.currency || 'EUR',
      security_deposit: initialData?.security_deposit_cents
        ? (initialData.security_deposit_cents / 100).toString()
        : defaultSettings?.default_deposit_amount
          ? (defaultSettings.default_deposit_amount / 100).toString()
          : '',
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

  // Reset form when initialData changes (edit/invite mode)
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        tenant_email: initialData.tenant_email || '',
        require_email_verification: initialData.require_email_verification ?? true,
        require_kyc_verification: initialData.require_kyc_verification ?? defaultSettings?.require_kyc ?? false,
        require_phone_verification: false,
        self_manage_only: false,
        contract_method: (initialData.contract_method as 'digital' | 'manual' | 'none') || 'manual',
        selected_template_id: null,
        rent_amount: initialData.rent_amount_cents ? (initialData.rent_amount_cents / 100).toString() : '',
        currency: initialData.currency || 'EUR',
        security_deposit: initialData.security_deposit_cents
          ? (initialData.security_deposit_cents / 100).toString()
          : defaultSettings?.default_deposit_amount
            ? (defaultSettings.default_deposit_amount / 100).toString()
            : '',
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
  }, [open, initialData, form, defaultSettings]);

  // Apply configuration defaults when they load in new mode
  const defaultRequireKyc = defaultSettings?.require_kyc;
  const defaultDepositAmount = defaultSettings?.default_deposit_amount;
  useEffect(() => {
    if (open && mode === 'new' && defaultSettings) {
      form.setValue('require_kyc_verification', defaultRequireKyc ?? false);
      if (defaultDepositAmount) {
        form.setValue('security_deposit', (defaultDepositAmount / 100).toString());
      }
    }
  }, [open, mode, defaultSettings, form, defaultRequireKyc, defaultDepositAmount]);

  const SESSION_KEY = `tenancy-wizard-${propertyId}`;

  // Save on step change and dialog close
  useEffect(() => {
    if (open && mode === 'new') {
      try {
        const values = form.getValues();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          values,
          currentStep,
          mode,
          timestamp: Date.now(),
        }));
      } catch { /* storage full or unavailable */ }
    }
  }, [currentStep, open, mode, form, SESSION_KEY]);

  // Restore saved state on dialog open (for 'new' mode only)
  useEffect(() => {
    if (open && mode === 'new' && !initialData) {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.mode === 'new' && parsed.values) {
            const age = Date.now() - (parsed.timestamp || 0);
            if (age < 3600000) { // 1 hour expiry
              form.reset(parsed.values);
              setCurrentStep(parsed.currentStep || 0);
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }, [open, mode, initialData, form, SESSION_KEY]);

  // Clear session on successful submit
  const clearSession = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  };

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

  const handleQuickSetup = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(STEPS.length - 1);
    }
  };

  const buildSubmitInput = (data: FormData): CreateTenancyRequirementInput => ({
    property_id: propertyId,
    tenant_email: data.tenant_email || null,
    require_email_verification: data.self_manage_only ? false : data.require_email_verification,
    require_kyc_verification: data.require_kyc_verification,
    require_phone_verification: data.require_phone_verification,
    self_manage_only: data.self_manage_only,
    contract_method: data.contract_method,
    selected_template_id: data.selected_template_id,
    rent_amount_cents: data.rent_amount ? Math.round(parseFloat(data.rent_amount) * 100) : null,
    currency: data.currency,
    security_deposit_cents: data.security_deposit ? Math.round(parseFloat(data.security_deposit) * 100) : null,
    payment_day: data.payment_day ? parseInt(data.payment_day) : null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    utilities_config: data.utilities_config as UtilitiesConfig,
  });

  const handleSubmit = async (data: FormData) => {
    if (currentStep !== STEPS.length - 1) return;
    
    const input = buildSubmitInput(data);
    await onSubmit(input, mode);
    clearSession();
    // Don't close dialog here - let parent control closing after successful save
    form.reset();
    setCurrentStep(0);
  };

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 0: return ['tenant_email'];
      case 1: return ['require_email_verification', 'require_kyc_verification'];
      case 2: return ['contract_method', 'selected_template_id'];
      case 3: return ['rent_amount', 'currency', 'security_deposit', 'payment_day', 'start_date'];
      case 4: return ['utilities_config'];
      case 5: return [];
      default: return [];
    }
  };

  const isEUCountry = ['ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'BE', 'AT', 'PL', 'GR'].includes(propertyCountry || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {propertyTitle && (
              <span className="text-base font-semibold text-muted-foreground mr-2">{propertyTitle}</span>
            )}
            <span className="text-base font-semibold">
              {mode === 'edit' ? (t('tenancy.wizard.editTitle') || 'Edit Tenancy Setup') :
              mode === 'invite' ? (t('tenancy.wizard.inviteTitle') || 'Invite Tenant') :
              mode === 'next_tenancy' ? (t('tenancy.wizard.nextTenancyTitle') || 'Set Up Next Tenancy') :
              (t('tenancy.wizard.title') || 'New Tenancy Setup')}
            </span>
          </DialogTitle>
        </DialogHeader>

        {invitationExpiryNotice && (
          <Alert className="mb-4 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('tenancy.wizard.invitationTimerReset') || 'Saving updated terms will reset the invitation timer to 7 days.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-1 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const canJump = isCompleted;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => canJump && setCurrentStep(index)}
                  className="flex flex-col items-center transition-opacity disabled:opacity-100"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
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
                </button>
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
              if (e.key === 'Enter') {
                if (currentStep !== STEPS.length - 1) {
                  e.preventDefault();
                  handleNext();
                }
              }
            }}
            /* className="space-y-2 h-[500px]" */
            className="flex flex-col h-[500px]"  
                      >
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {currentStep === 0 && <StepTenantEmail form={form} />}
            {currentStep === 1 && <StepVerification form={form} canUseGovId={canUseGovId} />}
            {currentStep === 2 && <StepContractMethod form={form} templates={templates} />}
            {currentStep === 3 && <StepRentDeposits form={form} />}
            {currentStep === 4 && <StepUtilities form={form} utilityTypes={utilityTypes} />}
            {currentStep === 5 && <StepReview form={form} />}
            </div> 
            
            {/* Navigation Buttons */}
            {/* <div className="flex justify-between pt-4"> */}
            <div className="flex justify-between pt-4 border-t border-border mt-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {currentStep === 0 ? t('common.cancel') : t('common.back')}
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < STEPS.length - 1 && form.watch('self_manage_only') && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleQuickSetup}
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    {t('tenancy.wizard.quickSetup') || 'Quick Setup'}
                  </Button>
                )}
                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    {t('common.next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {onSaveAndStartAnother && mode === 'new' && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => form.handleSubmit((data) => {
                          const input = buildSubmitInput(data);
                          onSaveAndStartAnother(input, mode);
                        })()}
                      >
                        {t('common.save') || 'Save & Start Another'}
                      </Button>
                    )}
                    <Button 
                      type="button" 
                      disabled={isSubmitting}
                      onClick={() => form.handleSubmit(handleSubmit)()}
                    >
                      {isSubmitting ? t('common.saving') || 'Saving...' : t('common.save') || 'Save Setup'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
