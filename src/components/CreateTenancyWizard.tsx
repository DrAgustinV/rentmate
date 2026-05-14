import { useState, useEffect } from "react";
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
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UtilityConfig, UtilitiesConfig, CreateTenancyRequirementInput } from "@/hooks/useTenancyRequirements";
import { useUtilityTypes } from "@/hooks/useUtilityTypes";
import { StepTenantEmail, StepVerification, StepContractMethod, StepRentDeposits } from "@/components/tenancy-wizard";

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
  mode = 'new',
}: CreateTenancyWizardProps) {
  const { t } = useLanguage();
  const { canUseGovernmentIdKYC, isFree } = useSubscription();
  const { utilityTypes } = useUtilityTypes();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  const [newUtilityType, setNewUtilityType] = useState("");
  const [newUtilityResponsibility, setNewUtilityResponsibility] = useState("not_applicable");
  
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
      self_manage_only: false,
      contract_method: (initialData?.contract_method as 'digital' | 'manual' | 'none') || 'manual',
      selected_template_id: null,
      rent_amount: initialData?.rent_amount_cents ? (initialData.rent_amount_cents / 100).toString() : '',
      currency: initialData?.currency || 'EUR',
      security_deposit: initialData?.security_deposit_cents ? (initialData.security_deposit_cents / 100).toString() : '',
      payment_day: initialData?.payment_day?.toString() || '1',
      start_date: initialData?.start_date || '',
      end_date: initialData?.end_date || '',
      utilities_config: (initialData?.utilities_config as Record<string, UtilityConfig>) || {},
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
    };
    await onSubmit(input, mode);
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
          <DialogTitle>
            {mode === 'edit' ? (t('tenancy.wizard.editTitle') || 'Edit Tenancy Setup') :
             mode === 'invite' ? (t('tenancy.wizard.inviteTitle') || 'Invite Tenant') :
             mode === 'next_tenancy' ? (t('tenancy.wizard.nextTenancyTitle') || 'Set Up Next Tenancy') :
             (t('tenancy.wizard.title') || 'New Tenancy Setup')}
          </DialogTitle>
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
            {currentStep === 0 && <StepTenantEmail form={form} />}
            {currentStep === 1 && <StepVerification form={form} canUseGovId={canUseGovId} />}
            {currentStep === 2 && <StepContractMethod form={form} templates={templates} />}
            {currentStep === 3 && <StepRentDeposits form={form} />}

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
                  {isSubmitting ? t('common.saving') || 'Saving...' : t('common.save') || 'Save Setup'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
