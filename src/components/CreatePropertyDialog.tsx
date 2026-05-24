import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { supabase } from "@/integrations/supabase/client";
import { authService, documentService } from "@/services";
import { STORAGE_BUCKETS, FILE_SIZE_LIMITS } from "@/constants";
import { usePropertyMutations } from "@/hooks/useProperties";
import { useSubscription } from "@/hooks/useSubscription";
import { z } from "zod";
import { Loader2, Upload, X, Image as ImageIcon, AlertCircle, Crown } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { getUserCountryFromTimezone } from "@/lib/countryUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (propertyId: string) => void;
}

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  address: z.string().trim().min(1, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  stateProvince: z.string().trim().max(100).optional().default(""),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
  description: z.string().trim().max(1000).optional().default(""),
});

export function CreatePropertyDialog({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [limitLoading, setLimitLoading] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const { trackEvent } = useAnalyticsContext();
  const { createProperty } = usePropertyMutations();
  const { t } = useLanguage();
  const { getPropertyLimit, isFree, isPro } = useSubscription();
  const propertyLimit = getPropertyLimit();
  const atLimit = propertyCount !== null && propertyCount >= propertyLimit;
  const nearLimit = propertyCount !== null && propertyCount === propertyLimit - 1;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", address: "", city: "", stateProvince: "", postalCode: "", country: "", description: "" },
  });

  useEffect(() => {
    if (!open) {
      setPropertyCount(null);
      setPhotoFile(null);
      form.reset();
      return;
    }

    const detected = getUserCountryFromTimezone();
    if (detected) form.setValue("country", detected);

    const fetchPropertyCount = async () => {
      setLimitLoading(true);
      try {
        const user = await authService.getCurrentUser();
        if (!user) return;

        const { count } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('manager_id', user.id)
          .eq('status', 'active');

        setPropertyCount(count ?? 0);
      } catch {
        setPropertyCount(0);
      } finally {
        setLimitLoading(false);
      }
    };

    fetchPropertyCount();
  }, [open, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', user.id)
      .eq('status', 'active');

    if (count && count >= propertyLimit) {
      const planName = isFree ? 'Free' : isPro ? 'Pro' : 'your current';
      toast.error(`You have reached the maximum limit of ${propertyLimit} active ${propertyLimit === 1 ? 'property' : 'properties'} on the ${planName} plan. Please upgrade to add more properties.`);
      return;
    }

    createProperty.mutate({
      title: values.title,
      address: values.address,
      city: values.city,
      state_province: values.stateProvince,
      postal_code: values.postalCode,
      country: values.country,
      description: values.description || null,
      images: [],
      manager_id: user.id,
    }, {
      onSuccess: async (newProperty) => {
        if (photoFile && newProperty?.id) {
          try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${newProperty.id}/profile.${fileExt}`;

            await documentService.uploadFile(STORAGE_BUCKETS.PROPERTY_PHOTOS, fileName, photoFile, { upsert: true });
            await supabase
              .from('properties')
              .update({ images: [fileName] })
              .eq('id', newProperty.id);
          } catch (photoError) {
            console.error('Photo upload error:', photoError);
          }
        }

        trackEvent({
          eventName: 'property_created',
          category: 'property_management',
          metadata: {
            property_id: newProperty.id,
            has_photo: !!photoFile,
          },
        });

        setPhotoFile(null);
        form.reset();
        onSuccess(newProperty.id);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Property</DialogTitle>
        </DialogHeader>

        {limitLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking account limits...
          </div>
        ) : atLimit ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Property limit reached</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>You have reached the maximum of {propertyLimit} active {propertyLimit === 1 ? 'property' : 'properties'} on your current plan.</p>
              <Button
                type="button"
                size="sm"
                onClick={() => window.location.href = "/account?tab=subscription"}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to create more
              </Button>
            </AlertDescription>
          </Alert>
        ) : nearLimit ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Almost at limit</AlertTitle>
            <AlertDescription>
              You have {propertyLimit - propertyCount} slot{propertyLimit - propertyCount === 1 ? '' : 's'} remaining out of {propertyLimit}. Consider upgrading to avoid interruptions.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Property Photo</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {photoFile ? (
                    <div className="relative">
                      <img 
                        src={URL.createObjectURL(photoFile)} 
                        alt="Property preview" 
                        className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                        onClick={() => setPhotoFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form.formState.isSubmitting}
                    onClick={() => document.getElementById('create-photo-upload')?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum 5MB. JPG, PNG, or WEBP
                  </p>
                </div>
                
                <input
                  id="create-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        toast.error(t("properties.uploadImageFile"));
                        return;
                      }
                      if (file.size > FILE_SIZE_LIMITS.PROPERTY_PHOTO) {
                        toast.error(t("properties.imageTooLarge"));
                        return;
                      }
                      setPhotoFile(file);
                    }
                  }}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Title *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.propertyTitle')} maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.propertyAddress')} maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholders.city')} maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stateProvince"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholders.stateProvince')} maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholders.postalCode')} maxLength={20} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <CountrySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('placeholders.selectCountry')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('placeholders.propertyDescription')}
                      rows={4}
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground text-right">
                    {field.value?.length ?? 0}/500 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || atLimit}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? "Creating..." : atLimit ? "Limit Reached" : "Create Property"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
