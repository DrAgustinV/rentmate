import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { repairShopBaseSchema, type RepairShopBase } from "@/lib/validations/repair-shop.schema";
import { useRepairShops } from "@/hooks/useRepairShops";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Database } from "@/integrations/supabase/types";

type RepairShop = Database["public"]["Tables"]["repair_shops"]["Row"];

const SPECIALIZATIONS = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Carpentry",
  "Painting",
  "General Maintenance",
  "Locksmith",
  "Pest Control",
  "Landscaping",
  "Cleaning",
  "Other",
];

interface EditRepairShopDrawerProps {
  repairShop: RepairShop;
}

export function EditRepairShopDrawer({ repairShop }: EditRepairShopDrawerProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { updateRepairShop, deleteRepairShop, isUpdating, isDeleting } = useRepairShops();
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(repairShop.is_active);

  const form = useForm<RepairShopBase>({
    resolver: zodResolver(repairShopBaseSchema),
    defaultValues: {
      company_name: repairShop.company_name,
      contact_person: repairShop.contact_person || "",
      email: repairShop.email || "",
      phone: repairShop.phone,
      address: repairShop.address || "",
      city: repairShop.city || "",
      postal_code: repairShop.postal_code || "",
      specializations: repairShop.specializations || [],
      license_number: repairShop.license_number || "",
      notes: repairShop.notes || "",
    },
  });

  useEffect(() => {
    setIsActive(repairShop.is_active);
  }, [repairShop.is_active]);

  const onSubmit = (data: RepairShopBase) => {
    updateRepairShop(
      {
        id: repairShop.id,
        updates: { ...data, is_active: isActive },
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteRepairShop(repairShop.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setOpen(false);
      },
    });
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t('repairShops.editContact')}</DrawerTitle>
            <DrawerDescription>
              {t('repairShops.editContactDesc')}
            </DrawerDescription>
          </DrawerHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="overflow-y-auto px-4 pb-4 max-h-[55vh]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('repairShops.activeStatus')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {isActive ? t('repairShops.active') : t('repairShops.inactive')}
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('repairShops.companyName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('repairShops.contactPerson')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('repairShops.phone')} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('repairShops.email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('repairShops.address')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('repairShops.city')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('repairShops.postalCode')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="specializations"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t('repairShops.specializations')}</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {SPECIALIZATIONS.map((spec) => (
                            <FormField
                              key={spec}
                              control={form.control}
                              name="specializations"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(spec)}
                                      onCheckedChange={(checked) => {
                                        const updated = checked
                                          ? [...(field.value || []), spec]
                                          : field.value?.filter((v) => v !== spec) || [];
                                        field.onChange(updated);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {spec}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('repairShops.licenseNumber')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('repairShops.notes')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('repairShops.deleteContact')}
                    </Button>
                  </div>
                </div>
              </div>
              <DrawerFooter>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? t('common.loading') : t('common.save')}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">{t('common.cancel')}</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </Form>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('repairShops.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('repairShops.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
