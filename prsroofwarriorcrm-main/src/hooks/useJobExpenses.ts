import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JobExpense = {
  id: string;
  job_id: string;
  expense_type_id: string;
  amount: number;
  expense_date: string;
  vendor_id: string | null;
  sub_id: string | null;
  ally_id: string | null;
  reference_number: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  expense_type?: { id: string; name: string; icon: string; allows_negative: boolean };
  vendor?: { id: string; name: string } | null;
  sub?: { id: string; name: string } | null;
  ally?: { id: string; name: string; type: string; ein: string | null } | null;
};

export function useJobExpenses(jobId: string) {
  return useQuery({
    queryKey: ["job_expenses", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_expenses")
        .select("*, expense_type:expense_types(*), vendor:vendors(id,name), sub:subs(id,name), ally:allies(id,name,type,ein)")
        .eq("job_id", jobId)
        .order("expense_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JobExpense[];
    },
  });
}

export function useCreateJobExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Partial<JobExpense>) => {
      const { data, error } = await (supabase as any)
        .from("job_expenses")
        .insert(expense)
        .select("*, expense_type:expense_types(*), vendor:vendors(id,name), sub:subs(id,name), ally:allies(id,name,type,ein)")
        .single();
      if (error) throw error;
      return data as JobExpense;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job_expenses", data.job_id] });
    },
  });
}

export function useUpdateJobExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id, ...updates }: Partial<JobExpense> & { id: string; job_id: string }) => {
      const { error } = await (supabase as any).from("job_expenses").update(updates).eq("id", id);
      if (error) throw error;
      return job_id;
    },
    onSuccess: (job_id) => {
      qc.invalidateQueries({ queryKey: ["job_expenses", job_id] });
    },
  });
}

export function useDeleteJobExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id }: { id: string; job_id: string }) => {
      const { error } = await (supabase as any).from("job_expenses").delete().eq("id", id);
      if (error) throw error;
      return job_id;
    },
    onSuccess: (job_id) => {
      qc.invalidateQueries({ queryKey: ["job_expenses", job_id] });
    },
  });
}

export function useAllJobExpenses() {
  return useQuery({
    queryKey: ["all_job_expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_expenses")
        .select("*, expense_type:expense_types(id,name,icon), vendor:vendors(id,name), sub:subs(id,name), ally:allies(id,name,type,ein)")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobExpense[];
    },
  });
}
