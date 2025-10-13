import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function About() {
  const { t } = useLanguage();
  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-8">{t('about.title')}</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('about.ourMission')}</CardTitle>
              <CardDescription>{t('about.missionSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('about.missionText')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('about.whatWeOffer')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{t('about.ticketManagement')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.ticketManagementDesc')}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('about.propertyManagement')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.propertyManagementDesc')}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('about.maintenanceScheduling')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.maintenanceSchedulingDesc')}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('about.realtimeCommunication')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.realtimeCommunicationDesc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('about.ourValues')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h3 className="font-semibold">{t('about.transparency')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.transparencyDesc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('about.efficiency')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.efficiencyDesc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('about.reliability')}</h3>
                <p className="text-sm text-muted-foreground">{t('about.reliabilityDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
