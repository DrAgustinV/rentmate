import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, Calendar, Wrench } from "lucide-react";
import { ScheduleStandardTaskDialog } from "./ScheduleStandardTaskDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { priorityColors, typeColors } from "@/lib/maintenanceColors";
import { EmptyState } from "@/components/EmptyState";

interface StandardTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  suggested_frequency: string;
  category: string;
}

interface StandardTemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function StandardTemplatePickerDialog({
  open,
  onOpenChange,
  propertyId,
}: StandardTemplatePickerDialogProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StandardTemplate | null>(null);

  const { data: standardTemplates, isLoading } = useQuery({
    queryKey: ["standard-maintenance-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("standard_maintenance_templates")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as StandardTemplate[];
    },
    enabled: open,
  });

  const categories = standardTemplates
    ? Array.from(new Set(standardTemplates.map((t) => t.category)))
    : [];

  const filteredTemplates = standardTemplates?.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: StandardTemplate) => {
    setSelectedTemplate(template);
    setScheduleDialogOpen(true);
  };

  const handleScheduleDialogClose = (isOpen: boolean) => {
    setScheduleDialogOpen(isOpen);
    if (!isOpen) {
      // Close both dialogs when scheduling is complete
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t("tickets.templatePicker.title")}
            </DialogTitle>
            <DialogDescription>
              {t("tickets.templatePicker.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("maintenance.standardTask.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("maintenance.standardTask.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("maintenance.standardTask.allCategories")}
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : filteredTemplates && filteredTemplates.length > 0 ? (
              <div className="space-y-3 pb-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {template.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${typeColors[template.type as keyof typeof typeColors]}`}
                          >
                            {template.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityColors[template.priority as keyof typeof priorityColors]}`}
                          >
                            {template.priority}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">
                            {t("maintenance.standardTask.suggestedFrequency")}:{" "}
                            {template.suggested_frequency}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {t("tickets.selectTemplate")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Wrench}
                title={t("maintenance.standardTask.noTemplates")}
                size="compact"
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ScheduleStandardTaskDialog
        open={scheduleDialogOpen}
        onOpenChange={handleScheduleDialogClose}
        standardTemplate={selectedTemplate}
        propertyId={propertyId}
      />
    </>
  );
}