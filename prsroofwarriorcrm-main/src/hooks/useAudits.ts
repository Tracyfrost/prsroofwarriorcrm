import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAuditsByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["audits", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
