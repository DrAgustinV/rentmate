import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CopyTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
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

  const { data: templates, isLoading, isError, error: queryError, refetch } = useQuery({
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
        console.error('Error fetching property templates:', error);
        throw error;
      }
      
      console.log('Property templates found:', data?.length || 0, data);
      return data || [];
    },
    enabled: open,
    staleTime: 0, // Always refetch when dialog opens
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      if (!currentUser) throw new Error("Not authenticated");

      const errors: string[] = [];
      
      for (const templateId of templateIds) {
        const template = templates?.find(t => t.id === templateId);
        if (!template) {
          errors.push(`Template not found: ${templateId}`);
          continue;
        }

        try {
          // Download the file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("property-documents")
            .download(template.file_path);

          if (downloadError) {
            errors.push(`Failed to download "${template.document_title}": ${downloadError.message}`);
            continue;
          }

          // Create new file path for tenancy
          const extension = template.file_name.match(/\.[^.]+$/)?.[0] || "";
          const newFilePath = `${propertyId}/tenancy_${tenancyId}/${crypto.randomUUID()}${extension}`;

          // Upload to new path
          const { error: uploadError } = await supabase.storage
            .from("property-documents")
            .upload(newFilePath, fileData);

          if (uploadError) {
            errors.push(`Failed to upload "${template.document_title}": ${uploadError.message}`);
            continue;
          }

          // Create new document record
          console.log('Inserting tenancy document:', {
            property_id: propertyId,
            tenancy_id: tenancyId,
            document_title: template.document_title,
            document_category: "tenancy",
          });
          
          const { data: insertedDoc, error: dbError } = await supabase.from("property_documents").insert({
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
            console.error('DB insert error:', dbError);
            errors.push(`Failed to save "${template.document_title}": ${dbError.message}`);
          } else {
            console.log('Document inserted successfully:', insertedDoc);
          }
        } catch (err) {
          errors.push(`Error processing "${template.document_title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
    },
    onSuccess: () => {
      console.log('Templates copied successfully to tenancy:', tenancyId);
      toast({
        title: t('common.success'),
        description: t('properties.templatesCopied'),
      });
      setSelectedTemplateIds([]);
      // Invalidate with specific tenancyId to ensure ContractSignatureManager refreshes
      queryClient.invalidateQueries({ queryKey: ["tenancy-documents", tenancyId] });
      // Also invalidate the general key for any other listeners
      queryClient.invalidateQueries({ queryKey: ["tenancy-documents"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Copy error:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : "Failed to copy templates",
        variant: "destructive",
      });
    },
  });

  const handleToggleTemplate = (templateId: string) => {
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
          <DialogTitle>{t('properties.copyTemplates')}</DialogTitle>
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
              {t('common.retry') || 'Retry'}
            </Button>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={template.id}
                    checked={selectedTemplateIds.includes(template.id)}
                    onCheckedChange={() => handleToggleTemplate(template.id)}
                  />
                  <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">{template.document_title}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
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
              {t('properties.createTemplatesInConfiguration') || 
                'To create document templates, go to Configuration → Templates and upload your contract templates. They will be available here for all properties.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
