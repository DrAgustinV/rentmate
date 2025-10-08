import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ArchiveToggleProps {
  activeCount: number;
  archivedCount: number;
  currentView: "active" | "archived";
  onViewChange: (view: "active" | "archived") => void;
}

export function ArchiveToggle({ activeCount, archivedCount, currentView, onViewChange }: ArchiveToggleProps) {
  return (
    <Tabs value={currentView} onValueChange={(value) => onViewChange(value as "active" | "archived")}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="active" className="gap-2">
          Active Properties
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="archived" className="gap-2">
          Archived Properties
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