import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserRoles {
  isAdmin: boolean;
  isManager: boolean;
  isLoading: boolean;
}

export function useUserRoles(userId: string | undefined): UserRoles {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const fetchRoles = async () => {
      const [adminResult, managerResult] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.from("properties").select("id").eq("manager_id", userId).limit(1),
      ]);

      if (mounted) {
        setIsAdmin(adminResult.data || false);
        setIsManager(managerResult.data && managerResult.data.length > 0);
        setIsLoading(false);
      }
    };

    fetchRoles();
    return () => { mounted = false; };
  }, [userId]);

  return { isAdmin, isManager, isLoading };
}
