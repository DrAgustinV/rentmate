import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type DeleteReason = Database["public"]["Enums"]["delete_reason"];

interface ArchivePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  onSuccess: () => void;
}

export function ArchivePropertyDialog({ open, onOpenChange, property, onSuccess }: ArchivePropertyDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<DeleteReason | undefined>();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [createNewProperty, setCreateNewProperty] = useState(true);
  const { toast } = useToast();
  
  const isActive = property?.status === "active";
  const isEndingTenancy = property?.status === "ending_tenancy";

  const handleArchive = async () => {
    if (isActive && !reason) {
      toast({
        title: t('common.validationError'),
        description: t('dialogs.archiveProperty.reasonRequired'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isActive) {
        // Validate can end tenancy
        const { data: canEnd, error: validationError } = await supabase.rpc('can_end_tenancy', {
          p_property_id: property.id,
          p_address: property.address
        });

        if (validationError) throw validationError;
        
        if (!canEnd) {
          toast({
            title: t('common.validationError'),
            description: t('dialogs.archiveProperty.endingTenancyExists'),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Update property to ending_tenancy
        const { error: updateError } = await supabase
          .from("properties")
          .update({
            status: "ending_tenancy",
            deleted_at: new Date().toISOString(),
            delete_reason: reason,
            modification_reason: notes || null,
            last_modified_by: user.id,
          })
          .eq("id", property.id);

        if (updateError) throw updateError;

        // Create new active property if checkbox is checked
        if (createNewProperty) {
          const { data: canCreate, error: createValidationError } = await supabase.rpc('can_create_active_property', {
            p_address: property.address
          });

          if (createValidationError) throw createValidationError;
          
          if (!canCreate) {
            toast({
              title: t('common.validationError'),
              description: t('dialogs.archiveProperty.activePropertyExists'),
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const { error: createError } = await supabase
            .from("properties")
            .insert({
              title: property.title,
              address: property.address,
              description: property.description,
              images: property.images || [],
              manager_id: user.id,
              status: "active",
              previous_property_id: property.id,
            });

          if (createError) throw createError;
        }

        toast({
          title: t('common.success'),
          description: createNewProperty 
            ? t('dialogs.archiveProperty.successWithNew') 
            : t('dialogs.archiveProperty.successEndTenancy'),
        });
      } else if (isEndingTenancy) {
        // Archive ending tenancy property
        const { error: archiveError } = await supabase
          .from("properties")
          .update({
            status: "inactive",
            last_modified_by: user.id,
          })
          .eq("id", property.id);

        if (archiveError) throw archiveError;

        toast({
          title: t('common.success'),
          description: t('dialogs.archiveProperty.successArchive'),
        });
      }

      setReason(undefined);
      setNotes("");
      setCreateNewProperty(true);
      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isActive ? t('dialogs.archiveProperty.titleEndTenancy') : t('dialogs.archiveProperty.titleArchive')}
          </DialogTitle>
          <DialogDescription>
            {isActive 
              ? t('dialogs.archiveProperty.descriptionEndTenancy') 
              : t('dialogs.archiveProperty.descriptionArchive')}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-warning/10 border border-warning rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning mb-1">
              {isActive ? t('dialogs.archiveProperty.warningTitleEndTenancy') : t('dialogs.archiveProperty.warningTitleArchive')}
            </p>
            <p className="text-muted-foreground">
              {isActive 
                ? t('dialogs.archiveProperty.warningMessageEndTenancy') 
                : t('dialogs.archiveProperty.warningMessageArchive')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isActive && (
            <>
              <div className="space-y-2">
                <Label htmlFor="archive-reason">{t('dialogs.archiveProperty.reasonLabel')}</Label>
                <Select value={reason} onValueChange={(value) => setReason(value as DeleteReason)}>
                  <SelectTrigger id="archive-reason">
                    <SelectValue placeholder={t('dialogs.archiveProperty.reasonPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sold">{t('dialogs.archiveProperty.reasonSold')}</SelectItem>
                    <SelectItem value="no_longer_managing">{t('dialogs.archiveProperty.reasonNoLonger')}</SelectItem>
                    <SelectItem value="merged_with_other_property">{t('dialogs.archiveProperty.reasonMerged')}</SelectItem>
                    <SelectItem value="other">{t('dialogs.archiveProperty.reasonOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="archive-notes">{t('dialogs.archiveProperty.notesLabel')}</Label>
                <Textarea
                  id="archive-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('dialogs.archiveProperty.notesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-new"
                  checked={createNewProperty}
                  onCheckedChange={(checked) => setCreateNewProperty(checked as boolean)}
                />
                <Label
                  htmlFor="create-new"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('dialogs.archiveProperty.createNewProperty')}
                </Label>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant={isActive ? "default" : "destructive"} 
            onClick={handleArchive} 
            disabled={loading}
          >
            {loading 
              ? (isActive ? t('dialogs.archiveProperty.endingTenancy') : t('dialogs.archiveProperty.archiving'))
              : (isActive ? t('dialogs.archiveProperty.endTenancy') : t('dialogs.archiveProperty.archive'))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}