import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Ticket, Users, Settings, Paintbrush, Languages, BarChart3, Key, CreditCard, Mail } from "lucide-react";
import { PropertiesTable } from "@/components/admin/PropertiesTable";
import { TicketsTable } from "@/components/admin/TicketsTable";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { BrandSettings } from "@/components/admin/BrandSettings";
import { LanguageSettings } from "@/components/admin/LanguageSettings";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { SubscriptionPlansManagement } from "@/components/admin/SubscriptionPlansManagement";
import { EnterpriseContactRequests } from "@/components/admin/EnterpriseContactRequests";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const user = await authService.getCurrentUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !data) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(data);
  };

  if (isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.dashboardTitle')}</h1>
          <p className="text-muted-foreground">{t('admin.description')}</p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              {t('admin.users')}
            </TabsTrigger>
            <TabsTrigger value="properties">
              <Building2 className="mr-2 h-4 w-4" />
              {t('admin.properties')}
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="mr-2 h-4 w-4" />
              {t('admin.tickets')}
            </TabsTrigger>
            <TabsTrigger value="plans">
              <CreditCard className="mr-2 h-4 w-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="enterprise">
              <Mail className="mr-2 h-4 w-4" />
              Enterprise
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              {t('admin.settings')}
            </TabsTrigger>
            <TabsTrigger value="brand">
              <Paintbrush className="mr-2 h-4 w-4" />
              Brand
            </TabsTrigger>
            <TabsTrigger value="languages">
              <Languages className="mr-2 h-4 w-4" />
              Languages
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t('admin.analytics.tab')}
            </TabsTrigger>
            <TabsTrigger value="kilt-setup">
              <Key className="mr-2 h-4 w-4" />
              {t('admin.kiltSetup')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.allProperties')}</CardTitle>
                <CardDescription>{t('admin.allPropertiesDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <PropertiesTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.allTickets')}</CardTitle>
                <CardDescription>{t('admin.allTicketsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <SubscriptionPlansManagement />
          </TabsContent>

          <TabsContent value="enterprise">
            <EnterpriseContactRequests />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.systemSettings')}</CardTitle>
                <CardDescription>{t('admin.systemSettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <SystemSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle>Brand Settings</CardTitle>
                <CardDescription>
                  Customize the brand name, logo, and color scheme for your application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="languages">
            <Card>
              <CardHeader>
                <CardTitle>Language Settings</CardTitle>
                <CardDescription>
                  Manage which languages are available to users in the language switcher
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="kilt-setup">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.kiltSetupTitle')}</CardTitle>
                <CardDescription>
                  {t('admin.kiltSetupDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/kilt-setup')} className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  {t('admin.openKiltSetup')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
