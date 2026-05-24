import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  ClipboardCheck, 
  FileText, 
  Pen, 
  Plus,
  Trash2,
  CheckCircle,
  Save,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInspectionItems, useUpdateInspectionStatus, useInspectionSignatures } from "@/hooks/useInspections";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import { Inspection, InspectionItem, ConditionRating, CONDITION_RATINGS, DEFAULT_ROOMS } from "./types";
import { RoomInspectionItem } from "./RoomInspectionItem";
import { InspectionSignature } from "./InspectionSignature";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InspectionDialogProps {
  inspection: Inspection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager: boolean;
  isReadOnly: boolean;
}

export function InspectionDialog({
  inspection,
  open,
  onOpenChange,
  isManager,
  isReadOnly,
}: InspectionDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rooms");
  const [newRoomName, setNewRoomName] = useState("");
  const [overallNotes, setOverallNotes] = useState(inspection.notes || "");

  const { items, isLoading, updateItem, addRoom, deleteRoom, isUpdating } = useInspectionItems(inspection.id);
  const updateStatusMutation = useUpdateInspectionStatus(inspection.id);
  const { signInspection, isSigning } = useInspectionSignatures(inspection.id);

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from("tenancy_inspections")
        .update({ notes })
        .eq("id", inspection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      showToast.success("Notes saved");
    },
  });

  const canEdit = isManager && !isReadOnly && inspection.status !== 'completed';
  const canSign = inspection.status === 'in_progress' || inspection.status === 'pending_signatures';
  const managerSigned = !!inspection.manager_signed_at;
  const tenantSigned = !!inspection.tenant_signed_at;

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.room_order)) : -1;
    await addRoom({ roomName: newRoomName.trim(), roomOrder: maxOrder + 1 });
    setNewRoomName("");
  };

  const handleStartInspection = async () => {
    await updateStatusMutation.mutateAsync('in_progress');
    showToast.success("Inspection started");
  };

  const handleReadyForSignatures = async () => {
    await updateStatusMutation.mutateAsync('pending_signatures');
    showToast.success("Inspection ready for signatures");
  };

  const handleSign = async (signatureData: Record<string, unknown>) => {
    const role = isManager ? 'manager' : 'tenant';
    await signInspection({ role, signatureData });
  };

  const roomsComplete = items.every(item => item.condition !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {inspection.inspection_type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection
            <Badge variant="outline" className="ml-2">
              {inspection.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="rooms">
              <FileText className="h-4 w-4 mr-1" />
              Rooms ({items.length})
            </TabsTrigger>
            <TabsTrigger value="notes">
              <Pen className="h-4 w-4 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="signatures">
              <CheckCircle className="h-4 w-4 mr-1" />
              Signatures
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="rooms" className="space-y-4 m-0 pr-4">
              {/* Status Actions */}
              {canEdit && inspection.status === 'draft' && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <p className="text-sm">Start the inspection to begin documenting room conditions.</p>
                  <Button onClick={handleStartInspection} disabled={updateStatusMutation.isPending}>
                    Start Inspection
                  </Button>
                </div>
              )}

              {canEdit && inspection.status === 'in_progress' && roomsComplete && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">All rooms documented. Ready for signatures.</p>
                  <Button onClick={handleReadyForSignatures} disabled={updateStatusMutation.isPending}>
                    Ready for Signatures
                  </Button>
                </div>
              )}

              {/* Room List */}
              {isLoading ? (
                <p className="text-muted-foreground">Loading rooms...</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <RoomInspectionItem
                      key={item.id}
                      item={item}
                      inspectionId={inspection.id}
                      canEdit={canEdit && inspection.status === 'in_progress'}
                      onUpdate={updateItem}
                      onDelete={() => deleteRoom(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* Add Room */}
              {canEdit && inspection.status === 'in_progress' && (
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add custom room..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
                  />
                  <Button variant="outline" onClick={handleAddRoom} disabled={!newRoomName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 m-0 pr-4">
              <div className="space-y-2">
                <Label>Overall Notes & Comments</Label>
                <Textarea
                  placeholder="Add any overall notes about the property condition..."
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  rows={6}
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Button 
                    onClick={() => saveNotesMutation.mutate(overallNotes)}
                    disabled={saveNotesMutation.isPending}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Notes
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Room Summary</h4>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{item.room_name}</span>
                      {item.condition ? (
                        <Badge 
                          className={CONDITION_RATINGS.find(r => r.value === item.condition)?.color}
                        >
                          {item.condition}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not inspected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signatures" className="space-y-4 m-0 pr-4">
              <InspectionSignature
                inspection={inspection}
                isManager={isManager}
                canSign={canSign}
                managerSigned={managerSigned}
                tenantSigned={tenantSigned}
                onSign={handleSign}
                isSigning={isSigning}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
