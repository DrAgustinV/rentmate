import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, LogOut, RefreshCw } from "lucide-react";
import { showToast } from "@/lib/toastUtils";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmailVerificationGateProps {
  children: React.ReactNode;
}

// Routes that don't require email verification
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/auth",
  "/reset-password",
  "/verify-email",
  "/about",
  "/terms",
  "/privacy",
  "/help",
  "/cookie-policy",
  "/data-processing-agreement",
  "/privacy-rights",
];

export function EmailVerificationGate({ children }: EmailVerificationGateProps) {
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + "/")
  );

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Not logged in - let it pass through (auth will handle redirect)
          setLoading(false);
          setEmailVerified(true); // Allow through, auth pages will handle
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");

        // Check profile for email_verified status
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          // If profile doesn't exist yet, assume not verified
          setEmailVerified(false);
        } else {
          setEmailVerified(profile?.email_verified ?? false);
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        setEmailVerified(false);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setEmailVerified(null);
        setUserId(null);
        setUserEmail("");
      } else if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
        
        // Re-check verification status
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("id", session.user.id)
          .single();
          
        setEmailVerified(profile?.email_verified ?? false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-send verification email on first load if not verified
  useEffect(() => {
    const sendInitialVerification = async () => {
      if (emailVerified === false && userId && !verificationSent && !isPublicRoute) {
        // Check if we've already sent in this session
        const sentKey = `verification_sent_${userId}`;
        if (sessionStorage.getItem(sentKey)) {
          setVerificationSent(true);
          return;
        }

        try {
          setSendingVerification(true);
          const { data, error } = await supabase.functions.invoke("send-email-verification");
          
          if (error) throw error;
          
          if (data?.already_verified) {
            setEmailVerified(true);
            return;
          }

          sessionStorage.setItem(sentKey, "true");
          setVerificationSent(true);
        } catch (error) {
          console.error("Error sending initial verification:", error);
        } finally {
          setSendingVerification(false);
        }
      }
    };

    if (!loading) {
      sendInitialVerification();
    }
  }, [emailVerified, userId, loading, verificationSent, isPublicRoute]);

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-verification");
      
      if (error) throw error;
      
      if (data?.rate_limited) {
        showToast.error(data.error);
        return;
      }

      if (data?.already_verified) {
        setEmailVerified(true);
        showToast.success(t("auth.emailAlreadyVerified"));
        return;
      }

      showToast.success(t("auth.verificationEmailSent"));
    } catch (error: any) {
      console.error("Error resending verification:", error);
      showToast.error(t("auth.verificationEmailFailed"));
    } finally {
      setSendingVerification(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefreshStatus = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", userId)
        .single();
        
      if (profile?.email_verified) {
        setEmailVerified(true);
        showToast.success(t("auth.emailVerified"));
      } else {
        showToast.info(t("auth.emailNotYetVerified"));
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Public routes always allowed
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Verified users can proceed
  if (emailVerified === true) {
    return <>{children}</>;
  }

  // Not verified - show gate
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("auth.verifyYourEmail")}
          </h1>
          <p className="text-muted-foreground">
            {t("auth.verificationSentTo")}
          </p>
          <p className="font-medium text-foreground">{userEmail}</p>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p>{t("auth.checkInboxAndSpam")}</p>
          <p>{t("auth.linkExpiresIn24Hours")}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleResendVerification}
            disabled={sendingVerification}
            className="w-full"
          >
            {sendingVerification ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {t("auth.resendVerificationEmail")}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleRefreshStatus}
            disabled={loading}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("auth.iVerifiedCheckNow")}
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("auth.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
