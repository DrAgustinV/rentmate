import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  Plus, 
  FileText, 
  Download, 
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInspections } from "@/hooks/useInspections";
import { formatDate } from "@/lib/dateUtils";
import { InspectionDialog } from "./InspectionDialog";
import { Inspection, InspectionType } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface InspectionCardProps {
  tenancyId: string;
  propertyId: string;
  isManager: boolean;
  isReadOnly: boolean;
  tenancyStatus?: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  isSelfManaged?: boolean;
}

export function InspectionCard({
  tenancyId,
  propertyId,
  isManager,
  isReadOnly,
  tenancyStatus,
  isSelfManaged,
}: InspectionCardProps) {
  const { t } = useLanguage();
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [createType, setCreateType] = useState<InspectionType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Inspection | null>(null);

  const { 
    inspections, 
    isLoading, 
    createInspection, 
    deleteInspection,
    isCreating,
    isDeleting,
  } = useInspections(tenancyId, propertyId);

  const canCreateMoveIn = tenancyStatus === 'active' || tenancyStatus === 'pending';
  const canCreateMoveOut = tenancyStatus === 'ending_tenancy' || tenancyStatus === 'historic';

  const handleCreate = useCallback(async (type: InspectionType) => {
    const inspection = await createInspection({ type, tenancyId, propertyId });
    setSelectedInspection(inspection);
    setCreateType(null);
  }, [createInspection, tenancyId, propertyId]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    await deleteInspection(deleteConfirm.id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteInspection]);

  const handleOpenInspection = useCallback((inspection: Inspection) => {
    setSelectedInspection(inspection);
  }, []);

  const handleOpenDeleteConfirm = useCallback((inspection: Inspection) => {
    setDeleteConfirm(inspection);
  }, []);

  const handleDownloadPdf = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const getStatusBadge = useCallback((inspection: Inspection) => {
    switch (inspection.status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('inspections.draft')}</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" />{t('inspections.inProgress')}</Badge>;
      case 'pending_signatures':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="h-3 w-3 mr-1" />{t('inspections.pendingSignatures')}</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />{t('inspections.completed')}</Badge>;
      default:
        return null;
    }
  }, [t]);

  const getTypeBadge = useCallback((type: InspectionType) => {
    return type === 'move_in' 
      ? <Badge variant="outline" className="text-emerald-600 border-emerald-300">{t('inspections.moveIn')}</Badge>
      : <Badge variant="outline" className="text-orange-600 border-orange-300">{t('inspections.moveOut')}</Badge>;
  }, [t]);

  return (
    <>
      <Card className="card-shine">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          {/* <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t('inspections.title')}
            </CardTitle>
            <CardDescription>
              {t('inspections.description') || 'Move-in and move-out condition reports'}
            </CardDescription>
          </div> */}
          {isManager && !isReadOnly && (canCreateMoveIn || canCreateMoveOut) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('inspections.newInspection')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canCreateMoveIn && (
                  <DropdownMenuItem onClick={() => handleCreate('move_in')}>
                    {t('inspections.newMoveIn')}
                  </DropdownMenuItem>
                )}
                {canCreateMoveOut && (
                  <DropdownMenuItem onClick={() => handleCreate('move_out')}>
                    {t('inspections.newMoveOut')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t('inspections.loading')}</div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('inspections.noInspections')}</p>
              {isManager && !isReadOnly && (
                <p className="text-xs mt-1">{t('inspections.createHint')}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <div 
                  key={inspection.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(inspection.inspection_type)}
                      {getStatusBadge(inspection)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(inspection.inspection_date)}
                    </p>
                    {inspection.status === 'completed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('inspections.signedByBoth')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenInspection(inspection)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {inspection.pdf_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadPdf(inspection.pdf_url!)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {isManager && !isReadOnly && (
                      (inspection.status === 'draft' || isSelfManaged) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleOpenDeleteConfirm(inspection)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Dialog */}
      {selectedInspection && (
        <InspectionDialog
          inspection={selectedInspection}
          open={!!selectedInspection}
          onOpenChange={(open) => !open && setSelectedInspection(null)}
          isManager={isManager}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inspections.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspections.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? t('common.deleting') || 'Deleting...' : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
