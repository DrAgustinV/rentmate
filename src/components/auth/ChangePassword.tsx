import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toastUtils";
import { Lock, Loader2 } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ChangePassword() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleChangePassword = async (data: PasswordFormData) => {
    setLoading(true);

    try {
      const user = await authService.getCurrentUser();
      
      if (!user?.email) {
        throw new Error("User not found");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (signInError) {
        showToast.error(t('auth.invalidCredentials'));
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) throw updateError;

      showToast.success(t('auth.passwordChanged'));
      
      form.reset();
    } catch (error: unknown) {
      console.error('Change password error:', error);
      showToast.error(t('auth.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {t('auth.changePassword')}
        </CardTitle>
        <CardDescription>
          Update your password for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleChangePassword)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.currentPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('placeholders.password')}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.newPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('placeholders.password')}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('placeholders.password')}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.changePassword')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ChangePassword;
