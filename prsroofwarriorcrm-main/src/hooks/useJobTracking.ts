import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JobTracking = {
  signed_date?: string | null;
  check_date?: string | null;
  install_date?: string | null;
  income?: number;
  expenses?: {
    material?: number;
    labor?: number;
    misc?: number;
    permits?: number;
    fees?: number;
    other?: number;
  };
  bonuses?: {
    lead?: number;
    contract?: number;
  };
  company_expenses?: {
    roofies?: number;
    self_gen_lead?: number;
    self_gen_contract?: number;
    prod_manager?: number;
    jobsite_supervisor?: number;
    other?: number;
  };
  vendor_id?: string | null;
  sub_id?: string | null;
  source?: string;
  notes?: string;
  office_fee_pct?: number;
  commission_level?: number;
  sales_share?: number;
  manager_share?: number;
  company_share?: number;
};

export function calcNetProfit(tracking: JobTracking): number {
  const income = tracking.income ?? 0;
  const material = tracking.expenses?.material ?? 0;
  const labor = tracking.expenses?.labor ?? 0;
  const misc = tracking.expenses?.misc ?? 0;
  const lead = tracking.bonuses?.lead ?? 0;
  const contract = tracking.bonuses?.contract ?? 0;
  return income - material - labor - misc - lead - contract;
}

export function calcTotalExpenses(tracking: JobTracking): number {
  const e = tracking.expenses ?? {};
  return (e.material ?? 0) + (e.labor ?? 0) + (e.misc ?? 0) + (e.permits ?? 0) + (e.fees ?? 0) + (e.other ?? 0);
}

export function calcTotalCompanyExpenses(tracking: JobTracking): number {
  const c = tracking.company_expenses ?? {};
  return (c.roofies ?? 0) + (c.self_gen_lead ?? 0) + (c.self_gen_contract ?? 0) + (c.prod_manager ?? 0) + (c.jobsite_supervisor ?? 0) + (c.other ?? 0);
}

export function calcGrossProfit(totalIncome: number, secureExpenses: number): number {
  return totalIncome - secureExpenses;
}

export function calcCommissionProfit(grossProfit: number, officeFeePct: number): number {
  const officeFee = grossProfit * (officeFeePct / 100);
  return grossProfit - officeFee;
}

export function calcTotalBonuses(tracking: JobTracking): number {
  return (tracking.bonuses?.lead ?? 0) + (tracking.bonuses?.contract ?? 0);
}

export function calcMarginPercent(tracking: JobTracking): number {
  const income = tracking.income ?? 0;
  if (income === 0) return 0;
  return (calcNetProfit(tracking) / income) * 100;
}

export function useUpdateJobTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tracking }: { id: string; tracking: JobTracking }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({ tracking } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", data.id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["main-jobs"] });
    },
  });
}
