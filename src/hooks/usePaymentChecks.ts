import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { sendChannelNotification, sendDMNotification } from "@/lib/notifications/slackService";
import { SlackNotificationType } from "@/lib/notifications/notificationTypes";

export type PaymentCheck = Tables<"payment_checks">;
export type CheckHistory = Tables<"check_history">;

export const CHECK_TYPES = ["ACV", "2nd_ACV", "Depreciation", "Final", "Supplement", "Other"] as const;
export const CHECK_STATUSES = ["Pending", "Received", "Deposited", "Disputed"] as const;

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendPaymentNotifications(payment: {
  amount: number;
  job_id: string;
}): Promise<void> {
  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, job_id, customers(name)")
      .eq("id", payment.job_id)
      .maybeSingle();

    const customerFullName = (job as any)?.customers?.name?.trim() || "Unknown Customer";
    const jobNumber = job?.job_id || payment.job_id;
    const formattedAmount = formatCurrency(Number(payment.amount || 0));

    const channelMessage = `💰 Payment Received: *${customerFullName}*\n💵 Amount: $${formattedAmount}\n📋 Job #${jobNumber}`;
    await sendChannelNotification(SlackNotificationType.PaymentReceivedChannel, channelMessage);

    if (Number(payment.amount) > 5000) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["owner", "office_admin"]);

      const recipientIds = Array.from(
        new Set((roleRows ?? []).map((row) => row.user_id).filter(Boolean)),
      );

      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", recipientIds);

        const dmMessage = `💵 Large Payment Alert: $${formattedAmount} received\n👤 Customer: *${customerFullName}*\n📋 Job #${jobNumber}`;
        const targets = (profiles ?? [])
          .map((p: any) => p?.slack_user_id?.trim())
          .filter((id: string | undefined | null): id is string => Boolean(id));

        for (const slackUserId of targets) {
          await sendDMNotification(SlackNotificationType.LargePaymentAlertDm, slackUserId, dmMessage);
        }
      }
    }
  } catch (slackError) {
    console.warn("Payment recorded, but Slack notification failed:", slackError);
  }
}

export function usePaymentChecks(jobId?: string) {
  return useQuery({
    queryKey: ["payment-checks", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_checks")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PaymentCheck[];
    },
  });
}

export function useCreatePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (check: TablesInsert<"payment_checks">) => {
      const { data, error } = await supabase
        .from("payment_checks")
        .insert(check)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.job_id] });
      void sendPaymentNotifications({
        amount: Number(data.amount ?? 0),
        job_id: data.job_id,
      });
    },
  });
}

export function useUpdatePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId, ...updates }: { id: string; jobId: string } & Partial<PaymentCheck>) => {
      const { data, error } = await supabase
        .from("payment_checks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.jobId] });
      void sendPaymentNotifications({
        amount: Number((data as any).amount ?? 0),
        job_id: data.jobId,
      });
    },
  });
}

export function useDeletePaymentCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase
        .from("payment_checks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-checks", data.jobId] });
    },
  });
}

export function useCheckHistory(checkId?: string) {
  return useQuery({
    queryKey: ["check-history", checkId],
    enabled: !!checkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_history")
        .select("*")
        .eq("check_id", checkId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as CheckHistory[];
    },
  });
}
