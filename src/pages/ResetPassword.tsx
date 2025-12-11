import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toastUtils";
import { Loader2, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
});

const passwordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(3);

  useEffect(() => {
    // Check if user came from password reset email (has recovery token)
    const checkRecoveryMode = async () => {
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      
      if (type === 'recovery' && accessToken) {
        // User clicked reset link in email
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: searchParams.get('refresh_token') || '',
        });
        
        if (error) {
          showToast.error(t('auth.invalidResetToken'));
          navigate('/auth');
        } else {
          setMode("reset");
        }
      }
    };

    checkRecoveryMode();
  }, [searchParams, navigate, t]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (rateLimitRemaining <= 0) {
      showToast.error(t('auth.rateLimitExceeded'));
      return;
    }

    try {
      emailSchema.parse({ email });
    } catch (error: any) {
      showToast.error(error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Call our custom edge function instead of Supabase's built-in method
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email, language },
      });

      if (error) throw error;

      setEmailSent(true);
      setRateLimitRemaining(prev => prev - 1);
      showToast.success(t('auth.resetLinkSent'));
    } catch (error: any) {
      console.error('Reset password error:', error);
      // Don't reveal if email exists for security - still show success
      setEmailSent(true);
      showToast.success(t('auth.resetLinkSent'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (error: any) {
      showToast.error(error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      showToast.success(t('auth.passwordResetSuccess'));
      
      // Wait a moment then redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Set new password error:', error);
      
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        showToast.error(t('auth.resetTokenExpired'));
        navigate('/auth');
      } else {
        showToast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === "reset") {
    return (
      <AuthLayout
        title={t('auth.setNewPassword')}
        description={t('auth.resetPasswordDesc')}
      >
        <form onSubmit={handleSetNewPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.newPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder={t('placeholders.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('placeholders.password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.resetPassword')
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.resetPasswordTitle')}
      description={t('auth.resetPasswordDesc')}
    >
      {emailSent ? (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">{t('auth.checkYourEmail')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('auth.checkEmailForReset')}
            </p>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            {t('auth.backToSignIn')}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
          {rateLimitRemaining < 3 && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                {t('auth.requestsRemaining')}: {rateLimitRemaining}/3
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || rateLimitRemaining <= 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.sendResetLink')
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            {t('auth.backToSignIn')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
