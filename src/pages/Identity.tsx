import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services";
import { AppLayout } from "@/components/layouts/AppLayout";
import { ShieldCheck } from "lucide-react";
import { IdentityVerification } from "@/components/IdentityVerification";

export default function Identity() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
      }
    };

    checkUser();
  }, [navigate]);

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Identity Verification
          </h1>
          <p className="text-muted-foreground mt-1">
            Verify your identity securely using our trusted verification partners
          </p>
        </div>

        <IdentityVerification />
      </div>
    </AppLayout>
  );
}
