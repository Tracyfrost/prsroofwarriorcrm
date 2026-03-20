import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Vendor = {
  id: string;
  name: string;
  type: string;
  contact_info: any;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function useVendors(activeOnly = true) {
  return useQuery({
    queryKey: ["vendors", activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from("vendors").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Vendor[];
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: Partial<Vendor>) => {
      const { data, error } = await (supabase as any)
        .from("vendors")
        .insert(vendor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("vendors")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("vendors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
