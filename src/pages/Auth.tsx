import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authService, profileService } from "@/services";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBrand } from "@/contexts/BrandContext";
import { useSearchParams } from "react-router-dom";
import { showToast, getAuthErrorMessage } from "@/lib/toastUtils";
import { Loader2, Mail, Building2, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [invitationContext, setInvitationContext] = useState<{ token: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'manager' | 'tenant' | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { brandName } = useBrand();
  const [searchParams] = useSearchParams();

  // Derive role from invitation context on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setSelectedRole('tenant');
    }
  }, [searchParams]);

  // Apply session role to profile after sign-in
  const applySessionRole = async (userId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const metadataRole = user?.user_metadata?.default_role as string | undefined;
      if (metadataRole === 'manager' || metadataRole === 'tenant') {
        await profileService.updateDefaultRole(userId, metadataRole);
      }
    } catch (_err: unknown) {
      // silent — role can be set on next login
    }
  };

  useEffect(() => {
    const checkAuthAndToken = async () => {
      const session = await authService.getSession();
      
      // Check for mode parameter
      const mode = searchParams.get('mode');
      const token = searchParams.get('token');
      
      if (mode) {
        setIsSignUp(mode === 'signup');
      }
      
      if (token) {
        sessionStorage.setItem('invitation_token', token);
        
        try {
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
            setSelectedRole('tenant');
          }
        } catch (error) {
          // Silent fail
        }
      }
      
      if (session) {
        navigate("/properties");
      }
    };
    
    checkAuthAndToken();

    const subscription = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Apply default_role to profile from user_metadata
        await applySessionRole(session.user.id);

        const storedToken = sessionStorage.getItem('invitation_token');
        if (storedToken) {
          navigate(`/invitations?token=${storedToken}`);
        } else {
          setTimeout(async () => {
            const { data: managedProps } = await supabase
              .from('properties')
              .select('id')
              .eq('manager_id', session.user.id)
              .limit(1);
            
            if (managedProps && managedProps.length > 0) {
              navigate("/properties");
            } else {
              const { data: tenancies } = await supabase
                .from('property_tenants')
                .select('id')
                .eq('tenant_id', session.user.id)
                .eq('tenancy_status', 'active')
                .limit(1);
              
              if (tenancies && tenancies.length > 0) {
                navigate("/rentals");
              } else {
                navigate("/properties");
              }
            }
          }, 0);
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const storedToken = sessionStorage.getItem('invitation_token');
      const redirectUrl = storedToken 
        ? `${window.location.origin}/invitations?token=${storedToken}`
        : `${window.location.origin}/properties`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });
      if (error) throw error;
    } catch (error: unknown) {
      showToast.error(t('auth.signInFailed'), getAuthErrorMessage(error));
      setLoading(false);
    }
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

      const redirectUrl = `${window.location.origin}/properties`;

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName,
              last_name: lastName,
              default_role: selectedRole,
            }
          }
        });

        if (error) {
          if (data?.user) {
            setConfirmationEmail(email);
            setShowConfirmation(true);
            return;
          }
          throw error;
        }
        
        if (data?.session) {
          showToast.success(t('auth.signUpSuccess'));
        } else {
          setConfirmationEmail(email);
          setShowConfirmation(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        showToast.success(t('auth.signInSuccess'));
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        showToast.error(t('common.validationError'), error.errors[0].message);
      } else {
        showToast.error(
          isSignUp ? t('auth.signUpFailed') : t('auth.signInFailed'),
          getAuthErrorMessage(error),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <AuthLayout title={t('auth.checkYourEmail')} description="">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {t('auth.verificationSentTo')}
            </p>
            <p className="font-medium text-foreground">{confirmationEmail}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p>{t('auth.checkInboxAndSpam')}</p>
            <p>{t('auth.linkExpiresIn24Hours')}</p>
          </div>
          <Button
            onClick={() => { setShowConfirmation(false); setIsSignUp(false); }}
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
                  ? t('auth.noAccountDetected')
                  : t('auth.accountDetected')}
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
        {isSignUp && !invitationContext && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('auth.roleSelectTitle') || 'I want to...'}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('manager')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                  selectedRole === 'manager'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <Building2 className={`h-6 w-6 ${selectedRole === 'manager' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${selectedRole === 'manager' ? 'text-primary' : 'text-foreground'}`}>
                  {t('auth.manageProperties') || 'Manage properties'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('auth.managePropertiesDesc') || 'List & rent out properties'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('tenant')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                  selectedRole === 'tenant'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <Home className={`h-6 w-6 ${selectedRole === 'tenant' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${selectedRole === 'tenant' ? 'text-primary' : 'text-foreground'}`}>
                  {t('auth.imATenant') || 'I\'m a tenant'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('auth.imATenantDesc') || 'Rent & manage my tenancy'}
                </span>
              </button>
            </div>
          </div>
        )}
        {isSignUp && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('auth.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('placeholders.firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('auth.lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('placeholders.lastName')}
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
            placeholder={t('placeholders.email')}
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
            placeholder={t('placeholders.password')}
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
            <Button
              type="button"
              variant="link"
              onClick={() => navigate('/reset-password')}
            >
              {t('auth.forgotPassword')}
            </Button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </Button>

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            {t('auth.orContinueWith')}
          </span>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('auth.continueWithGoogle')}
        </Button>

        <div className="text-center text-sm">
          <Button
            type="button"
            variant="link"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp
              ? t('auth.alreadyHaveAccount') + ' ' + t('auth.signInHere')
              : t('auth.noAccountYet') + ' ' + t('auth.signUpHere')}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
