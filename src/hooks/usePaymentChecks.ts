import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PaymentCheck = Tables<"payment_checks">;
export type CheckHistory = Tables<"check_history">;

export const CHECK_TYPES = ["ACV", "2nd_ACV", "Depreciation", "Final", "Supplement", "Other"] as const;
export const CHECK_STATUSES = ["Pending", "Received", "Deposited", "Disputed"] as const;

export function usePaymentChecks(jobId?: string) {
  return useQuery({
    queryKey: ["payment-checks", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_checks")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PaymentCheck[];
    },
  });
}

export function useCreatePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (check: TablesInsert<"payment_checks">) => {
      const { data, error } = await supabase
        .from("payment_checks")
        .insert(check)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.job_id] });
    },
  });
}

export function useUpdatePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId, ...updates }: { id: string; jobId: string } & Partial<PaymentCheck>) => {
      const { data, error } = await supabase
        .from("payment_checks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.jobId] });
    },
  });
}

export function useDeletePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase
        .from("payment_checks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.jobId] });
    },
  });
}

export function useCheckHistory(checkId?: string) {
  return useQuery({
    queryKey: ["check-history", checkId],
    enabled: !!checkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_history")
        .select("*")
        .eq("check_id", checkId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as CheckHistory[];
    },
  });
}
