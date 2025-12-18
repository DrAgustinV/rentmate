import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Search, Filter, LayoutGrid, List, Plus } from "lucide-react";
import { ScheduleStandardTaskDialog } from "./ScheduleStandardTaskDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface StandardTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  suggested_frequency: string;
  category: string;
}

interface StandardTasksSectionProps {
  propertyId: string;
  onAddTask?: () => void;
}

export function StandardTasksSection({ propertyId, onAddTask }: StandardTasksSectionProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StandardTemplate | null>(null);
  const [userViewMode, setUserViewMode] = useState<"grid" | "list" | null>(null);

  // Use user's choice if set, otherwise use responsive default
  const viewMode = userViewMode ?? (isMobile ? "grid" : "list");

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
  });

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const typeColors = {
    maintenance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    repair: "bg-red-500/10 text-red-500 border-red-500/20",
    inspection: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    cleaning: "bg-green-500/10 text-green-500 border-green-500/20",
    other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const categories = standardTemplates
    ? Array.from(new Set(standardTemplates.map((t) => t.category)))
    : [];

  const filteredTemplates = standardTemplates?.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleScheduleClick = (template: StandardTemplate) => {
    setSelectedTemplate(template);
    setScheduleDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search, Filter, and View Toggle */}
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
          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("maintenance.standardTask.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("maintenance.standardTask.allCategories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* View Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setUserViewMode("grid")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setUserViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {onAddTask && (
              <Button onClick={onAddTask} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t("configuration.addMaintenanceTask")}
              </Button>
            )}
          </div>
        </div>

        {/* Templates Display */}
        {filteredTemplates && filteredTemplates.length > 0 ? (
          viewMode === "grid" ? (
            // Grid/Card View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="card-shine flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${typeColors[template.type as keyof typeof typeColors]}`}>
                        {template.type}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${priorityColors[template.priority as keyof typeof priorityColors]}`}>
                        {template.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 flex-1">
                    <CardDescription className="text-xs line-clamp-3">
                      {template.description}
                    </CardDescription>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="capitalize">{t("maintenance.standardTask.suggestedFrequency")}: {template.suggested_frequency}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleScheduleClick(template)}
                    >
                      {t("maintenance.standardTask.schedule")}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            // List/Table View
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.title")}</TableHead>
                    <TableHead>{t("common.category")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead>{t("common.priority")}</TableHead>
                    <TableHead>{t("maintenance.standardTask.frequency")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${typeColors[template.type as keyof typeof typeColors]}`}>
                          {template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${priorityColors[template.priority as keyof typeof priorityColors]}`}>
                          {template.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {template.suggested_frequency}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScheduleClick(template)}
                        >
                          {t("maintenance.standardTask.schedule")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>{t("maintenance.standardTask.noTemplates")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ScheduleStandardTaskDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        standardTemplate={selectedTemplate}
        propertyId={propertyId}
      />
    </>
  );
}
