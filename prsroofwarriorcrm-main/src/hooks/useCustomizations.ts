import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeadSource = {
  id: string;
  name: string;
  display_name: string;
  active: boolean;
  sort_order: number;
  color: string;
  requires_pool: boolean;
  default_cost_per_lead: number;
};

export type JobStatus = {
  id: string;
  name: string;
  display_name: string;
  sequence: number;
  color: string;
  active: boolean;
};

// ── Lead Sources ──

export function useLeadSources(activeOnly = false) {
  return useQuery({
    queryKey: ["lead-sources", activeOnly],
    queryFn: async () => {
      let q = supabase.from("lead_sources").select("*").order("sort_order");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LeadSource[];
    },
  });
}

export function useCreateLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ls: Partial<LeadSource>) => {
      const { data, error } = await supabase
        .from("lead_sources")
        .insert(ls as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-sources"] }),
  });
}

export function useUpdateLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadSource> & { id: string }) => {
      const { error } = await supabase
        .from("lead_sources")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-sources"] }),
  });
}

export function useDeleteLeadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-sources"] }),
  });
}

export function useBulkUpdateLeadSourceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sources: { id: string; sort_order: number }[]) => {
      for (const s of sources) {
        const { error } = await supabase
          .from("lead_sources")
          .update({ sort_order: s.sort_order } as any)
          .eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-sources"] });
      qc.invalidateQueries({ queryKey: ["lead_sources"] });
    },
  });
}

// ── Job Statuses ──

export function useJobStatuses(activeOnly = false) {
  return useQuery({
    queryKey: ["job-statuses", activeOnly],
    queryFn: async () => {
      let q = supabase.from("job_statuses").select("*").order("sequence");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as JobStatus[];
    },
  });
}

export function useCreateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (js: Partial<JobStatus>) => {
      const { data, error } = await supabase
        .from("job_statuses")
        .insert(js as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-statuses"] }),
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobStatus> & { id: string }) => {
      const { error } = await supabase
        .from("job_statuses")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-statuses"] }),
  });
}

export function useDeleteJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-statuses"] }),
  });
}

export function useBulkUpdateJobStatusOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (statuses: { id: string; sequence: number }[]) => {
      // Update each status sequence
      for (const s of statuses) {
        const { error } = await supabase
          .from("job_statuses")
          .update({ sequence: s.sequence } as any)
          .eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-statuses"] }),
  });
}

// ── Usage counts for delete warnings ──

export function useLeadSourceUsageCount(name: string) {
  return useQuery({
    queryKey: ["lead-source-usage", name],
    enabled: !!name,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("lead_source", name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useJobStatusUsageCount(name: string) {
  return useQuery({
    queryKey: ["job-status-usage", name],
    enabled: !!name,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// ── Production Milestones ──

export type ProductionMilestone = {
  id: string;
  name: string;
  display_name: string;
  sequence: number;
  active: boolean;
};

export function useProductionMilestones(activeOnly = false) {
  return useQuery({
    queryKey: ["production-milestones", activeOnly],
    queryFn: async () => {
      let q = supabase.from("production_milestones").select("*").order("sequence");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionMilestone[];
    },
  });
}

export function useCreateProductionMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<ProductionMilestone>) => {
      const { data, error } = await supabase
        .from("production_milestones")
        .insert(m as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-milestones"] }),
  });
}

export function useUpdateProductionMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionMilestone> & { id: string }) => {
      const { error } = await supabase
        .from("production_milestones")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-milestones"] }),
  });
}

export function useDeleteProductionMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-milestones"] }),
  });
}

export function useBulkUpdateMilestoneOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestones: { id: string; sequence: number }[]) => {
      for (const m of milestones) {
        const { error } = await supabase
          .from("production_milestones")
          .update({ sequence: m.sequence } as any)
          .eq("id", m.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-milestones"] }),
  });
}

// ── Production Item Statuses ──

export type ProductionItemStatus = {
  id: string;
  name: string;
  display_name: string;
  sequence: number;
  color: string;
  active: boolean;
};

export function useProductionItemStatuses(activeOnly = false) {
  return useQuery({
    queryKey: ["production-item-statuses", activeOnly],
    queryFn: async () => {
      let q = supabase.from("production_item_statuses").select("*").order("sequence");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionItemStatus[];
    },
  });
}

export function useCreateProductionItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<ProductionItemStatus>) => {
      const { data, error } = await supabase
        .from("production_item_statuses")
        .insert(s as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-item-statuses"] }),
  });
}

export function useUpdateProductionItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionItemStatus> & { id: string }) => {
      const { error } = await supabase
        .from("production_item_statuses")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-item-statuses"] }),
  });
}

export function useDeleteProductionItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_item_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-item-statuses"] }),
  });
}

export function useBulkUpdateProductionItemStatusOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (statuses: { id: string; sequence: number }[]) => {
      for (const s of statuses) {
        const { error } = await supabase
          .from("production_item_statuses")
          .update({ sequence: s.sequence } as any)
          .eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production-item-statuses"] }),
  });
}

// ── Global Settings ──

export type GlobalSetting = {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
};

export function useGlobalSettings() {
  return useQuery({
    queryKey: ["global-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_settings")
        .select("*")
        .order("category")
        .order("key");
      if (error) throw error;
      return (data ?? []) as GlobalSetting[];
    },
  });
}

export function useUpdateGlobalSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: any }) => {
      const { error } = await supabase
        .from("global_settings")
        .update({ value } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-settings"] }),
  });
}
