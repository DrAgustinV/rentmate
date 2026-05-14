import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { identityService } from "@/services";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toastUtils";

type VerificationState = "loading" | "success" | "error" | "expired" | "no-token";

export default function VerifyEmail() {
  const [state, setState] = useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const token = searchParams.get("token");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setState("no-token");
        return;
      }

      try {
        const data = await identityService.verifyEmailToken({ token });

        if (data?.error) {
          if (data.code === "TOKEN_EXPIRED") {
            setState("expired");
            setErrorMessage(data.error);
          } else {
            setState("error");
            setErrorMessage(data.error);
          }
          return;
        }

        setState("success");
        
        // Redirect after short delay
        setTimeout(() => {
          navigate("/properties");
        }, 3000);
      } catch (error: any) {
        console.error("Verification error:", error);
        setState("error");
        setErrorMessage(error.message || t("auth.verificationFailed"));
      }
    };

    verifyToken();
  }, [token, navigate, t]);

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      const data = await identityService.sendEmailVerification();
      
      if (data?.rate_limited) {
        showToast.error(data.error);
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

  const handleGoToLogin = () => {
    navigate("/auth");
  };

  const handleGoToApp = () => {
    navigate("/properties");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {state === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("auth.verifyingEmail")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.pleaseWait")}
              </p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("auth.emailVerifiedTitle")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.emailVerifiedDesc")}
              </p>
            </div>
            <Button onClick={handleGoToApp} className="w-full">
              {t("auth.goToApp")}
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("auth.verificationFailed")}
              </h1>
              <p className="text-muted-foreground">
                {errorMessage || t("auth.invalidToken")}
              </p>
            </div>
            <div className="space-y-3">
              <Button onClick={handleGoToLogin} className="w-full">
                {t("auth.backToSignIn")}
              </Button>
            </div>
          </>
        )}

        {state === "expired" && (
          <>
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Mail className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("auth.linkExpired")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.linkExpiredDesc")}
              </p>
            </div>
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
                    {t("auth.requestNewLink")}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleGoToLogin} className="w-full">
                {t("auth.backToSignIn")}
              </Button>
            </div>
          </>
        )}

        {state === "no-token" && (
          <>
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("auth.noVerificationToken")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.noVerificationTokenDesc")}
              </p>
            </div>
            <Button onClick={handleGoToLogin} className="w-full">
              {t("auth.backToSignIn")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
