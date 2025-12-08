import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Save, Archive, Plus, Pencil, Users } from "lucide-react";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import { cn } from "@/lib/utils";
import { usePropertyMutations } from "@/hooks/useProperties";
import { propertyBaseSchema } from "@/lib/validations/property.schema";
import { z } from "zod";
import { CreateTenancyWizard } from "@/components/CreateTenancyWizard";
import { useTenancyRequirements, CreateTenancyRequirementInput } from "@/hooks/useTenancyRequirements";
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
  onInviteTenant?: (email: string) => void;
}

export function OverviewTab({ property, propertyId, userRole, activeTenant, templates = [], onInviteTenant }: OverviewTabProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  
  const { createRequirement } = useTenancyRequirements(propertyId);

  const handleWizardSubmit = async (data: CreateTenancyRequirementInput) => {
    try {
      await createRequirement.mutateAsync(data);
      if (onInviteTenant) {
        onInviteTenant(data.tenant_email);
      }
      toast.success(t('tenancy.wizard.invitationSent') || 'Invitation sent successfully');
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };
  
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
  const [propertyPhotoUrl, setPropertyPhotoUrl] = useState<string | undefined>();

  // Update state when property changes
  useEffect(() => {
    if (property) {
      setTitle(property.title || "");
      setAddress(property.address || "");
      setCity(property.city || "");
      setStateProvince(property.state_province || "");
      setPostalCode(property.postal_code || "");
      setCountry(property.country || "");
      setDescription(property.description || "");
    }
  }, [property]);

  // Fetch signed URL for property photo
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

  const { archiveProperty } = usePropertyMutations();

  const updatePropertyMutation = useMutation({
    mutationFn: async (updates: { title: string; address: string; city: string; state_province: string; postal_code: string; country: string; description: string }) => {
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
      city,
      state_province: stateProvince,
      postal_code: postalCode,
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

  const tenantName = activeTenant?.profiles
    ? `${activeTenant.profiles.first_name || ""} ${activeTenant.profiles.last_name || ""}`.trim() ||
      activeTenant.profiles.email
    : t("properties.noTenant");

  const isArchived = property?.status === "inactive";

  return (
    <div className="space-y-6">
      {/* Free Property Alert - Start New Tenancy */}
      {userRole?.isManager && !activeTenant && property?.status === 'active' && (
        <Alert className="border-primary/50 bg-primary/5 animate-fade-in">
          <Plus className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">{t("properties.propertyIsFree")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm">{t("properties.inviteTenantToGetStarted")}</span>
            <Button
              size="sm"
              onClick={() => setShowTenancyWizard(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("tenancy.wizard.newTenancy") || "New Tenancy Setup"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("properties.propertyInformation")}</CardTitle>
              <CardDescription>{t("properties.editPropertyDescription")}</CardDescription>
            </div>
            {userRole?.isManager && !isEditing && !isArchived && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {userRole?.isManager ? (
                <PropertyPhotoUpload
                  propertyId={propertyId}
                  currentPhoto={propertyPhotoUrl}
                  onPhotoChange={() => {}}
                />
              ) : (
                propertyPhotoUrl && (
                  <div className="space-y-2">
                    <Label>{t("properties.photo")}</Label>
                    <img
                      src={propertyPhotoUrl}
                      alt={property?.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("properties.title")}</Label>
                {userRole?.isManager ? (
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isEditing}
                    required
                    className={cn(!title.trim() && isEditing && "border-destructive")}
                  />
                ) : (
                  <p className="text-sm py-2">{title}</p>
                )}
              </div>
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
                <div className="space-y-2">
                  <Label htmlFor="country">{t("properties.country")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={!isEditing}
                      placeholder={t("properties.countryPlaceholder")}
                    />
                  ) : (
                    <p className="text-sm py-2">{country || "-"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("properties.status")}</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={property?.status === "active" ? "default" : "secondary"}>
                    {property?.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("properties.currentTenant")}</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{tenantName}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="description">{t("properties.description")}</Label>
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
                  setCity(property?.city || "");
                  setStateProvince(property?.state_province || "");
                  setPostalCode(property?.postal_code || "");
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
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t("properties.archiveProperty")}</CardTitle>
            <CardDescription>{t("properties.archivePropertyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setShowArchiveDialog(true)}>
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
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("properties.archiveProperty")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tenancy Setup Wizard */}
      <CreateTenancyWizard
        open={showTenancyWizard}
        onOpenChange={setShowTenancyWizard}
        propertyId={propertyId}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
      />
    </div>
  );
}
