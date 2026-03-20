import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExpenseType = {
  id: string;
  name: string;
  icon: string;
  allows_negative: boolean;
  sort_order: number;
  active: boolean;
  category: string;
  default_rate: number;
  default_unit: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseTypeUsage = {
  type_id: string;
  name: string;
  usage_count: number;
  avg_amount: number;
  total_amount: number;
};

export const EXPENSE_CATEGORIES = [
  "Inventory",
  "Payroll",
  "Miscellaneous",
  "Refund",
  "Permits",
  "Fees",
  "Materials",
  "Labor",
  "Company",
  "Bonus",
] as const;

// Categories that count as "Secure Expenses" (deducted from Gross Profit)
export const SECURE_CATEGORIES = ["Materials", "Labor", "Miscellaneous", "Permits", "Fees", "Inventory", "Payroll", "Refund"] as const;
// Categories for Company Expenses (post-commission tracking)
export const COMPANY_CATEGORIES = ["Company"] as const;
// Categories for Bonuses
export const BONUS_CATEGORIES = ["Bonus"] as const;

export const RATE_UNITS = [
  "flat",
  "/hr",
  "/sq",
  "/lf",
  "/ea",
  "/job",
] as const;

export function useExpenseTypes(activeOnly = true) {
  return useQuery({
    queryKey: ["expense_types", activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from("expense_types").select("*").order("sort_order");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ExpenseType[];
    },
  });
}

export function useExpenseTypeUsage() {
  return useQuery({
    queryKey: ["expense_type_usage"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expense_type_usage")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ExpenseTypeUsage[];
    },
  });
}

export function useCreateExpenseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (et: Partial<ExpenseType>) => {
      const { data, error } = await (supabase as any).from("expense_types").insert(et).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_types"] });
      qc.invalidateQueries({ queryKey: ["expense_type_usage"] });
    },
  });
}

export function useUpdateExpenseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpenseType> & { id: string }) => {
      const { error } = await (supabase as any).from("expense_types").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_types"] });
      qc.invalidateQueries({ queryKey: ["expense_type_usage"] });
    },
  });
}

export function useDeleteExpenseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("expense_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_types"] });
      qc.invalidateQueries({ queryKey: ["expense_type_usage"] });
    },
  });
}
