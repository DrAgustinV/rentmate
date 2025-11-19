import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Globe, ShieldCheck, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IdentityVerification } from "@/components/IdentityVerification";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { useSearchParams } from "react-router-dom";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const { t, language, changeLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const defaultTab = searchParams.get("tab") || "profile";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProfile(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      }
      setSelectedLanguage(language);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      if (selectedLanguage !== language) {
        await changeLanguage(selectedLanguage);
      }

      toast({
        title: t('common.success'),
        description: t('settings.saved'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
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
            <p className="text-muted-foreground">{t('settings.loadingSettings')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-primary" />
            {t('header.myAccount')}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and verification</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <UserCircle className="h-4 w-4 mr-2" />
              {t('account.profile')}
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <Crown className="h-4 w-4 mr-2" />
              {t('subscription.title')}
            </TabsTrigger>
            <TabsTrigger value="identity">
              <ShieldCheck className="h-4 w-4 mr-2" />
              {t('account.identity')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.profileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('settings.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('settings.firstNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('settings.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('settings.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.emailNote')}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="language">{t('settings.languageLabel')}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('settings.languageDesc')}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Globe className="mr-2 h-4 w-4" />
                        {languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.label}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => setSelectedLanguage(lang.code)}
                          className={selectedLanguage === lang.code ? 'bg-accent' : ''}
                        >
                          <span className="mr-2">{lang.flag}</span>
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? t('settings.saving') : t('settings.saveChanges')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Identity Verification</CardTitle>
                <CardDescription>
                  Verify your identity using KILT Protocol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IdentityVerification />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <SubscriptionManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
