import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Wrench, FileText, ClipboardList, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { StandardTasksSection } from "@/components/StandardTasksSection";
import RepairShops from "./RepairShops";
import { TemplatesManagerContent } from "./TemplatesManagerContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Configuration() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Default settings state
  const [requireKyc, setRequireKyc] = useState(false);
  const [defaultDepositCents, setDefaultDepositCents] = useState(0);
  const [requirePaymentConfirmation, setRequirePaymentConfirmation] = useState(true);
  const [requireWaterBill, setRequireWaterBill] = useState(false);
  const [requireElectricityBill, setRequireElectricityBill] = useState(false);

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
        setRequireKyc(settings.require_kyc || false);
        setDefaultDepositCents(settings.default_deposit_amount || 0);
        setRequirePaymentConfirmation(settings.require_payment_confirmation !== false);
        setRequireWaterBill(settings.require_water_bill || false);
        setRequireElectricityBill(settings.require_electricity_bill || false);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const settings = {
        require_kyc: requireKyc,
        default_deposit_amount: defaultDepositCents,
        require_payment_confirmation: requirePaymentConfirmation,
        require_water_bill: requireWaterBill,
        require_electricity_bill: requireElectricityBill,
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

      toast.success("Default settings saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
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
          {t("configuration.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("configuration.description")}</p>
      </div>

      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="maintenance" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.standardMaintenance")}</span>
            <span className="sm:hidden">Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.documentTemplates")}</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="repair-shops" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.repairShops")}</span>
            <span className="sm:hidden">Shops</span>
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("configuration.contractsPayment")}</span>
            <span className="sm:hidden">Defaults</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Maintenance Templates</CardTitle>
              <CardDescription>
                Reusable maintenance task templates (Feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature will allow you to create standard maintenance templates that can be copied to properties.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>
                Reusable document templates (Feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature will allow you to create document templates that can be copied to properties.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair-shops" className="mt-6">
          <RepairShops />
        </TabsContent>

        <TabsContent value="defaults" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("configuration.defaultsTitle")}</CardTitle>
              <CardDescription>
                {t("configuration.defaultsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-kyc">Require Identity Verification (KYC)</Label>
                  <p className="text-sm text-muted-foreground">
                    Require tenants to verify identity before signing contracts
                  </p>
                </div>
                <Switch
                  id="require-kyc"
                  checked={requireKyc}
                  onCheckedChange={setRequireKyc}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit">Default Security Deposit (in cents)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={defaultDepositCents}
                  onChange={(e) => setDefaultDepositCents(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Enter amount in cents (e.g., 100000 = €1,000.00)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-confirm">Monthly Payment Confirmation</Label>
                  <p className="text-sm text-muted-foreground">
                    Require tenant to confirm monthly rent payments
                  </p>
                </div>
                <Switch
                  id="payment-confirm"
                  checked={requirePaymentConfirmation}
                  onCheckedChange={setRequirePaymentConfirmation}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="water-bill">Water Bill Monthly Check</Label>
                  <p className="text-sm text-muted-foreground">
                    Require proof of water bill payment each month
                  </p>
                </div>
                <Switch
                  id="water-bill"
                  checked={requireWaterBill}
                  onCheckedChange={setRequireWaterBill}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="electricity-bill">Electricity Bill Monthly Check</Label>
                  <p className="text-sm text-muted-foreground">
                    Require proof of electricity bill payment each month
                  </p>
                </div>
                <Switch
                  id="electricity-bill"
                  checked={requireElectricityBill}
                  onCheckedChange={setRequireElectricityBill}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveDefaults} disabled={saving}>
                  {saving ? "Saving..." : "Save Defaults"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
