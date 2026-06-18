import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, FileText, Search, LayoutGrid, List, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authService, documentService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";

export const GlobalTemplatesList = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [userViewMode, setUserViewMode] = useState<"grid" | "list" | null>(null);

  // Use user's choice if set, otherwise use responsive default
  const viewMode = userViewMode ?? (isMobile ? "grid" : "list");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["property-templates"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .is("property_id", null)
        .eq("document_category", "property")
        .eq("uploaded_by", user.id)
        .eq("is_latest_version", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      template.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const deleteMutation = useMutation({
    mutationFn: async (template: { id: string; file_path: string }) => {
      // Delete from storage
      try {
        await documentService.deleteFile(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, template.file_path);
      } catch (storageError) {
        console.warn("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", template.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success(t('common.deleted'));
      queryClient.invalidateQueries({ queryKey: ["property-templates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    },
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const candidates = [
        filePath,
        filePath.replace(/^property-documents\//, ''),
      ];
      if (filePath.startsWith('http')) {
        const urlPath = filePath.split('/property-documents/')[1];
        if (urlPath) candidates.push(urlPath);
        const urlPath2 = filePath.split('/storage/v1/object/')[1]?.split('/').slice(1).join('/');
        if (urlPath2) candidates.push(urlPath2);
      }

      for (const path of [...new Set(candidates)]) {
        const url = await documentService.getSignedUrl(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, path);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      throw new Error(t('common.downloadFailed'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.downloadFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasTemplates = templates && templates.length > 0;
  const hasFilteredResults = filteredTemplates && filteredTemplates.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("configuration.documentTemplates.searchPlaceholder") || "Search templates..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      </div>

      {/* Empty State */}
      {!hasTemplates && (
        <EmptyState
          icon={FileText}
          title={t('configuration.documentTemplates.noTemplates')}
          size="compact"
        />
      )}

      {/* No Results */}
      {hasTemplates && !hasFilteredResults && (
        <EmptyState
          icon={Search}
          title={t('common.noResults') || "No templates match your search."}
          size="compact"
        />
      )}

      {/* Templates Display */}
      {hasFilteredResults && (
        viewMode === "grid" ? (
          // Grid/Card View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="card-shine flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <CardTitle className="text-base line-clamp-2">{template.document_title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(template.created_at!), "MMM d, yyyy")}
                  </p>
                </CardContent>
                <CardFooter className="pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(template.file_path, template.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('common.download') || "Download"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive shrink-0" title={t("common.delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('configuration.documentTemplates.deleteWarning')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate({ id: template.id, file_path: template.file_path })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {template.document_title}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.description || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(template.created_at!), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(template.file_path, template.file_name)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t("common.download")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('configuration.documentTemplates.deleteWarning')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({ id: template.id, file_path: template.file_path })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}
    </div>
  );
};
