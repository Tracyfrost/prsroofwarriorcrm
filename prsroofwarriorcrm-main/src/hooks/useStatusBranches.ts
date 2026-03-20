import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatusBranch = {
  id: string;
  name: string;
  display_name: string;
  statuses: string[];
  parent_branch_id: string | null;
  branch_point_status: string | null;
  active: boolean;
};

export function useStatusBranches() {
  return useQuery({
    queryKey: ["status-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_branches")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as StatusBranch[];
    },
  });
}

export function useUpdateStatusBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StatusBranch> & { id: string }) => {
      const { error } = await supabase
        .from("status_branches")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status-branches"] }),
  });
}

export function useCreateStatusBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branch: Partial<StatusBranch>) => {
      const { data, error } = await supabase
        .from("status_branches")
        .insert(branch as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status-branches"] }),
  });
}

export function useDeleteStatusBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("status_branches")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status-branches"] }),
  });
}
