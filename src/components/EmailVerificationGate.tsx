import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { identityService, authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, LogOut, RefreshCw } from "lucide-react";
import { showToast } from "@/lib/toast";
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
  "/invitations",
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

  // Fetch verification status from profile
  const fetchVerificationStatus = useCallback(async (uid: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", uid)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setEmailVerified(false);
      } else {
        setEmailVerified(profile?.email_verified ?? false);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setEmailVerified(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session?.user) {
          // Not logged in - allow through (auth pages will handle)
          setEmailVerified(true);
          setLoading(false);
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");

        // Fetch verification status
        await fetchVerificationStatus(session.user.id);
      } catch (error) {
        console.error("Error checking session:", error);
        if (mounted) setEmailVerified(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === "SIGNED_OUT") {
        setEmailVerified(null);
        setUserId(null);
        setUserEmail("");
      } else if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
        
        // Defer profile fetch to avoid auth deadlock
        setTimeout(() => {
          if (mounted) {
            fetchVerificationStatus(session.user.id);
          }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchVerificationStatus]);

  useEffect(() => {
    if (loading || isPublicRoute || emailVerified !== false || !userId || verificationSent) return;

    let mounted = true;

    const sendInitialVerification = async () => {
      const sentKey = `verification_sent_${userId}`;
      if (sessionStorage.getItem(sentKey)) {
        if (mounted) setVerificationSent(true);
        return;
      }

      try {
        setSendingVerification(true);
        const data = await identityService.sendEmailVerification();
        
        if (!mounted) return;

        if (data?.already_verified) {
          setEmailVerified(true);
          return;
        }

        sessionStorage.setItem(sentKey, "true");
        setVerificationSent(true);
      } catch (error) {
        console.error("Error sending initial verification:", error);
      } finally {
        if (mounted) setSendingVerification(false);
      }
    };

    sendInitialVerification();
    return () => { mounted = false; };
  }, [emailVerified, userId, loading, verificationSent, isPublicRoute]);

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      const data = await identityService.sendEmailVerification();
      
      if (data?.rate_limited) {
        showToast.error({ title: data.error });
        return;
      }

      if (data?.already_verified) {
        setEmailVerified(true);
        showToast.success({ title: t("auth.emailAlreadyVerified") });
        return;
      }

      showToast.success({ title: t("auth.verificationEmailSent") });
    } catch (error: any) {
      console.error("Error resending verification:", error);
      showToast.error({ title: t("auth.verificationEmailFailed") });
    } finally {
      setSendingVerification(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Sign out error (clearing local state anyway):", error.message);
        authService.clearSession();
      }
    } catch (err) {
      console.warn("Sign out failed (clearing local state):", err);
      authService.clearSession();
    }
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
        showToast.success({ title: t("auth.emailVerified") });
      } else {
        showToast.info({ title: t("auth.emailNotYetVerified") });
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Public routes always allowed - no loading state needed
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading state OR verification status not yet determined
  if (loading || emailVerified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
