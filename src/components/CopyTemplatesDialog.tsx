import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { documentService } from "@/services";

interface Template {
  id: string;
  document_title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
}

interface CopyTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
  templates: Template[];
}

export const CopyTemplatesDialog = ({ open, onOpenChange, propertyId, tenancyId, templates }: CopyTemplatesDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleCopy = async () => {
    setIsCopying(true);
    setSuccessCount(0);
    setErrors([]);

    try {
      for (const template of templates) {
        try {
          // Generate a unique file path for the new document
          const newFilePath = `tenancy-documents/${propertyId}/${tenancyId}/${Date.now()}-${template.file_name}`;
          
          // Copy the file from storage
          const { error: copyError } = await supabase.storage
            .from('property-documents')
            .copy(`tenancy-documents/${propertyId}/templates/${template.file_name}`, newFilePath);

          if (copyError) throw copyError;

          // Insert the new document record
          await documentService.insertDocument({
            property_id: propertyId,
            tenancy_id: tenancyId,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
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
          });
          setSuccessCount(prev => prev + 1);
        } catch (err) {
          setErrors(prev => [...prev, `Failed to save "${template.document_title}": ${err instanceof Error ? err.message : 'Unknown error'}`]);
        }
      }
    } catch (err) {
      setErrors(prev => [...prev, `Error processing "${templates[0]?.document_title}": ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setIsCopying(false);
      onOpenChange(false);
      
      if (successCount > 0) {
        toast({
          title: t('common.success'),
          description: `${successCount} template(s) copied successfully.`,
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: t('common.error'),
          description: errors.join('\n'),
          variant: "destructive",
        });
      }

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ['property-documents', propertyId, tenancyId] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('contractSignature.copyTemplates')}</DialogTitle>
          <DialogDescription>
            {t('contractSignature.copyTemplatesDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isCopying ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('contractSignature.copyingInProgress')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('contractSignature.templatesToCopy')}</span>
                  <span className="text-sm text-muted-foreground">{templates.length}</span>
                </div>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{template.document_title}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {errors.length > 0 && (
                <div className="rounded-lg border border-destructive/50 p-3 bg-destructive/10">
                  <p className="text-sm text-destructive font-medium mb-1">{t('contractSignature.errors')}</p>
                  <ul className="text-xs text-destructive/80 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {successCount > 0 && (
                <div className="rounded-lg border border-green-500/50 p-3 bg-green-500/10">
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('contractSignature.successCount').replace('{count}', String(successCount))}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCopying}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCopy} disabled={isCopying || templates.length === 0}>
            {isCopying ? t('common.processing') : t('contractSignature.copyTemplates')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
