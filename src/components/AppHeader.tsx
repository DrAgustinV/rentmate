import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { authService } from "@/services";
import { AnonymousHeader } from "@/components/AnonymousHeader";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";

export function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      const user = session ? await authService.getCurrentUser() : null;
      setUser(user);
    };

    checkSession();

    const subscription = authService.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.warn("Sign out failed (clearing local state):", err);
      authService.clearSession();
    }
    sessionStorage.removeItem("rentmate_active_role");
    setUser(null);
    navigate("/auth");
  };

  if (!user) {
    return <AnonymousHeader />;
  }

  return <AuthenticatedHeader user={user} onSignOut={handleSignOut} />;
}
