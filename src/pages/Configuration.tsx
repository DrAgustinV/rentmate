import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Wrench, FileText, ClipboardList, Settings, Plus, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { StandardTasksSection } from "@/components/StandardTasksSection";
import RepairShops from "./RepairShops";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreateStandardMaintenanceDialog } from "@/components/CreateStandardMaintenanceDialog";
import { CreatePropertyTemplateDialog } from "@/components/CreatePropertyTemplateDialog";
import { GlobalTemplatesList } from "@/components/GlobalTemplatesList";
import { StripeConnectOnboarding } from "@/components/payments/StripeConnectOnboarding";

export default function Configuration() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [createMaintenanceOpen, setCreateMaintenanceOpen] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Default settings state
  const [defaultRequireKYC, setDefaultRequireKYC] = useState(false);
  const [defaultDeposit, setDefaultDeposit] = useState("0");
  const [defaultRequirePaymentConfirmation, setDefaultRequirePaymentConfirmation] = useState(true);
  const [defaultRequireWaterBill, setDefaultRequireWaterBill] = useState(false);
  const [defaultRequireElectricityBill, setDefaultRequireElectricityBill] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Check if user is a manager
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("manager_id", session.user.id)
        .limit(1);

      if (!properties || properties.length === 0) {
        navigate("/dashboard");
        return;
      }

      setUserId(session.user.id);
      await fetchDefaultSettings(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const fetchDefaultSettings = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("default_rent_settings")
        .eq("id", uid)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.default_rent_settings) {
        const settings = data.default_rent_settings as any;
        setDefaultRequireKYC(settings.require_kyc || false);
        setDefaultDeposit((settings.default_deposit_amount || 0).toString());
        setDefaultRequirePaymentConfirmation(settings.require_payment_confirmation !== false);
        setDefaultRequireWaterBill(settings.require_water_bill || false);
        setDefaultRequireElectricityBill(settings.require_electricity_bill || false);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const settings = {
        require_kyc: defaultRequireKYC,
        default_deposit_amount: parseInt(defaultDeposit) || 0,
        require_payment_confirmation: defaultRequirePaymentConfirmation,
        require_water_bill: defaultRequireWaterBill,
        require_electricity_bill: defaultRequireElectricityBill,
        custom_bills: [],
      };

      const { error } = await supabase
        .from("profiles")
        .update({ 
          default_rent_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success(t('common.success'));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderOpen className="h-8 w-8 text-primary" />
          {t("configuration.pageTitle")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("configuration.pageDescription")}</p>
      </div>

      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="maintenance" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.maintenance")}</span>
            <span className="sm:hidden">Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.templates")}</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="repair-shops" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.repairShops")}</span>
            <span className="sm:hidden">Shops</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.payments")}</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.defaults")}</span>
            <span className="sm:hidden">Defaults</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('configuration.standardMaintenanceTitle')}</CardTitle>
              <CardDescription>
                {t('configuration.standardMaintenanceDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StandardTasksSection propertyId="" />
            </CardContent>
            <CardFooter>
              <Button onClick={() => setCreateMaintenanceOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('configuration.addMaintenanceTask')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('configuration.documentTemplatesTitle')}</CardTitle>
                <CardDescription>
                  {t('configuration.documentTemplatesDesc')}
                </CardDescription>
              </div>
              <Button onClick={() => setCreateTemplateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('configuration.addTemplate')}
              </Button>
            </CardHeader>
            <CardContent>
              <GlobalTemplatesList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair-shops" className="space-y-4">
          <RepairShops />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <StripeConnectOnboarding />
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('configuration.defaultsTitle')}</CardTitle>
              <CardDescription>
                {t('configuration.defaultsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-kyc">{t('configuration.requireKYCTitle')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('configuration.requireKYCDesc')}
                  </p>
                </div>
                <Switch
                  id="require-kyc"
                  checked={defaultRequireKYC}
                  onCheckedChange={setDefaultRequireKYC}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-deposit">{t('configuration.defaultDepositTitle')}</Label>
                <Input
                  id="default-deposit"
                  type="number"
                  step="0.01"
                  value={defaultDeposit}
                  onChange={(e) => setDefaultDeposit(e.target.value)}
                  placeholder={t('configuration.defaultDepositPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('configuration.defaultDepositHelper')}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-confirmation">{t('configuration.paymentConfirmTitle')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('configuration.paymentConfirmDesc')}
                  </p>
                </div>
                <Switch
                  id="payment-confirmation"
                  checked={defaultRequirePaymentConfirmation}
                  onCheckedChange={setDefaultRequirePaymentConfirmation}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="water-bill">{t('configuration.waterBillTitle')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('configuration.waterBillDesc')}
                  </p>
                </div>
                <Switch
                  id="water-bill"
                  checked={defaultRequireWaterBill}
                  onCheckedChange={setDefaultRequireWaterBill}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="electricity-bill">{t('configuration.electricityBillTitle')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('configuration.electricityBillDesc')}
                  </p>
                </div>
                <Switch
                  id="electricity-bill"
                  checked={defaultRequireElectricityBill}
                  onCheckedChange={setDefaultRequireElectricityBill}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveDefaults} disabled={isSaving}>
                {isSaving ? t('configuration.saving') : t('configuration.saveDefaults')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateStandardMaintenanceDialog
        open={createMaintenanceOpen}
        onOpenChange={setCreateMaintenanceOpen}
      />
      
      <CreatePropertyTemplateDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
      />
    </AppLayout>
  );
}