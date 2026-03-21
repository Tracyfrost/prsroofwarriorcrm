import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { endOfMonth, startOfMonth, subDays } from "date-fns";

export type UserProfileKpis = {
  jobsClosedThisMonth: number;
  pipelineAcv: number;
  pendingCommissions: number;
  followUpsDue: number;
  responseTimeHours: number | null;
  stubs: { responseTime: boolean };
};

const empty: UserProfileKpis = {
  jobsClosedThisMonth: 0,
  pipelineAcv: 0,
  pendingCommissions: 0,
  followUpsDue: 0,
  responseTimeHours: null,
  stubs: { responseTime: true },
};

export function useUserProfileKpis(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-profile-kpis", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserProfileKpis> => {
      if (!userId) return empty;
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      try {
        const { data: closedRows, error: cErr } = await supabase
          .from("jobs")
          .select("id")
          .eq("sales_rep_id", userId)
          .eq("status", "closed")
          .gte("updated_at", monthStart)
          .lte("updated_at", monthEnd)
          .is("deleted_at", null);
        if (cErr) throw cErr;

        const { data: pipeRows, error: pErr } = await supabase
          .from("jobs")
          .select("financials, status")
          .eq("sales_rep_id", userId)
          .not("status", "eq", "closed")
          .is("deleted_at", null);
        if (pErr) throw pErr;

        let pipelineAcv = 0;
        for (const j of pipeRows ?? []) {
          const acv = (j.financials as { acv?: number } | null)?.acv ?? 0;
          pipelineAcv += typeof acv === "number" ? acv : 0;
        }

        const { data: commRows, error: coErr } = await supabase
          .from("commissions")
          .select("amount, override_amount")
          .eq("rep_id", userId)
          .eq("status", "earned");
        if (coErr) throw coErr;

        let pendingCommissions = 0;
        for (const c of commRows ?? []) {
          pendingCommissions += (c.amount ?? 0) + (c.override_amount ?? 0);
        }

        const { count: followCount, error: fErr } = await supabase
          .from("lead_assignments")
          .select("*", { count: "exact", head: true })
          .eq("assigned_rep_id", userId)
          .eq("status", "assigned");
        if (fErr) throw fErr;

        return {
          jobsClosedThisMonth: closedRows?.length ?? 0,
          pipelineAcv,
          pendingCommissions,
          followUpsDue: followCount ?? 0,
          responseTimeHours: null,
          stubs: { responseTime: true },
        };
      } catch {
        return empty;
      }
    },
  });
}

/** Audits in the last 30 days where user is actor or subject (for operator score). */
export function useRecentUserAuditCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-audit-count-30d", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const since = subDays(new Date(), 30).toISOString();
      const { count, error } = await supabase
        .from("audits")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},subject_user_id.eq.${userId}`)
        .gte("created_at", since);
      if (error) return 0;
      return count ?? 0;
    },
  });
}
