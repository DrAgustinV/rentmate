import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface ArchiveToggleProps {
  activeCount: number;
  endingTenancyCount: number;
  archivedCount: number;
  currentView: "active" | "ending_tenancy" | "archived";
  onViewChange: (view: "active" | "ending_tenancy" | "archived") => void;
  showEndingTenancy?: boolean;
}

export function ArchiveToggle({ activeCount, endingTenancyCount, archivedCount, currentView, onViewChange, showEndingTenancy = true }: ArchiveToggleProps) {
  const { t } = useLanguage();
  return (
    <Tabs value={currentView} onValueChange={(value) => onViewChange(value as "active" | "ending_tenancy" | "archived")}>
      <TabsList className={`grid w-full max-w-2xl ${showEndingTenancy ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <TabsTrigger value="active" className="gap-2">
          {t('dashboard.active')}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeCount}
            </Badge>
          )}
        </TabsTrigger>
        {showEndingTenancy && (
          <TabsTrigger value="ending_tenancy" className="gap-2">
            {t('properties.endingTenancy')}
            {endingTenancyCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {endingTenancyCount}
              </Badge>
            )}
          </TabsTrigger>
        )}
        <TabsTrigger value="archived" className="gap-2">
          {t('properties.archived')}
          {archivedCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {archivedCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}