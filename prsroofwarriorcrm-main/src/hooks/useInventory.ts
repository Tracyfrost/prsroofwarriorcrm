import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  unit: string;
  job_allocations: any;
  created_at: string;
  updated_at: string;
};

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { name: string; sku?: string; stock?: number; min_stock?: number; unit?: string }) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; stock?: number; name?: string; sku?: string; min_stock?: number; unit?: string }) => {
      const { data, error } = await supabase
        .from("inventory")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
