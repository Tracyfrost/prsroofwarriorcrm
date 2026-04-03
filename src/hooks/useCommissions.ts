import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Phase 2: tie commission breakdown copy to job_production_items rollups if product needs line-level explanation.

export type Commission = Tables<"commissions"> & {
  jobs?: { job_id: string; customers?: { name: string } | null } | null;
  profiles?: { name: string } | null;
  override_amount?: number;
  base_rep_id?: string | null;
};

export function useCommissions(repId?: string) {
  return useQuery({
    queryKey: ["commissions", repId],
    queryFn: async () => {
      let q = supabase
        .from("commissions")
        .select("*, jobs(job_id, customers(name))")
        .order("created_at", { ascending: false });
      if (repId) q = q.eq("rep_id", repId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Commission[];
    },
  });
}

export function useCreateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comm: { rep_id: string; job_id: string; amount: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("commissions")
        .insert(comm)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}

export function useUpdateCommissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "earned" | "paid" }) => {
      const { error } = await supabase
        .from("commissions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}
