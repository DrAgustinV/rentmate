import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Inspection, InspectionItem, InspectionType, DEFAULT_ROOMS } from "@/components/inspection/types";

export function useInspections(tenancyId: string | undefined, propertyId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const inspectionsQuery = useQuery({
    queryKey: ["inspections", tenancyId, propertyId],
    queryFn: async () => {
      if (!tenancyId) return [];
      
      const { data, error } = await supabase
        .from("tenancy_inspections")
        .select("*")
        .eq("tenancy_id", tenancyId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Inspection[];
    },
    enabled: !!tenancyId,
  });

  const createInspectionMutation = useMutation({
    mutationFn: async ({ 
      type, 
      tenancyId: tId, 
      propertyId: pId 
    }: { 
      type: InspectionType; 
      tenancyId: string; 
      propertyId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from("tenancy_inspections")
        .insert({
          tenancy_id: tId,
          property_id: pId,
          inspection_type: type,
          status: "draft",
          created_by: user.id,
          manager_id: user.id,
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      // Create default room items
      const roomItems = DEFAULT_ROOMS.map(room => ({
        inspection_id: inspection.id,
        room_name: room.name,
        room_order: room.order,
      }));

      const { error: itemsError } = await supabase
        .from("inspection_items")
        .insert(roomItems);

      if (itemsError) throw itemsError;

      return inspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.success(t("inspections.created"));
    },
    onError: (error) => {
      toast.error(t("inspections.createFailed"));
      console.error(error);
    },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from("tenancy_inspections")
        .delete()
        .eq("id", inspectionId)
        .select('id');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-items"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-detail"] });
      toast.success(t("inspections.deleted"));
    },
    onError: (error) => {
      toast.error(t("inspections.deleteFailed"));
    },
  });

  return {
    inspections: inspectionsQuery.data || [],
    isLoading: inspectionsQuery.isLoading,
    createInspection: createInspectionMutation.mutateAsync,
    deleteInspection: deleteInspectionMutation.mutateAsync,
    isCreating: createInspectionMutation.isPending,
    isDeleting: deleteInspectionMutation.isPending,
  };
}

export function useInspectionItems(inspectionId: string | undefined) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["inspection-items", inspectionId],
    queryFn: async () => {
      if (!inspectionId) return [];
      
      const { data, error } = await supabase
        .from("inspection_items")
        .select("*")
        .eq("inspection_id", inspectionId)
        .order("room_order", { ascending: true });
      
      if (error) throw error;
      return data as InspectionItem[];
    },
    enabled: !!inspectionId,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string; 
      updates: Partial<InspectionItem>;
    }) => {
      const { error } = await supabase
        .from("inspection_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-items", inspectionId] });
    },
    onError: (error) => {
      toast.error(t("inspections.updateRoomFailed"));
      console.error(error);
    },
  });

  const addRoomMutation = useMutation({
    mutationFn: async ({ roomName, roomOrder }: { roomName: string; roomOrder: number }) => {
      if (!inspectionId) throw new Error("No inspection ID");

      const { error } = await supabase
        .from("inspection_items")
        .insert({
          inspection_id: inspectionId,
          room_name: roomName,
          room_order: roomOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-items", inspectionId] });
      toast.success(t("inspections.roomAdded"));
    },
    onError: (error) => {
      toast.error(t("inspections.addRoomFailed"));
      console.error(error);
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("inspection_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-items", inspectionId] });
      toast.success(t("inspections.roomRemoved"));
    },
    onError: (error) => {
      toast.error(t("inspections.removeRoomFailed"));
      console.error(error);
    },
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    updateItem: updateItemMutation.mutateAsync,
    addRoom: addRoomMutation.mutateAsync,
    deleteRoom: deleteRoomMutation.mutateAsync,
    isUpdating: updateItemMutation.isPending,
  };
}

export function useInspectionSignatures(inspectionId: string | undefined) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const signMutation = useMutation({
    mutationFn: async ({
      role,
      signatureData
    }: {
      role: 'manager' | 'tenant';
      signatureData: unknown;
    }) => {
      if (!inspectionId) throw new Error("No inspection ID");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {};
      if (role === 'manager') {
        updates.manager_signed_at = new Date().toISOString();
        updates.manager_signature_data = signatureData;
      } else {
        updates.tenant_signed_at = new Date().toISOString();
        updates.tenant_signature_data = signatureData;
      }

      // Check if both signatures will be present
      const { data: inspection } = await supabase
        .from("tenancy_inspections")
        .select("manager_signed_at, tenant_signed_at")
        .eq("id", inspectionId)
        .single();

      const willBeComplete = role === 'manager' 
        ? !!inspection?.tenant_signed_at 
        : !!inspection?.manager_signed_at;

      if (willBeComplete) {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } else {
        updates.status = 'pending_signatures';
      }

      const { error } = await supabase
        .from("tenancy_inspections")
        .update(updates)
        .eq("id", inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-detail", inspectionId] });
      toast.success(t("inspections.signed"));
    },
    onError: (error) => {
      toast.error(t("inspections.signFailed"));
      console.error(error);
    },
  });

  return {
    signInspection: signMutation.mutateAsync,
    isSigning: signMutation.isPending,
  };
}

export function useUpdateInspectionStatus(inspectionId: string | undefined) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: 'draft' | 'in_progress' | 'pending_signatures' | 'completed') => {
      if (!inspectionId) throw new Error("No inspection ID");

      const { error } = await supabase
        .from("tenancy_inspections")
        .update({ status })
        .eq("id", inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-detail", inspectionId] });
    },
    onError: (error) => {
      toast.error(t("inspections.updateStatusFailed"));
      console.error(error);
    },
  });
}
