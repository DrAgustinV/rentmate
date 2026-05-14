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
import { getSignedUrl } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";

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
        try {
          const url = await getSignedUrl(STORAGE_BUCKETS.PROPERTY_PHOTOS, property.images[0], SIGNED_URL_TTL);
          setPropertyPhotoUrl(url);
        } catch (e) {
          // ignore
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
    ? `${activeTenant.profiles.first_name || ""} ${activeTenant.profiles.last_name || ""}`.trim() || activeTenant.profiles.email
    : activeTenant?.email || "—";

  const tenantEmail = activeTenant?.profiles?.email || activeTenant?.email || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("properties.overview")}</h2>
          <p className="text-muted-foreground">{t("properties.overviewDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchiveDialog(true)}>
            {t("properties.archive")}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            {t("properties.delete")}
          </Button>
          <Button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
            {isEditing ? t("common.save") : t("common.edit")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.propertyDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("properties.title")}</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("properties.titlePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t("properties.address")}</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("properties.addressPlaceholder")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t("properties.city")}</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t("properties.cityPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">{t("properties.state")}</Label>
                      <Input
                        id="state"
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        placeholder={t("properties.statePlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">{t("properties.postalCode")}</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder={t("properties.postalCodePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t("properties.country")}</Label>
                      <CountrySelect
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder={t("properties.countryPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("properties.description")}</Label>
                    <div className="flex gap-2">
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("properties.descriptionPlaceholder")}
                        className="flex-1 min-h-[100px]"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleGenerateDescription}
                        disabled={generatingDescription}
                        className="shrink-0"
                      >
                        {generatingDescription ? (
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <span className="text-lg">✨</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{t("properties.title")}</h3>
                    <p className="text-muted-foreground">{property?.title}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">{t("properties.address")}</h3>
                    <p className="text-muted-foreground">
                      {[address, city, stateProvince, postalCode, country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {description && (
                    <div>
                      <h3 className="font-medium">{t("properties.description")}</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("properties.tenantInfo")}</CardTitle>
            </CardHeader>
            <CardContent>
              {hasNoTenants ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>{t("properties.noTenant")}</p>
                  <Button variant="link" onClick={() => navigate(`/properties/${propertyId}/tenants`)}>
                    {t("properties.setupTenancy")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{t("properties.tenant")}</h3>
                    <p className="text-muted-foreground">{tenantName}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">{t("properties.email")}</h3>
                    <p className="text-muted-foreground">{tenantEmail}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.propertyPhoto")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/50">
                {propertyPhotoUrl ? (
                  <img
                    src={propertyPhotoUrl}
                    alt={property?.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="mt-4">
                <PropertyPhotoUpload propertyId={propertyId} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("properties.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/properties/${propertyId}/tenants`)}>
                {t("properties.manageTenants")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/properties/${propertyId}/contracts`)}>
                {t("properties.viewContracts")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/properties/${propertyId}/payments`)}>
                {t("properties.viewPayments")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/properties/${propertyId}/tickets`)}>
                {t("properties.viewTickets")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PropertyManagementDialogs
        showArchiveDialog={showArchiveDialog}
        setShowArchiveDialog={setShowArchiveDialog}
        archiveReason={archiveReason}
        setArchiveReason={setArchiveReason}
        archiveNotes={archiveNotes}
        setArchiveNotes={setArchiveNotes}
        onArchive={handleArchive}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        onDelete={handleDelete}
      />
    </div>
  );
}
