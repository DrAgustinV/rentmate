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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Save, Archive, Plus, Pencil, Users, Mail, Sparkles, Loader2, Trash2 } from "lucide-react";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import { cn } from "@/lib/utils";
import { usePropertyMutations } from "@/hooks/useProperties";
import { propertyService, getSignedUrl, identityService } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";
import { propertyBaseSchema } from "@/lib/validations/property.schema";
import { z } from "zod";
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
  const [stateProvince, setStateProvince] = useState(property?.stateProvince || "");
  const [postalCode, setPostalCode] = useState(property?.postalCode || "");
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
      const data = await identityService.invokeAIAssistant({
        type: 'property_description',
        data: { title, address, city, country }
      });
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

  // Update state when property changes
  useEffect(() => {
    if (property) {
      setTitle(property.title || "");
      setAddress(property.address || "");
      setPostalCode(property.postalCode || "");
      setCity(property.city || "");
      setStateProvince(property.stateProvince || "");
      setCountry(property.country || "");
      setDescription(property.description || "");
    }
  }, [property]);

  // Fetch signed URL for property photo
  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (property?.images?.[0]) {
        try {
          const url = await getSignedUrl(STORAGE_BUCKETS.PROPERTY_PHOTOS, property.images[0], SIGNED_URL_TTL);
          setPropertyPhotoUrl(url);
        } catch {
          setPropertyPhotoUrl(undefined);
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
      await propertyService.updatePropertySettings(propertyId, validatedData);
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

  // Check for pending invitations
  const hasPendingInvitation = invitations && invitations.length > 0;

  return (
    <div className="space-y-6">
      <Card className="card-shine">
        <CardHeader>
          <div className="space-y-6">
            <Card className="card-shine border-none">
              <CardHeader className="px-6 pt-2 pb-0">
                <div className="flex items-center justify-between">
                  {/* LEFT - Title (takes all remaining space) */}
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

                  {/* RIGHT - Button & Badge */}
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

              {/* Content Area */}
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
                    {/* <Label>{t("properties.photo")}</Label> */}
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

          <div className="space-y-2">
            {/* <div className="flex items-center justify-between">
              <Label htmlFor="description">{t("properties.description")}</Label>
              {isEditing && userRole?.isManager && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !title.trim()}
                  className="h-7 text-xs"
                >
                  {generatingDescription ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {t('ai.generate')}
                </Button>
              )}
            </div> */}
            {userRole?.isManager ? (
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder={t("properties.descriptionPlaceholder")}
              />
            ) : (
              <p className="text-sm py-2 whitespace-pre-wrap">{description || t("properties.noDescription")}</p>
            )}
          </div>

          {isEditing && userRole?.isManager && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTitle(property?.title || "");
                  setAddress(property?.address || "");
                  setPostalCode(property?.postalCode || "");
                  setCity(property?.city || "");
                  setStateProvince(property?.stateProvince || "");
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

      {/* Archive Property Section - Manager Only */}
      {userRole?.isManager && property?.status === "active" && (
        <Card className="card-shine border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-600">{t("properties.archiveProperty")}</CardTitle>
            <CardDescription>{t("properties.archivePropertyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30" onClick={() => setShowArchiveDialog(true)}>
              <Archive className="h-4 w-4 mr-2" />
              {t("properties.archiveProperty")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.archiveProperty")}</AlertDialogTitle>
            <AlertDialogDescription>{t("properties.archiveConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("properties.archiveReason")}</Label>
              <Select value={archiveReason} onValueChange={(v: any) => setArchiveReason(v)}>
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
                onChange={(e) => setArchiveNotes(e.target.value)}
                placeholder={t("properties.archiveNotesPlaceholder")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="border border-yellow-500 bg-yellow-500 text-yellow-950 hover:bg-yellow-600">
              {t("properties.archiveProperty")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Property Section - Manager Only, No Tenants Ever */}
      {userRole?.isManager && hasNoTenants && (
        <Card className="card-shine border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-600">{t("properties.deleteProperty")}</CardTitle>
            <CardDescription>{t("properties.permanentlyDelete.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("properties.deleteProperty")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={handleDelete}
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

    </div>
  );
}
