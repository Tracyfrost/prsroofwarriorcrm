import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDirectReportsCount(managerProfileId: string | undefined) {
  return useQuery({
    queryKey: ["direct-reports-count", managerProfileId],
    enabled: !!managerProfileId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", managerProfileId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
