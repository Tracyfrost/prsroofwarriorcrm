import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export type Qualification = {
  estimate_roof_sq?: number;
  estimate_cost?: number;
  first_check_funds?: number;
  variance?: number;
  status?: string;
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
      const { data, error } = await supabase
        .from("jobs")
        .update({ qualification } as any)
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
