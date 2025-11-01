import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type RepairShop = Database["public"]["Tables"]["repair_shops"]["Row"];
type RepairShopInsert = Database["public"]["Tables"]["repair_shops"]["Insert"];
type RepairShopUpdate = Database["public"]["Tables"]["repair_shops"]["Update"];

export function useRepairShops() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: repairShops = [], isLoading } = useQuery({
    queryKey: ["repair-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_shops")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RepairShop[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newShop: RepairShopInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("repair_shops")
        .insert({ ...newShop, manager_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-shops"] });
      toast({
        title: "Success",
        description: "Repair shop contact added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RepairShopUpdate }) => {
      const { data, error } = await supabase
        .from("repair_shops")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-shops"] });
      toast({
        title: "Success",
        description: "Repair shop contact updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repair_shops")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-shops"] });
      toast({
        title: "Success",
        description: "Repair shop contact deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    repairShops,
    isLoading,
    createRepairShop: createMutation.mutate,
    updateRepairShop: updateMutation.mutate,
    deleteRepairShop: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
