import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AllyPhone = { type: "mobile" | "office"; number: string };
export type AllyEmail = { type: string; address: string };
export type AllyAddress = { street: string; city: string; state: string; zip: string };
export type AllyContactInfo = { phones: AllyPhone[]; emails: AllyEmail[]; address?: AllyAddress };

export type Ally = {
  id: string;
  name: string;
  type: "Vendor" | "Sub";
  ein: string | null;
  contact_info: AllyContactInfo;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export function useAllies(activeOnly = true) {
  return useQuery({
    queryKey: ["allies", activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from("allies").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Ally[];
    },
  });
}

export function useSearchAllies(search: string) {
  return useQuery({
    queryKey: ["allies_search", search],
    enabled: search.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("allies")
        .select("*")
        .eq("active", true)
        .or(`name.ilike.%${search}%,ein.ilike.%${search}%`)
        .order("name")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Ally[];
    },
  });
}

export function useCreateAlly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ally: Partial<Ally>) => {
      const { data, error } = await (supabase as any)
        .from("allies")
        .insert(ally)
        .select()
        .single();
      if (error) throw error;
      return data as Ally;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allies"] });
    },
  });
}

export function useUpdateAlly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ally> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("allies")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allies"] });
    },
  });
}

export function useDeleteAlly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("allies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allies"] });
    },
  });
}
