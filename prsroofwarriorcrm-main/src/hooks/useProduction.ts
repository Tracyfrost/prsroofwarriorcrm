import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type TradeType = {
  id: string;
  name: string;
  unit_type: string;
  default_labor_cost_per_unit: number;
  default_material_cost_per_unit: number;
  active: boolean;
  sort_order: number;
};

export type ProductionItem = {
  id: string;
  job_id: string;
  trade_type_id: string;
  scope_description: string;
  quantity: number;
  unit_type: string;
  labor_cost: number;
  material_cost: number;
  labor_vendor: string;
  material_vendor: string;
  status: string;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  completed_date: string | null;
  assigned_to_user_id: string | null;
  dependencies: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  trade_types?: { name: string; unit_type: string } | null;
  jobs?: { job_id: string; customer_id: string; customers?: { name: string; main_address: any } | null } | null;
  profiles?: { name: string } | null;
};

export function useTradeTypes() {
  return useQuery({
    queryKey: ["trade-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_types")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TradeType[];
    },
  });
}

export function useAllTradeTypes() {
  return useQuery({
    queryKey: ["trade-types-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TradeType[];
    },
  });
}

export function useCreateTradeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tt: Partial<TradeType>) => {
      const { data, error } = await supabase
        .from("trade_types")
        .insert(tt as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-types"] });
      qc.invalidateQueries({ queryKey: ["trade-types-all"] });
    },
  });
}

export function useUpdateTradeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TradeType> & { id: string }) => {
      const { error } = await supabase
        .from("trade_types")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-types"] });
      qc.invalidateQueries({ queryKey: ["trade-types-all"] });
    },
  });
}

export function useProductionItems(jobId?: string) {
  return useQuery({
    queryKey: ["production-items", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_production_items")
        .select("*, trade_types(name, unit_type)")
        .eq("job_id", jobId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ProductionItem[];
    },
  });
}

export function useAllProductionItems() {
  return useQuery({
    queryKey: ["all-production-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_production_items")
        .select("*, trade_types(name, unit_type), jobs(job_id, customer_id, status, customers(name, main_address))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionItem[];
    },
  });
}

export function useCreateProductionItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Partial<ProductionItem>) => {
      const { data, error } = await supabase
        .from("job_production_items")
        .insert({ ...item, created_by: user?.id } as any)
        .select("*, trade_types(name, unit_type)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-items", data.job_id] });
      qc.invalidateQueries({ queryKey: ["all-production-items"] });
    },
  });
}

export function useUpdateProductionItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("job_production_items")
        .update({ ...updates, updated_by: user?.id } as any)
        .eq("id", id)
        .select("*, trade_types(name, unit_type)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-items", data.job_id] });
      qc.invalidateQueries({ queryKey: ["all-production-items"] });
    },
  });
}

export function useProductionHistory(itemId?: string) {
  return useQuery({
    queryKey: ["production-history", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_status_history")
        .select("*")
        .eq("production_item_id", itemId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Legacy constants kept for backward compatibility - prefer useProductionItemStatuses hook
export const PRODUCTION_STATUSES = [
  "draft", "ready", "scheduled", "in_progress", "on_hold", "complete", "billed"
] as const;

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  on_hold: "On Hold",
  complete: "Complete",
  billed: "Billed",
};

export const PRODUCTION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-accent/20 text-accent-foreground",
  scheduled: "bg-primary/20 text-primary-foreground",
  in_progress: "bg-warning/20 text-warning-foreground",
  on_hold: "bg-destructive/20 text-destructive-foreground",
  complete: "bg-success/20 text-success-foreground",
  billed: "bg-muted text-foreground",
};

export function useDeleteTradeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trade_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-types"] });
      qc.invalidateQueries({ queryKey: ["trade-types-all"] });
    },
  });
}
