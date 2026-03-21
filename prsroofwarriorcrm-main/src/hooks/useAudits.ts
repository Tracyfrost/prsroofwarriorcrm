import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Audits where this user is the actor OR the subject of the event (timeline). */
export function useAuditsForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["audits-for-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .or(`user_id.eq.${userId},subject_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** @deprecated use useAuditsForUser — kept for any old imports */
export function useAuditsByUserId(userId: string | undefined) {
  return useAuditsForUser(userId);
}
