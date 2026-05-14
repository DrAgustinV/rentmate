import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { authService, documentService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";

interface CopyTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
}

// Normalize file path - strip bucket prefix if present
function normalizeFilePath(filePath: string): string {
  // Remove 'property-documents/' prefix if it exists (incorrect legacy format)
  if (filePath.startsWith('property-documents/')) {
    return filePath.replace('property-documents/', '');
  }
  return filePath;
}

async function checkFileExists(filePath: string): Promise<boolean> {
  const normalizedPath = normalizeFilePath(filePath);
  return documentService.fileExists(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, normalizedPath);
}

export function CopyTemplatesDialog({ 
  open, 
  onOpenChange, 
  propertyId, 
  tenancyId 
}: CopyTemplatesDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const { data: templatesData, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["property-templates", propertyId],
    queryFn: async () => {
      // Fetch both property-specific templates AND global templates (property_id IS NULL)
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("document_category", "property")
        .eq("is_latest_version", true)
        .is("tenancy_id", null)
        .or(`property_id.eq.${propertyId},property_id.is.null`);

      if (error) {
        throw error;
      }
      
      // Check file existence for each template
      const templatesWithStatus = await Promise.all(
        (data || []).map(async (template) => {
          const fileExists = await checkFileExists(template.file_path);
          return { ...template, fileExists };
        })
      );
      
      return templatesWithStatus;
    },
    enabled: open,
    staleTime: 0, // Always refetch when dialog opens
  });

  const templates = templatesData || [];
  const validTemplates = templates.filter(t => t.fileExists);
  const invalidTemplates = templates.filter(t => !t.fileExists);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      return user;
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      if (!currentUser) throw new Error("Not authenticated");

      const errors: string[] = [];
      const successCount = { count: 0 };
      
      for (const templateId of templateIds) {
        const template = templates?.find(t => t.id === templateId);
        if (!template) {
          errors.push(`Template not found: ${templateId}`);
          continue;
        }

        if (!template.fileExists) {
          errors.push(`"${template.document_title}" has no file in storage (ghost record)`);
          continue;
        }

        try {
          const downloadPath = normalizeFilePath(template.file_path);

          let fileData: Blob;
          try {
            fileData = await documentService.downloadFile(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, downloadPath);
          } catch (downloadError) {
            errors.push(`Failed to download "${template.document_title}": ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
            continue;
          }

          const extension = template.file_name.match(/\.[^.]+$/)?.[0] || "";
          const newFilePath = `${propertyId}/tenancy_${tenancyId}/${crypto.randomUUID()}${extension}`;

          try {
            await documentService.uploadFile(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, newFilePath, fileData);
          } catch (uploadError) {
            errors.push(`Failed to upload "${template.document_title}": ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
            continue;
          }

          const { error: dbError } = await supabase.from("property_documents").insert({
            property_id: propertyId,
            tenancy_id: tenancyId,
            uploaded_by: currentUser.id,
            document_title: template.document_title,
            file_name: template.file_name,
            file_path: newFilePath,
            file_type: template.file_type,
            file_size_bytes: template.file_size_bytes,
            mime_type: template.mime_type,
            document_category: "tenancy",
            description: template.description,
            version: 1,
            is_latest_version: true,
          }).select();

          if (dbError) {
            errors.push(`Failed to save "${template.document_title}": ${dbError.message}`);
          } else {
            successCount.count++;
          }
        } catch (err) {
          errors.push(`Error processing "${template.document_title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      if (errors.length > 0 && successCount.count === 0) {
        throw new Error(errors.join('\n'));
      }
      
      return { successCount: successCount.count, errors };
    },
    onSuccess: (result) => {
      toast({
        title: result.errors?.length ? `${result.successCount} template(s) copied` : t('common.success'),
        description: result.errors?.length ? `Some templates failed: ${result.errors.join(', ')}` : t('properties.templatesCopied'),
        variant: "default",
      });

      setSelectedTemplateIds([]);
      queryClient.invalidateQueries({ queryKey: ["tenancy-documents", tenancyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-documents"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : "Failed to copy templates",
        variant: "destructive",
      });
    },
  });

  const handleToggleTemplate = (templateId: string) => {
    // Only allow selecting templates with valid files
    const template = templates.find(t => t.id === templateId);
    if (!template?.fileExists) return;
    
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleCopy = () => {
    if (selectedTemplateIds.length > 0) {
      copyMutation.mutate(selectedTemplateIds);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('properties.useTemplate')}</DialogTitle>
          <DialogDescription>
            {t('properties.selectTemplates')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-destructive">
              {t('common.error')}: {queryError?.message || 'Failed to load templates'}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-4">
            {invalidTemplates.length > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{invalidTemplates.length} template(s) have missing files and cannot be copied</span>
                </div>
              </div>
            )}
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className={`flex items-center space-x-3 p-3 border rounded-lg ${
                    !template.fileExists ? 'opacity-50 bg-muted/50' : ''
                  }`}
                >
                  <Checkbox
                    id={template.id}
                    checked={selectedTemplateIds.includes(template.id)}
                    onCheckedChange={() => handleToggleTemplate(template.id)}
                    disabled={!template.fileExists}
                  />
                  <Label 
                    htmlFor={template.id} 
                    className={`flex-1 ${template.fileExists ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.document_title}</p>
                      {!template.fileExists && (
                        <Badge variant="outline" className="text-xs text-warning border-warning">
                          File missing
                        </Badge>
                      )}
                      {template.property_id === null && (
                        <Badge variant="secondary" className="text-xs">
                          Global
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCopy}
                disabled={selectedTemplateIds.length === 0 || copyMutation.isPending}
              >
                {copyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {t('properties.copySelected')} ({selectedTemplateIds.length})
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground">
              {t('properties.noTemplatesAvailable')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('properties.createTemplateFirst')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
