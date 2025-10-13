import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Ticket, Users, Settings } from "lucide-react";
import { PropertiesTable } from "@/components/admin/PropertiesTable";
import { TicketsTable } from "@/components/admin/TicketsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { SystemSettings } from "@/components/admin/SystemSettings";
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
    const { data: { user } } = await supabase.auth.getUser();
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              {t('admin.settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.userManagement')}</CardTitle>
                <CardDescription>{t('admin.userManagementDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <UsersTable />
              </CardContent>
            </Card>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}
