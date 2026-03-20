import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type SavedReportConfig = {
  groupBy?: "rep" | "status" | "month";
  metrics?: ("squares_installed" | "rcv" | "acv" | "job_count")[];
  date_from?: string | null;
  date_to?: string | null;
  statuses?: string[] | null;
};

export type SavedReport = {
  id: string;
  user_id: string;
  name: string;
  config_json: SavedReportConfig;
  created_at: string;
};

export function useSavedReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-reports", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedReport[];
    },
  });
}

export function useSaveReport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, config_json }: { name: string; config_json: SavedReportConfig }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("saved_reports")
        .insert({ user_id: user.id, name, config_json: config_json ?? {} } as any)
        .select()
        .single();
      if (error) throw error;
      return data as SavedReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-reports"] });
    },
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-reports"] });
    },
  });
}
