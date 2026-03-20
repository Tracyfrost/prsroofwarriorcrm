import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Sub = {
  id: string;
  name: string;
  specialty: string;
  rate: number;
  contact_info: any;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function useSubs(activeOnly = true) {
  return useQuery({
    queryKey: ["subs", activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from("subs").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });
}

export function useCreateSub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: Partial<Sub>) => {
      const { data, error } = await (supabase as any)
        .from("subs")
        .insert(sub)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subs"] });
    },
  });
}

export function useUpdateSub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sub> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("subs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subs"] });
    },
  });
}

export function useDeleteSub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("subs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subs"] });
    },
  });
}
