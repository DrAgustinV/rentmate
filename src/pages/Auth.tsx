import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBrand } from "@/contexts/BrandContext";
import { useSearchParams } from "react-router-dom";
import { showToast, getAuthErrorMessage } from "@/lib/toastUtils";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationContext, setInvitationContext] = useState<{ token: string; email: string } | null>(null);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { brandName } = useBrand();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkAuthAndToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check for mode parameter
      const mode = searchParams.get('mode');
      const token = searchParams.get('token');
      
      if (mode) {
        // Respect explicit mode parameter
        setIsSignUp(mode === 'signup');
      }
      
      if (token) {
        // Store token for later use
        sessionStorage.setItem('invitation_token', token);
        
        try {
          // Fetch invitation details
          const { data: invitation } = await supabase
            .from('invitations')
            .select('email, properties(title)')
            .eq('token', token)
            .eq('status', 'pending')
            .single();
          
          if (invitation) {
            setInvitationContext({
              token,
              email: invitation.email,
            });
            setEmail(invitation.email);
          }
        } catch (error) {
          console.log('Could not fetch invitation details:', error);
        }
      }
      
      if (session) {
        console.log('Already authenticated, redirecting to dashboard');
        navigate("/dashboard");
      }
    };
    
    checkAuthAndToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Clear confirmation pending state
        setEmailConfirmationPending(false);
        
        // Handle invitation token if present
        const storedToken = sessionStorage.getItem('invitation_token');
        if (storedToken) {
          console.log('Signed in with invitation token, redirecting to invitations');
          navigate(`/invitations?token=${storedToken}`);
        } else {
          console.log('Signed in, redirecting to dashboard');
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const getTitle = () => {
    if (invitationContext) {
      const detected = searchParams.get('detected') === 'true';
      if (detected) {
        return isSignUp 
          ? t('auth.noAccountDetected')
          : t('auth.accountDetected');
      }
      return isSignUp ? "Create Account to Accept Invitation" : "Sign In to Accept Invitation";
    }
    return isSignUp ? t('auth.createAccount') : t('auth.welcomeBack');
  };

  const getDescription = () => {
    if (invitationContext) {
      const detected = searchParams.get('detected') === 'true';
      if (detected) {
        return isSignUp
          ? t('auth.noAccountDetectedDesc')
          : t('auth.accountDetectedDesc');
      }
      return "Join your property and start managing your tenancy";
    }
    return isSignUp ? t('auth.getStarted') : t('auth.signInToContinue');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = authSchema.parse({
        email,
        password,
        firstName: isSignUp ? firstName : undefined,
        lastName: isSignUp ? lastName : undefined,
      });

      const redirectUrl = `${window.location.origin}/dashboard`;

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });

        if (error) throw error;
        
        // Check if email confirmation is required
        if (data?.user && !data.session) {
          // Email confirmation required
          setEmailConfirmationPending(true);
          setConfirmationEmail(email);
          showToast.success(t('auth.emailConfirmationSent'));
        } else {
          showToast.success(t('auth.signUpSuccess'));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Check if error is due to unconfirmed email
          if (error.message.includes('Email not confirmed')) {
            setEmailConfirmationPending(true);
            setConfirmationEmail(email);
            showToast.error(t('auth.cannotSignInUnconfirmed'));
            return;
          }
          throw error;
        }
        
        showToast.success(t('auth.signInSuccess'));
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showToast.error({
          title: t('common.validationError'),
          description: error.errors[0].message,
        });
      } else {
        showToast.error({
          title: isSignUp ? t('auth.signUpFailed') : t('auth.signInFailed'),
          description: getAuthErrorMessage(error),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmail,
      });

      if (error) throw error;
      
      showToast.success(t('auth.confirmationResent'));
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      showToast.error(error.message);
    } finally {
      setResendingConfirmation(false);
    }
  };

  if (emailConfirmationPending) {
    return (
      <AuthLayout
        title={t('auth.checkYourEmail')}
        description=""
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('auth.confirmationLinkSent')}
            </p>
            <p className="text-sm font-medium text-foreground">{confirmationEmail}</p>
            <p className="text-sm text-muted-foreground">
              {t('auth.clickToActivate')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleResendConfirmation}
            disabled={resendingConfirmation}
            className="w-full"
          >
            {resendingConfirmation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.resendConfirmation')
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setEmailConfirmationPending(false);
              setConfirmationEmail("");
            }}
            className="w-full"
          >
            {t('auth.backToSignIn')}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={getTitle()}
      description={getDescription()}
    >
      {invitationContext && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
          {searchParams.get('detected') === 'true' ? (
            <>
              <p className="text-sm text-foreground font-medium">
                {isSignUp 
                  ? "🎉 " + t('auth.noAccountDetected')
                  : "👋 " + t('auth.accountDetected')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isSignUp 
                  ? t('auth.settingUpAccount').replace('{email}', invitationContext.email)
                  : t('auth.signInToAccept').replace('{email}', invitationContext.email)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground">
                {isSignUp 
                  ? "Create a new account to accept your property invitation" 
                  : "Sign in with your existing account to accept the invitation"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isSignUp 
                  ? "Already have an account? Click 'Sign in here' below" 
                  : "Don't have an account? Click 'Create one' below"}
              </p>
            </>
          )}
        </div>
      )}
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('auth.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('auth.lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={!!invitationContext}
            className={invitationContext ? "bg-muted" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              {t('auth.passwordRequirements')}
            </p>
          )}
        </div>

        {!isSignUp && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="text-sm text-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </Button>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline"
          >
            {isSignUp ? t('auth.alreadyHaveAccount') + ' ' + t('auth.signInHere') : t('auth.noAccountYet') + ' ' + t('auth.signUpHere')}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}