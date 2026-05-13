import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/ui/country-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Save, Pencil } from "lucide-react";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import { cn } from "@/lib/utils";
import { usePropertyMutations } from "@/hooks/useProperties";
import { propertyBaseSchema } from "@/lib/validations/property.schema";
import { z } from "zod";
import { PropertyManagementDialogs } from "@/components/property-hub/PropertyManagementDialogs";

interface OverviewTabProps {
  property: any;
  propertyId: string;
  userRole: { isManager: boolean; userId?: string } | null | undefined;
  activeTenant: any;
  templates?: Array<{ id: string; document_title: string }>;
  invitations?: Array<{ id: string; email: string; status: string; expires_at: string }>;
  onInviteTenant?: (email: string) => void;
  hasNoTenants?: boolean;
}

export function OverviewTab({ property, propertyId, userRole, activeTenant, templates = [], invitations = [], hasNoTenants = false }: OverviewTabProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(property?.title || "");
  const [address, setAddress] = useState(property?.address || "");
  const [city, setCity] = useState(property?.city || "");
  const [stateProvince, setStateProvince] = useState(property?.state_province || "");
  const [postalCode, setPostalCode] = useState(property?.postal_code || "");
  const [country, setCountry] = useState(property?.country || "");
  const [description, setDescription] = useState(property?.description || "");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState<
    "sold" | "no_longer_managing" | "merged_with_other_property" | "other"
  >("sold");
  const [archiveNotes, setArchiveNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyPhotoUrl, setPropertyPhotoUrl] = useState<string | undefined>();
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast.error(t('ai.titleRequired'));
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'property_description',
          data: { title, address, city, country }
        }
      });
      
      if (error) throw error;
      if (data?.text) {
        setDescription(data.text);
        toast.success(t('ai.descriptionGenerated'));
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(t('ai.generationError'));
    } finally {
      setGeneratingDescription(false);
    }
  };

  useEffect(() => {
    if (property) {
      setTitle(property.title || "");
      setAddress(property.address || "");
      setPostalCode(property.postal_code || "");
      setCity(property.city || "");
      setStateProvince(property.state_province || "");
      setCountry(property.country || "");
      setDescription(property.description || "");
    }
  }, [property]);

  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (property?.images?.[0]) {
        const { data } = await supabase.storage
          .from('property-photos')
          .createSignedUrl(property.images[0], 3600);
        if (data) {
          setPropertyPhotoUrl(data.signedUrl);
        }
      } else {
        setPropertyPhotoUrl(undefined);
      }
    };
    fetchPhotoUrl();
  }, [property?.images]);

  const { archiveProperty, deleteProperty } = usePropertyMutations();

  const updatePropertyMutation = useMutation({
    mutationFn: async (updates: { title: string; address: string; postal_code: string; city: string; state_province: string; country: string; description: string }) => {
      const validatedData = propertyBaseSchema.parse(updates);
      const { error } = await supabase.from("properties").update(validatedData).eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("properties.updateSuccess"));
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          const field = err.path.join('.');
          toast.error(`${field}: ${err.message}`);
        });
      } else {
        toast.error(t("properties.updateError"));
      }
    },
  });

  const handleSave = () => {
    updatePropertyMutation.mutate({
      title,
      address,
      postal_code: postalCode,
      city,
      state_province: stateProvince,
      country,
      description
    });
  };

  const handleArchive = () => {
    archiveProperty.mutate(
      { id: propertyId, reason: archiveReason, notes: archiveNotes },
      {
        onSuccess: () => {
          setShowArchiveDialog(false);
          navigate("/properties");
        },
      }
    );
  };

  const handleDelete = () => {
    deleteProperty.mutate(propertyId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        navigate("/properties");
      },
    });
  };

  const tenantName = activeTenant?.profiles
    ? `${activeTenant.profiles.first_name || ""} ${activeTenant.profiles.last_name || ""}`.trim() ||
      activeTenant.profiles.email
    : t("properties.noTenant");

  const isArchived = property?.status === "inactive";

  return (
    <div className="space-y-6">
      <Card className="card-shine">
        <CardHeader>
          <div className="space-y-6">
            <Card className="card-shine border-none">
              <CardHeader className="px-6 pt-2 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {userRole?.isManager ? (
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!isEditing}
                        required
                        className={cn(
                          !title.trim() && isEditing && "border-destructive",
                          "text-lg font-bold w-full"
                        )}
                      />
                    ) : (
                      <p className="text-lg font-bold py-1 truncate">{title}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {userRole?.isManager && !isEditing && !isArchived && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </Button>
                    )}
                    <Badge variant={property?.status === "active" ? "default" : "secondary"}>
                      {property?.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-6 pt-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="max-h-64 flex items-center justify-start">
                    {/* Your content here */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="max-h-64 flex items-center justify-start">
              {userRole?.isManager && isEditing ? (
                <PropertyPhotoUpload
                  propertyId={propertyId}
                  currentPhoto={propertyPhotoUrl}
                  onPhotoChange={() => {}}
                />
              ) : (
                propertyPhotoUrl && (
                  <div className="space-y-2">
                    <img
                      src={propertyPhotoUrl}
                      alt={property?.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="address">{t("properties.address")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={!isEditing}
                      placeholder={t("properties.streetAddress")}
                    />
                  ) : (
                    <p className="text-sm py-2">{address || "-"}</p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t("properties.postalCode")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      disabled={!isEditing}
                      placeholder={t("properties.postalCodePlaceholder")}
                    />
                  ) : (
                    <p className="text-sm py-2">{postalCode || "-"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">{t("properties.city")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!isEditing}
                      placeholder={t("properties.cityPlaceholder")}
                    />
                  ) : (
                    <p className="text-sm py-2">{city || "-"}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stateProvince">{t("properties.stateProvince")}</Label>
                    {userRole?.isManager ? (
                      <Input
                        id="stateProvince"
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("properties.stateProvincePlaceholder")}
                      />
                    ) : (
                      <p className="text-sm py-2">{stateProvince || "-"}</p>
                    )}
                  </div>
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="country">{t("properties.country")}</Label>
                  {userRole?.isManager ? (
                    <CountrySelect
                      value={country}
                      onValueChange={setCountry}
                      disabled={!isEditing}
                      placeholder={t("properties.countryPlaceholder")}
                    />
                  ) : (
                    <p className="text-sm py-2">{country || "-"}</p>
                  )}
                  </div>
                </div>
            </div>
          </div>

          {isEditing && userRole?.isManager && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTitle(property?.title || "");
                  setAddress(property?.address || "");
                  setPostalCode(property?.postal_code || "");
                  setCity(property?.city || "");
                  setStateProvince(property?.state_province || "");
                  setCountry(property?.country || "");
                  setDescription(property?.description || "");
                  setIsEditing(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updatePropertyMutation.isPending || !title.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {t("common.save")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PropertyManagementDialogs
        propertyId={propertyId}
        isArchived={isArchived}
        hasNoTenants={hasNoTenants}
        userRole={userRole}
        archiveReason={archiveReason}
        archiveNotes={archiveNotes}
        showArchiveDialog={showArchiveDialog}
        showDeleteDialog={showDeleteDialog}
        archiveProperty={archiveProperty}
        deleteProperty={deleteProperty}
        onArchiveReasonChange={setArchiveReason}
        onArchiveNotesChange={setArchiveNotes}
        onArchiveConfirm={handleArchive}
        onDeleteConfirm={handleDelete}
        onArchiveDialogChange={setShowArchiveDialog}
        onDeleteDialogChange={setShowDeleteDialog}
      />
    </div>
  );
}
