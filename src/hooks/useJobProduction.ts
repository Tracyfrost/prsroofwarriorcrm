import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobOrderingLine } from "@/lib/jobOrderingTemplate";

export type MilestoneHistory = {
  id: string;
  job_id: string;
  milestone_type: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
};

export type CheckEntry = {
  type: string;
  date_received: string;
  amount: number;
  notes: string;
};

/** Persisted on `jobs.qualification` JSONB — extended War Room fields plus legacy trigger keys. */
export type Qualification = {
  estimate_roof_sq?: number;
  estimate_cost?: number;
  first_check_funds?: number;
  variance?: number;
  status?: string;
  squares_pull_off?: number;
  squares_put_back?: number;
  price_per_sq?: number;
  scope_sq_all_structures?: string;
  scope_actual_sq?: string;
  shingle_type?: string;
  shingle_color?: string;
  drip_edge_color?: string;
  roof_pitch?: string;
  materials_drop_location?: string;
  material_delivery_date?: string;
  additional_comments?: string;
  /** Per draw type: include amount in estimated cost rollup */
  estimated_cost_draw_inclusions?: Record<string, boolean>;
  job_ordering_lines?: JobOrderingLine[];
  qualify_yes?: boolean;
  deductible?: number;
  estimate_line?: number;
  eagleview_fee?: number;
  /** Override for pre-draw; if unset, 10% of first_check_funds */
  pre_draw_amount_manual?: number;
  job_cost_misc?: number;
  rolled_roofing?: number;
  two_story_fee?: number;
  gutters?: number;
  patio?: number;
  interior?: number;
  supp_appr_fee?: number;
  recoverable_depreciation?: number;
  other_cost_projected?: number;
  installer_pay_total?: number;
};

export const MILESTONE_KEYS = [
  { key: "date_lead", label: "Lead Date" },
  { key: "date_inspection", label: "Inspection" },
  { key: "date_contract_signed", label: "Contract Signed" },
  { key: "date_adjuster_meeting", label: "Adjuster Meeting" },
  { key: "date_to_install", label: "Scheduled Install" },
  { key: "date_of_install", label: "Actual Install" },
  { key: "date_of_completion", label: "Completion" },
] as const;

export const CHECK_TYPES = ["ACV", "2nd_ACV", "Depreciation", "Final", "Other"] as const;

export function useMilestoneHistory(jobId?: string) {
  return useQuery({
    queryKey: ["milestone-history", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("milestone_history")
        .select("*")
        .eq("job_id", jobId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MilestoneHistory[];
    },
  });
}

export function useUpdateMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, milestones }: { id: string; milestones: Record<string, string | null> }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({ production_milestones: milestones } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", data.id] });
      qc.invalidateQueries({ queryKey: ["milestone-history", data.id] });
    },
  });
}

export function useUpdateChecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checks }: { id: string; checks: CheckEntry[] }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({ checks } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", data.id] });
    },
  });
}

export function useUpdateQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, qualification }: { id: string; qualification: Qualification }) => {
      const cached = qc.getQueryData<{ qualification?: unknown }>(["job", id]);
      const prevRaw = cached?.qualification;
      const prev =
        prevRaw && typeof prevRaw === "object" && !Array.isArray(prevRaw)
          ? (prevRaw as Record<string, unknown>)
          : {};
      const merged = { ...prev, ...(qualification as Record<string, unknown>) } as Qualification;
      const { data, error } = await supabase
        .from("jobs")
        .update({ qualification: merged } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", data.id] });
    },
  });
}

export type SquaresUpdate = {
  id: string;
  number_of_squares?: number;
  squares_estimated?: number | null;
  squares_actual_installed?: number | null;
  squares_final?: number | null;
};

export function useUpdateSquares() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SquaresUpdate) => {
      const { id, ...rest } = payload;
      const update: Record<string, unknown> = { ...rest };
      if (rest.squares_actual_installed !== undefined) {
        update.squares_actual_installed = rest.squares_actual_installed;
      }
      if (rest.squares_estimated !== undefined) {
        update.squares_estimated = rest.squares_estimated;
      }
      if (rest.squares_final !== undefined) {
        update.squares_final = rest.squares_final;
      }
      if (rest.number_of_squares !== undefined) {
        update.number_of_squares = rest.number_of_squares;
      }
      const { data, error } = await supabase
        .from("jobs")
        .update(update as any)
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
      qc.invalidateQueries({ queryKey: ["report-jobs"] });
    },
  });
}
