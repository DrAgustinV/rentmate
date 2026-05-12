import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newUtilityType, setNewUtilityType] = useState("");
  const [editingUtilities, setEditingUtilities] = useState(false);

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

  // Utility types state
  const { data: utilityTypes = [], isLoading: isLoadingUtilities } = useQuery({
    queryKey: ["utility_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "utility_types")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const value = data.setting_value as { value: string[] };
        return value.value || [];
      }
      return [];
    },
  });

  const updateUtilityTypesMutation = useMutation({
    mutationFn: async (types: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "utility_types",
          setting_value: { value: types },
          updated_by: user.id,
          description: "Available utility types for tenancy setup (stored as JSON array of strings)",
        }, {
          onConflict: "setting_key",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility_types"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Utility types updated successfully");
      setEditingUtilities(false);
      setNewUtilityType("");
    },
    onError: (error) => {
      toast.error("Failed to update utility types: " + error.message);
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

  const handleAddUtilityType = () => {
    const trimmed = newUtilityType.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!trimmed) {
      toast.error("Please enter a valid utility type");
      return;
    }
    if (utilityTypes.includes(trimmed)) {
      toast.error("Utility type already exists");
      return;
    }
    updateUtilityTypesMutation.mutate([...utilityTypes, trimmed]);
    setNewUtilityType("");
  };

  const handleRemoveUtilityType = (type: string) => {
    updateUtilityTypesMutation.mutate(utilityTypes.filter(t => t !== type));
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Utility Types Management */}
      <Card>
        <CardHeader>
          <CardTitle>Utility Types</CardTitle>
          <CardDescription>Configure which utilities appear in the New Tenancy Setup wizard</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUtilities ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {utilityTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-sm capitalize px-3 py-1">
                    {type.replace(/_/g, ' ')}
                    <button
                      onClick={() => handleRemoveUtilityType(type)}
                      className="ml-2 hover:text-destructive"
                      aria-label={`Remove ${type}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newUtilityType}
                  onChange={(e) => setNewUtilityType(e.target.value)}
                  placeholder="Add new utility type (e.g. solar)"
                  className="max-w-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddUtilityType();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddUtilityType}
                  disabled={updateUtilityTypesMutation.isPending || !newUtilityType.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other System Settings */}
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
