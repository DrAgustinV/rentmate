import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, profileService } from "@/services";
import { useQuery } from "@tanstack/react-query";

const SESSION_KEY = "rentmate_active_role";

interface RoleContextValue {
  activeRole: "manager" | "tenant";
  defaultRole: "manager" | "tenant";
  switchRole: (role: "manager" | "tenant", targetUrl?: string) => void;
  setActiveRoleSilently: (role: "manager" | "tenant") => void;
  hasSwitchedThisSession: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeRole, setActiveRole] = useState<"manager" | "tenant">("manager");
  const [hasSwitchedThisSession, setHasSwitchedThisSession] = useState(false);

  // Fetch current user
  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch defaultRole from profile
  const { data: defaultRole } = useQuery<"manager" | "tenant">({
    queryKey: ["default-role", userId],
    queryFn: async () => {
      if (!userId) return "manager";

      try {
        const profileRole = await profileService.getDefaultRole(userId);
        if (profileRole) return profileRole;
      } catch {
        // fall through
      }

      const [propResult, tenResult] = await Promise.all([
        supabase.from("properties").select("id").eq("manager_id", userId).limit(1),
        supabase.from("property_tenants").select("id").eq("tenant_id", userId).limit(1),
      ]);

      if (propResult.data && propResult.data.length > 0) return "manager";
      if (tenResult.data && tenResult.data.length > 0) return "tenant";
      return "manager";
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Resolve activeRole from sessionStorage or defaultRole
  useEffect(() => {
    if (defaultRole) {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored === "manager" || stored === "tenant") {
        setActiveRole(stored);
      } else {
        setActiveRole(defaultRole);
      }
    }
  }, [defaultRole]);

  const switchRole = useCallback((role: "manager" | "tenant", targetUrl?: string) => {
    setActiveRole(role);
    sessionStorage.setItem(SESSION_KEY, role);
    setHasSwitchedThisSession(true);
    navigate(targetUrl ?? (role === "manager" ? "/properties" : "/rentals"));
  }, [navigate]);

  const setActiveRoleSilently = useCallback((role: "manager" | "tenant") => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored !== role) {
      sessionStorage.setItem(SESSION_KEY, role);
    }
    setActiveRole(role);
  }, []);

  return (
    <RoleContext.Provider value={{
      activeRole,
      defaultRole: defaultRole ?? "manager",
      switchRole,
      setActiveRoleSilently,
      hasSwitchedThisSession,
    }}>
      <RoleThemeSetter />
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      activeRole: "manager",
      defaultRole: "manager",
      switchRole: () => {},
      setActiveRoleSilently: () => {},
      hasSwitchedThisSession: false,
    };
  }
  return ctx;
}

// Sets data-active-role attribute on root element for CSS differentiation
function RoleThemeSetter() {
  const { activeRole } = useRole();

  useEffect(() => {
    document.documentElement.setAttribute("data-active-role", activeRole);
  }, [activeRole]);

  return null;
}

// Deep link resolver: switches role silently based on path
export function RoleResolver({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { activeRole, setActiveRoleSilently } = useRole();

  useEffect(() => {
    const path = location.pathname;

    if (path === "/rentals" || path === "/rentals/") {
      if (activeRole !== "tenant") {
        setActiveRoleSilently("tenant");
      }
    } else if (path === "/properties" || path === "/properties/") {
      if (activeRole !== "manager") {
        setActiveRoleSilently("manager");
      }
    } else if (path.startsWith("/configuration")) {
      if (activeRole !== "manager") {
        setActiveRoleSilently("manager");
      }
    }
    // Shared routes (/properties/:id/*, /invitations, /account) — no auto-switch
  }, [location.pathname, activeRole, setActiveRoleSilently]);

  return <>{children}</>;
}
