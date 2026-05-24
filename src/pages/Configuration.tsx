import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, profileService } from "@/services";
import { AppLayout } from "@/components/layouts/AppLayout";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Wrench, FileText, ClipboardList, Settings, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/contexts/RoleContext";
import { StandardTasksSection } from "@/components/StandardTasksSection";
import { RepairShopsSection } from "@/components/RepairShopsSection";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreatePropertyTemplateDialog } from "@/components/CreatePropertyTemplateDialog";
import { GlobalTemplatesList } from "@/components/GlobalTemplatesList";
type ConfigTab = "maintenance" | "templates" | "repair-shops" | "defaults";

export default function Configuration() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeRole } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ConfigTab) || "maintenance";
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);

  // Default settings state
  const [defaultRequireKYC, setDefaultRequireKYC] = useState(false);
  const [defaultDeposit, setDefaultDeposit] = useState("0");
  const [defaultRequirePaymentConfirmation, setDefaultRequirePaymentConfirmation] = useState(true);
  const [defaultRequireWaterBill, setDefaultRequireWaterBill] = useState(false);
  const [defaultRequireElectricityBill, setDefaultRequireElectricityBill] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab") as ConfigTab | null;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }

    const guideHighlight = searchParams.get("guideHighlight");
    if (guideHighlight === "defaults") {
      setActiveTab("defaults");
      searchParams.delete("guideHighlight");
      setSearchParams(searchParams);
    }
  }, [searchParams, activeTab, setSearchParams]);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("manager_id", session.user.id)
        .limit(1);

      if (!properties || properties.length === 0) {
        navigate("/dashboard");
        return;
      }

      if (mounted) setUserId(session.user.id);
      if (activeRole !== 'manager') {
        navigate("/properties");
        return;
      }
      await fetchDefaultSettings(session.user.id, mounted);
    };

    checkUser();
    return () => { mounted = false; };
  }, [navigate, activeRole]);

  const fetchDefaultSettings = async (uid: string, mounted: boolean) => {
    if (!mounted) return;
    setLoading(true);
    try {
      const profile = await profileService.getProfile(uid);
      
      const { data: settingsData, error } = await supabase
        .from("profiles")
        .select("default_rent_settings")
        .eq("id", uid)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (mounted && settingsData?.default_rent_settings) {
        const settings = settingsData.default_rent_settings as { require_kyc?: boolean; default_deposit_amount?: number; require_payment_confirmation?: boolean; require_water_bill?: boolean; require_electricity_bill?: boolean };
        setDefaultRequireKYC(settings.require_kyc || false);
        setDefaultDeposit((settings.default_deposit_amount || 0).toString());
        setDefaultRequirePaymentConfirmation(settings.require_payment_confirmation !== false);
        setDefaultRequireWaterBill(settings.require_water_bill || false);
        setDefaultRequireElectricityBill(settings.require_electricity_bill || false);
      }
    } catch (error: unknown) {
      if (mounted) toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (mounted) setLoading(false);
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setDefaultRequireKYC(false);
    setDefaultDeposit("0");
    setDefaultRequirePaymentConfirmation(true);
    setDefaultRequireWaterBill(false);
    setDefaultRequireElectricityBill(false);
    
    await handleSaveDefaults();
    
    toast.success(t('configuration.defaultsRestored') || 'Defaults restored');
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSkeleton preset="form" />
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const tab = value as ConfigTab;
          setActiveTab(tab);

          const params = new URLSearchParams(searchParams);
          if (tab === "maintenance") {
            params.delete("tab");
          } else {
            params.set("tab", tab);
          }
          setSearchParams(params, { replace: true });
        }}
        className="w-full"
      >

        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.tabs.defaults")}</span>
            <span className="sm:hidden">Defaults</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <StandardTasksSection 
            propertyId="" 
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('configuration.documentTemplates.title')}</CardTitle>
                <CardDescription>
                  {t('configuration.documentTemplates.desc')}
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
          <RepairShopsSection />
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
                  {/* <Label htmlFor="require-kyc">{t('configuration.requireKYCTitle')}</Label> */}
                  <Label htmlFor="require-kyc">{t('configuration.requireKYCDesc')}</Label>
                  {/* <p className="text-sm text-muted-foreground">
                    {t('configuration.requireKYCDesc')}
                  </p> */}
                </div>
                <Switch
                  id="require-kyc"
                  checked={defaultRequireKYC}
                  onCheckedChange={setDefaultRequireKYC}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="default-deposit">{t('configuration.defaultDepositTitle') || 'Default Security Deposit'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('configuration.defaultDepositHelper') || 'Pre-fill the deposit field in the tenancy wizard'}
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    id="default-deposit"
                    type="number"
                    step="0.01"
                    value={defaultDeposit}
                    onChange={(e) => setDefaultDeposit(e.target.value)}
                    placeholder={t('configuration.defaultDepositPlaceholder') || '0'}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  {/* <Label htmlFor="payment-confirmation">{t('configuration.paymentConfirmTitle')}</Label> */}
                  <Label htmlFor="payment-confirmation">{t('configuration.paymentConfirmDesc')}</Label>
                  {/* <p className="text-sm text-muted-foreground">
                    {t('configuration.paymentConfirmDesc')}
                  </p> */}
                </div>
                <Switch
                  id="payment-confirmation"
                  checked={defaultRequirePaymentConfirmation}
                  onCheckedChange={setDefaultRequirePaymentConfirmation}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  {/* <Label htmlFor="water-bill">{t('configuration.waterBillTitle')}</Label> */}
                  <Label htmlFor="water-bill">{t('configuration.waterBillDesc')}</Label>
                  {/* <p className="text-sm text-muted-foreground">
                    {t('configuration.waterBillDesc')}
                  </p> */}
                </div>
                <Switch
                  id="water-bill"
                  checked={defaultRequireWaterBill}
                  onCheckedChange={setDefaultRequireWaterBill}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  {/* <Label htmlFor="electricity-bill">{t('configuration.electricityBillTitle')}</Label> */}
                  <Label htmlFor="electricity-bill">{t('configuration.electricityBillDesc')}</Label>
                  {/* <p className="text-sm text-muted-foreground">
                    {t('configuration.electricityBillDesc')}
                  </p> */}
                </div>
                <Switch
                  id="electricity-bill"
                  checked={defaultRequireElectricityBill}
                  onCheckedChange={setDefaultRequireElectricityBill}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" size="sm" onClick={handleRestoreDefaults} disabled={isSaving}>
                {t('configuration.restoreDefaults') || 'Restore Defaults'}
              </Button>
              <Button onClick={handleSaveDefaults} disabled={isSaving}>
                {isSaving ? t('configuration.saving') : t('common.save')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <CreatePropertyTemplateDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
      />
    </AppLayout>
  );
}
