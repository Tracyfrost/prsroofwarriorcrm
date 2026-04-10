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

/** Multi-crew line assignment; stored as JSONB on job_production_items.crew_assigned */
export type CrewAssignment = { user_id: string; role: string };

/** PO / carrier / tracking; stored as JSONB on job_production_items.material_logistics */
export type MaterialLogistics = {
  po_number?: string;
  carrier?: string;
  tracking_url?: string;
  tracking_number?: string;
  notes?: string;
};

export type ProductionScopeMetadata = {
  /** Aligns with job qualification `shingle_type`; `shingle_style` kept for older rows */
  shingle_type?: string;
  shingle_manufacturer?: string;
  shingle_color?: string;
  shingle_style?: string;
  drip_edge_color?: string;
  pitch?: string;
  layers?: string;
  [key: string]: unknown;
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
  qualification_status: string;
  estimate_per_sq: number | null;
  pre_draw_amount: number | null;
  recoverable_depreciation: number | null;
  material_order_status: string;
  material_logistics: MaterialLogistics | unknown;
  delivery_date: string | null;
  drop_location: string | null;
  crew_assigned: CrewAssignment[] | unknown;
  sol_notes: string | null;
  scope_metadata: ProductionScopeMetadata | unknown;
  // Joined fields
  trade_types?: { name: string; unit_type: string } | null;
  jobs?: { job_id: string; customer_id: string; customers?: { name: string; main_address: any } | null } | null;
  profiles?: { name: string } | null;
};

export function parseCrewAssigned(raw: ProductionItem["crew_assigned"]): CrewAssignment[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as CrewAssignment[]).filter((c) => c && typeof c.user_id === "string");
}

export function parseScopeMetadata(raw: ProductionItem["scope_metadata"]): ProductionScopeMetadata {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as ProductionScopeMetadata;
  return {};
}

export function parseMaterialLogistics(raw: ProductionItem["material_logistics"]): MaterialLogistics {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as MaterialLogistics;
  return {};
}

function normalizeProductionRow(row: ProductionItem): ProductionItem {
  return {
    ...row,
    qualification_status: row.qualification_status ?? "Pending",
    material_order_status: row.material_order_status ?? "Not Ordered",
    material_logistics: row.material_logistics ?? {},
    crew_assigned: row.crew_assigned ?? [],
    scope_metadata: row.scope_metadata ?? {},
    drop_location: row.drop_location ?? "",
    sol_notes: row.sol_notes ?? "",
  };
}

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

export function useBulkUpdateTradeTypeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { id: string; sort_order: number }[]) => {
      for (const row of rows) {
        const { error } = await supabase
          .from("trade_types")
          .update({ sort_order: row.sort_order } as any)
          .eq("id", row.id);
        if (error) throw error;
      }
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
      return ((data ?? []) as ProductionItem[]).map(normalizeProductionRow);
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
      return ((data ?? []) as ProductionItem[]).map(normalizeProductionRow);
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
      return normalizeProductionRow(data as ProductionItem);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-items", data.job_id] });
      qc.invalidateQueries({ queryKey: ["all-production-items"] });
      qc.invalidateQueries({ queryKey: ["main-financials-production-lines"] });
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
      return normalizeProductionRow(data as ProductionItem);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-items", data.job_id] });
      qc.invalidateQueries({ queryKey: ["all-production-items"] });
      qc.invalidateQueries({ queryKey: ["main-financials-production-lines"] });
    },
  });
}

export function useDeleteProductionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("job_production_items")
        .delete()
        .eq("id", id)
        .select("job_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.job_id) {
        qc.invalidateQueries({ queryKey: ["production-items", data.job_id] });
      }
      qc.invalidateQueries({ queryKey: ["all-production-items"] });
      qc.invalidateQueries({ queryKey: ["main-financials-production-lines"] });
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
