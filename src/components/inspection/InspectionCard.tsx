import { useState } from "react";
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
}

export function InspectionCard({ 
  tenancyId, 
  propertyId, 
  isManager,
  isReadOnly,
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

  const handleCreate = async (type: InspectionType) => {
    const inspection = await createInspection({ type, tenancyId, propertyId });
    setSelectedInspection(inspection);
    setCreateType(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteInspection(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const getStatusBadge = (inspection: Inspection) => {
    switch (inspection.status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'pending_signatures':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending Signatures</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: InspectionType) => {
    return type === 'move_in' 
      ? <Badge variant="outline" className="text-emerald-600 border-emerald-300">Move-In</Badge>
      : <Badge variant="outline" className="text-orange-600 border-orange-300">Move-Out</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Property Inspections
            </CardTitle>
            <CardDescription>
              Move-in and move-out condition reports
            </CardDescription>
          </div>
          {isManager && !isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Inspection
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCreate('move_in')}>
                  Move-In Inspection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate('move_out')}>
                  Move-Out Inspection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading inspections...</div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No inspections yet</p>
              {isManager && !isReadOnly && (
                <p className="text-xs mt-1">Create a move-in or move-out inspection to document property condition</p>
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
                        Signed by both parties
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedInspection(inspection)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {inspection.pdf_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(inspection.pdf_url!, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {isManager && !isReadOnly && inspection.status === 'draft' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(inspection)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <AlertDialogTitle>Delete Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this inspection and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
