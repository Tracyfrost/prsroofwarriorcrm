import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JobLog = {
  id: string;
  job_id: string;
  type: string;
  content: string;
  attachments: string[];
  user_id: string;
  created_at: string;
  edited_at: string | null;
  edited_by: string | null;
  deleted_at: string | null;
};

export function useJobLogs(jobId?: string) {
  return useQuery({
    queryKey: ["job-logs", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_logs")
        .select("*")
        .eq("job_id", jobId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobLog[];
    },
  });
}

export function useCreateJobLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: { job_id: string; type: string; content: string; user_id: string; attachments?: string[] }) => {
      const { data, error } = await (supabase as any)
        .from("job_logs")
        .insert({
          job_id: log.job_id,
          type: log.type,
          content: log.content,
          user_id: log.user_id,
          attachments: log.attachments ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as JobLog;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-logs", data.job_id] });
    },
  });
}

export function useSoftDeleteJobLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await (supabase as any)
        .from("job_logs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return { id, jobId };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["job-logs", vars.jobId] });
    },
  });
}

export function useUpdateJobLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, editedBy, jobId }: { id: string; content: string; editedBy: string; jobId: string }) => {
      const { error } = await (supabase as any)
        .from("job_logs")
        .update({ content, edited_at: new Date().toISOString(), edited_by: editedBy })
        .eq("id", id);
      if (error) throw error;
      return { id, jobId };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["job-logs", vars.jobId] });
    },
  });
}
