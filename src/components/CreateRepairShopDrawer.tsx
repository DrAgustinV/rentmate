import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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

export function CreateRepairShopDrawer() {
  const [open, setOpen] = useState(false);
  const { createRepairShop, isCreating } = useRepairShops();
  const { t } = useLanguage();

  const form = useForm<RepairShopBase>({
    resolver: zodResolver(repairShopBaseSchema),
    defaultValues: {
      company_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postal_code: "",
      specializations: [],
      license_number: "",
      notes: "",
    },
  });

  const onSubmit = (data: RepairShopBase) => {
    createRepairShop(data as any, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('repairShops.addContact')}</span>
          <span className="sm:hidden">{t('common.create')}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t('repairShops.addContact')}</DrawerTitle>
          <DrawerDescription>
            {t('repairShops.addContactDesc')}
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="overflow-y-auto px-4 pb-4 max-h-[60vh]">
              <div className="space-y-4">
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
              </div>
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? t('common.loading') : t('common.save')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
