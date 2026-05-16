import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePendingInvitations(email: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!email) return;

    let mounted = true;

    const fetchCount = async () => {
      const { count: result } = await supabase
        .from("invitations")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .eq("status", "pending");

      if (mounted) {
        setCount(result || 0);
      }
    };

    fetchCount();
    return () => { mounted = false; };
  }, [email]);

  return count;
}
