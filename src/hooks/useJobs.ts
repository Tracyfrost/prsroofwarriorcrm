import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { sendChannelNotification, sendDMNotification } from "@/lib/notifications/slackService";
import { SlackNotificationType } from "@/lib/notifications/notificationTypes";

export type Job = Tables<"jobs"> & { customers?: { name: string; id: string } | null };

export type JobAssignment = {
  id: string;
  job_id: string;
  user_id: string;
  assignment_role: string;
  assigned_at: string;
  notes: string;
  profiles?: { name: string; email: string } | null;
};

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });
}

export function useMainJobs() {
  return useQuery({
    queryKey: ["main-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(id, name)")
        .is("parent_job_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });
}

export function useSubJobs(parentJobId: string | undefined) {
  return useQuery({
    queryKey: ["sub-jobs", parentJobId],
    enabled: !!parentJobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(id, name)")
        .eq("parent_job_id", parentJobId!)
        .order("sub_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(id, name, main_address, contact_info, insurance_carrier)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useJobAssignments(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-assignments", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*")
        .eq("job_id", jobId!)
        .order("assigned_at");
      if (error) throw error;
      return (data ?? []) as JobAssignment[];
    },
  });
}

export function useCreateJobAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: { job_id: string; user_id: string; assignment_role: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("job_assignments")
        .insert(assignment as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-assignments", data.job_id] });
    },
  });
}

export function useDeleteJobAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase
        .from("job_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-assignments", data.jobId] });
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Omit<TablesInsert<"jobs">, "job_id"> & {
      assigned_user_id?: string;
      claim_number?: string;
      parent_job_id?: string;
      job_type?: "insurance" | "cash";
      estimate_amount?: number;
    }) => {
      const { assigned_user_id, ...jobData } = job;
      const { data, error } = await supabase
        .from("jobs")
        .insert({ ...jobData, job_id: "" } as TablesInsert<"jobs">)
        .select()
        .single();
      if (error) throw error;

      // Auto-create primary_rep assignment (only for main jobs)
      if (!jobData.parent_job_id && (assigned_user_id || jobData.sales_rep_id)) {
        await supabase.from("job_assignments").insert({
          job_id: data.id,
          user_id: assigned_user_id || jobData.sales_rep_id!,
          assignment_role: "primary_rep",
        } as any);
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["main-jobs"] });
      qc.invalidateQueries({ queryKey: ["job-count"] });
      qc.invalidateQueries({ queryKey: ["sub-jobs"] });
      qc.invalidateQueries({ queryKey: ["customer-jobs", data.customer_id] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"jobs"> & { id: string }) => {
      const { data: updatedJob, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const { data: jobWithCustomer } = await supabase
        .from("jobs")
        .select("id, job_id, status, customers(name)")
        .eq("id", id)
        .maybeSingle();

      const { data: assignments } = await supabase
        .from("job_assignments")
        .select("user_id, assignment_role")
        .eq("job_id", id);

      const primaryRep = (assignments ?? []).find((a) => a.assignment_role === "primary_rep");

      let pmName = "Unassigned";
      let pmSlackUserId: string | null = null;
      if (primaryRep?.user_id) {
        const { data: pmProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", primaryRep.user_id)
          .maybeSingle();
        pmName = pmProfile?.name?.trim() || "Unassigned";
        pmSlackUserId = (pmProfile as any)?.slack_user_id?.trim() || null;
      }

      const customerFullName = (jobWithCustomer as any)?.customers?.name?.trim() || "Unknown Customer";
      const jobNumber = jobWithCustomer?.job_id || updatedJob.job_id || id;
      const newStatus = String(updatedJob.status ?? updates.status ?? "updated");

      return {
        ...updatedJob,
        customerFullName,
        jobNumber,
        newStatus,
        pmName,
        pmSlackUserId,
      };
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["main-jobs"] });
      qc.invalidateQueries({ queryKey: ["job", data.id] });
      qc.invalidateQueries({ queryKey: ["sub-jobs"] });

      try {
        const channelMessage = `🔄 Job Status Update: *${data.customerFullName}*\n📋 Job #${data.jobNumber} moved to: *${data.newStatus}*\n👤 Project Manager: ${data.pmName || "Unassigned"}`;
        await sendChannelNotification(SlackNotificationType.JobStatusChangedChannel, channelMessage);

        if (data.pmSlackUserId) {
          const dmMessage = `🏗️ Job update on your watch: *${data.customerFullName}*\n📋 Job #${data.jobNumber} is now: *${data.newStatus}*\nCheck it out in PRS CRM.`;
          await sendDMNotification(SlackNotificationType.JobAssignedDm, data.pmSlackUserId, dmMessage);
        }
      } catch (slackError) {
        console.warn("Job status updated, but Slack notification failed:", slackError);
      }
    },
  });
}

export function useAppointments(jobId?: string) {
  return useQuery({
    queryKey: ["appointments", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("job_id", jobId!)
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ["all-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, jobs(id, job_id, customer_id, customers(name)), customers(name)")
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSoftDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      // Soft delete: set deleted_at on the job and all its sub-jobs
      const { error: mainErr } = await supabase
        .from("jobs")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", jobId);
      if (mainErr) throw mainErr;
      // Also soft delete sub-jobs
      const { error: subErr } = await supabase
        .from("jobs")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("parent_job_id", jobId);
      if (subErr) throw subErr;
      return jobId;
    },
    onSuccess: (jobId) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["main-jobs"] });
      qc.invalidateQueries({ queryKey: ["sub-jobs"] });
      qc.invalidateQueries({ queryKey: ["job-count"] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["customer-jobs"] });
      qc.invalidateQueries({ queryKey: ["report-jobs-full"] });
    },
  });
}

/** Sets archived_at on this job and all sub-jobs when this row is a main job. */
export function useSetJobArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, archived }: { jobId: string; archived: boolean }) => {
      const archived_at = archived ? new Date().toISOString() : null;
      const { error: mainErr } = await supabase.from("jobs").update({ archived_at }).eq("id", jobId);
      if (mainErr) throw mainErr;
      const { error: subErr } = await supabase.from("jobs").update({ archived_at }).eq("parent_job_id", jobId);
      if (subErr) throw subErr;
      return { jobId };
    },
    onSuccess: ({ jobId }) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["main-jobs"] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["sub-jobs"] });
      qc.invalidateQueries({ queryKey: ["job-count"] });
      qc.invalidateQueries({ queryKey: ["customer-jobs"] });
      qc.invalidateQueries({ queryKey: ["report-jobs-full"] });
    },
  });
}

export type CreateAppointmentInput = {
  date_time: string;
  job_id?: string | null;
  customer_id?: string | null;
  assignee_id?: string | null;
  outcome?: string;
  title?: string;
  notes?: string;
  duration_minutes?: number;
  notification_settings?: TablesInsert<"appointments">["notification_settings"];
};

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appt: CreateAppointmentInput) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(appt as TablesInsert<"appointments">)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["all-appointments"] });
      qc.invalidateQueries({ queryKey: ["customer-appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      date_time?: string;
      assignee_id?: string | null;
      customer_id?: string | null;
      job_id?: string | null;
      outcome?: string;
      title?: string;
      notes?: string;
      duration_minutes?: number;
      notification_settings?: TablesUpdate<"appointments">["notification_settings"];
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["all-appointments"] });
      qc.invalidateQueries({ queryKey: ["customer-appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["all-appointments"] });
      qc.invalidateQueries({ queryKey: ["customer-appointments"] });
    },
  });
}
