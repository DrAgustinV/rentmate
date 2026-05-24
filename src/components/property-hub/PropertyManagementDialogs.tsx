import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Archive, Trash2, Loader2 } from "lucide-react";

interface PropertyManagementDialogsProps {
  propertyId: string;
  isArchived: boolean;
  hasNoTenants: boolean;
  userRole: { isManager: boolean; userId?: string } | null | undefined;
  archiveReason: "sold" | "no_longer_managing" | "merged_with_other_property" | "other";
  archiveNotes: string;
  showArchiveDialog: boolean;
  showDeleteDialog: boolean;
  archiveProperty: { isPending: boolean };
  deleteProperty: { isPending: boolean };
  onArchiveReasonChange: (reason: "sold" | "no_longer_managing" | "merged_with_other_property" | "other") => void;
  onArchiveNotesChange: (notes: string) => void;
  onArchiveConfirm: () => void;
  onDeleteConfirm: () => void;
  onArchiveDialogChange: (open: boolean) => void;
  onDeleteDialogChange: (open: boolean) => void;
}

export function PropertyManagementDialogs({
  isArchived,
  hasNoTenants,
  userRole,
  archiveReason,
  archiveNotes,
  showArchiveDialog,
  showDeleteDialog,
  archiveProperty,
  deleteProperty,
  onArchiveReasonChange,
  onArchiveNotesChange,
  onArchiveConfirm,
  onDeleteConfirm,
  onArchiveDialogChange,
  onDeleteDialogChange,
}: PropertyManagementDialogsProps) {
  const { t } = useLanguage();

  if (!userRole?.isManager) return null;

  return (
    <>
      {/* Archive Property Section */}
      {!isArchived && (
        <Card className="card-shine border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-600">{t("properties.archiveProperty")}</CardTitle>
            <CardDescription>{t("properties.archivePropertyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30" onClick={() => onArchiveDialogChange(true)}>
              <Archive className="h-4 w-4 mr-2" />
              {t("properties.archiveProperty")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={onArchiveDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.archiveProperty")}</AlertDialogTitle>
            <AlertDialogDescription>{t("properties.archiveConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("properties.archiveReason")}</Label>
              <Select value={archiveReason} onValueChange={(v: string) => onArchiveReasonChange(v as typeof archiveReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sold">{t("properties.archiveReasons.sold")}</SelectItem>
                  <SelectItem value="no_longer_managing">{t("properties.archiveReasons.noLongerManaging")}</SelectItem>
                  <SelectItem value="merged_with_other_property">{t("properties.archiveReasons.merged")}</SelectItem>
                  <SelectItem value="other">{t("properties.archiveReasons.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("properties.archiveNotes")}</Label>
              <Textarea
                value={archiveNotes}
                onChange={(e) => onArchiveNotesChange(e.target.value)}
                placeholder={t("properties.archiveNotesPlaceholder")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onArchiveConfirm} className="border border-yellow-500 bg-yellow-500 text-yellow-950 hover:bg-yellow-600">
              {archiveProperty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("properties.archiveProperty")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Property Section */}
      {hasNoTenants && (
        <Card className="card-shine border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-600">{t("properties.deleteProperty")}</CardTitle>
            <CardDescription>{t("properties.permanentlyDelete.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onDeleteDialogChange(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("properties.deleteProperty")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={onDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.permanentlyDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("properties.permanentlyDelete.warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              disabled={deleteProperty.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteProperty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("properties.permanentlyDelete.deleting")}
                </>
              ) : (
                t("properties.permanentlyDelete.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
