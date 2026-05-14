import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authService, adminService } from "@/services";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  company_name: z.string().min(2, "Company name is required"),
  phone: z.string().optional(),
  properties_count: z.string().optional(),
  message: z.string().min(10, "Please provide more details (at least 10 characters)"),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface EnterpriseContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseContactForm({ open, onOpenChange }: EnterpriseContactFormProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      company_name: "",
      phone: "",
      properties_count: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const user = await authService.getCurrentUser();

      await adminService.createEnterpriseContactRequest({
        name: data.name,
        email: data.email,
        company_name: data.company_name,
        phone: data.phone || null,
        properties_count: data.properties_count ? parseInt(data.properties_count) : null,
        message: data.message,
        user_id: user?.id || null,
        status: "pending",
      });

      setIsSuccess(true);
      form.reset();
      
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 2000);

      toast.success("Thank you! We'll contact you within 24 hours.");
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to submit contact request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground">
              Thank you for your interest. Our sales team will contact you within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-2xl">Contact Enterprise Sales</DialogTitle>
              <DialogDescription>
                Tell us about your needs and our team will create a custom solution for you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder={t('placeholders.firstName') + ' ' + t('placeholders.lastName')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder={t('placeholders.email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  {...form.register("company_name")}
                  placeholder={t('placeholders.companyName')}
                />
                {form.formState.errors.company_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.company_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  placeholder={t('placeholders.phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="properties_count">Number of Properties</Label>
                <Input
                  id="properties_count"
                  type="number"
                  {...form.register("properties_count")}
                  placeholder={t('placeholders.propertiesCount')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  {...form.register("message")}
                  placeholder={t('placeholders.enterpriseMessage')}
                  rows={4}
                />
                {form.formState.errors.message && (
                  <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
