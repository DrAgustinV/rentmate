import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("setting_key");

      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: { value },
          updated_by: user.id,
        })
        .eq("setting_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Setting updated successfully");
      setEditingKey(null);
      setEditValue("");
    },
    onError: (error) => {
      toast.error("Failed to update setting: " + error.message);
    },
  });

  const handleEdit = (key: string, currentValue: number) => {
    setEditingKey(key);
    setEditValue(currentValue.toString());
  };

  const handleSave = (key: string) => {
    const numValue = parseInt(editValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    updateMutation.mutate({ key, value: numValue });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      {settings?.map((setting) => {
        const currentValue = typeof setting.setting_value === 'object' && setting.setting_value !== null
          ? (setting.setting_value as { value: number }).value
          : 0;
        const isEditing = editingKey === setting.setting_key;

        return (
          <div
            key={setting.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <Label className="text-base font-medium">
                {setting.setting_key.replace(/_/g, " ").toUpperCase()}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {setting.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24"
                    min="0"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSave(setting.setting_key)}
                    disabled={updateMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingKey(null);
                      setEditValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-lg font-semibold w-16 text-right">
                    {currentValue}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(setting.setting_key, currentValue)}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
