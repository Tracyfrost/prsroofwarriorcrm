import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TimeOffRequestStatus = Database["public"]["Enums"]["time_off_request_status"];

export function useTimeOffRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["time-off-requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTimeOffRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      startDate,
      endDate,
      notes,
      location,
    }: {
      userId: string;
      startDate: string;
      endDate: string;
      notes?: string | null;
      location?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .insert({
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          status: "pending" as TimeOffRequestStatus,
          notes: notes ?? null,
          location: location ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["time-off-requests", variables.userId] });
    },
  });
}

export function useUpdateTimeOffRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewedBy,
    }: {
      id: string;
      status: TimeOffRequestStatus;
      reviewedBy?: string;
    }) => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .update({
          status,
          reviewed_by: reviewedBy ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["time-off-requests", data.user_id] });
    },
  });
}
