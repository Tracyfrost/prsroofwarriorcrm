import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Draw = {
  id: string;
  job_id: string;
  type: "Contract Signed" | "ACV/First Check" | "ADV on Commission";
  amount: number;
  draw_date: string;
  notes: string;
  deducted_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const DRAW_TYPES = ["Contract Signed", "ACV/First Check", "ADV on Commission"] as const;

export function useDraws(jobId?: string) {
  return useQuery({
    queryKey: ["draws", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("draws")
        .select("*")
        .eq("job_id", jobId!)
        .order("draw_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Draw[];
    },
  });
}

export function useCreateDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draw: Partial<Draw>) => {
      const { data, error } = await (supabase as any)
        .from("draws")
        .insert(draw)
        .select()
        .single();
      if (error) throw error;
      return data as Draw;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["draws", data.job_id] });
    },
  });
}

export function useUpdateDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id, ...updates }: Partial<Draw> & { id: string; job_id: string }) => {
      const { error } = await (supabase as any).from("draws").update(updates).eq("id", id);
      if (error) throw error;
      return job_id;
    },
    onSuccess: (job_id) => {
      qc.invalidateQueries({ queryKey: ["draws", job_id] });
    },
  });
}

export function useDeleteDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id }: { id: string; job_id: string }) => {
      const { error } = await (supabase as any).from("draws").delete().eq("id", id);
      if (error) throw error;
      return job_id;
    },
    onSuccess: (job_id) => {
      qc.invalidateQueries({ queryKey: ["draws", job_id] });
    },
  });
}
