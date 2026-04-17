// MOBILE-PORT: Maps to shared data hooks for React Native
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { sendChannelNotification, sendDMNotification } from "@/lib/notifications/slackService";
import { SlackNotificationType } from "@/lib/notifications/notificationTypes";

/* ── Lead Packages ────────────────────────────────── */

export function useLeadPackages() {
  return useQuery({
    queryKey: ["lead_packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_packages")
        .select("*, lead_sources!lead_packages_lead_source_id_fkey(name, color)")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeadPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: {
      lead_source_id: string;
      package_size: number;
      cost_per_lead: number;
      total_cost: number;
      notes?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("lead_packages")
        .insert({ ...pkg, leads_remaining: pkg.package_size })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead_packages"] });
      toast({ title: "Package Forged", description: "New lead package added to the Arsenal." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

/* ── Lead Assignments ────────────────────────────── */

export function useLeadAssignments() {
  return useQuery({
    queryKey: ["lead_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_assignments")
        .select("*, customers(name), lead_sources!lead_assignments_lead_source_id_fkey(name, color), lead_packages(package_size, cost_per_lead)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeadAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      customer_id: string;
      lead_source_id: string;
      package_id?: string;
      assigned_rep_id: string;
    }) => {
      const { data: assignment, error } = await supabase
        .from("lead_assignments")
        .insert(a)
        .select()
        .single();
      if (error) throw error;

      const { data: customer } = await supabase
        .from("customers")
        .select("name, city, state")
        .eq("id", a.customer_id)
        .maybeSingle();

      const { data: leadSource } = await supabase
        .from("lead_sources")
        .select("name")
        .eq("id", a.lead_source_id)
        .maybeSingle();

      const { data: repProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", a.assigned_rep_id)
        .maybeSingle();

      const customerFullName = customer?.name?.trim() || "Unknown Customer";
      const serviceType = leadSource?.name?.trim() || "";
      const repName = repProfile?.full_name?.trim() || "Unassigned";
      const repSlackUserId = repProfile?.slack_user_id?.trim() || null;
      const city = customer?.city?.trim() || "";
      const state = customer?.state?.trim() || "";
      const cityState = city && state ? `${city}, ${state}` : city || state || "";

      return {
        assignment,
        customerFullName,
        serviceType,
        repName,
        repSlackUserId,
        cityState,
      };
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["lead_assignments"] });
      qc.invalidateQueries({ queryKey: ["lead_packages"] });

      try {
        const line1 = result.serviceType
          ? `🆕 New Lead: *${result.customerFullName}* — ${result.serviceType}`
          : `🆕 New Lead: *${result.customerFullName}*`;
        const line2 = `👤 Assigned to: ${result.repName || "Unassigned"}`;
        const line3 = result.cityState ? `📍 ${result.cityState}` : "📍";
        const channelMessage = `${line1}\n${line2}\n${line3}`;
        await sendChannelNotification(SlackNotificationType.NewLeadChannel, channelMessage);

        if (result.repSlackUserId) {
          const dmLocationLine = result.cityState ? `📍 ${result.cityState}` : "📍";
          const dmMessage = `📋 You have a new lead assigned: *${result.customerFullName}*\n${dmLocationLine}\nCheck it out in PRS CRM.`;
          await sendDMNotification(SlackNotificationType.LeadAssignedDm, result.repSlackUserId, dmMessage);
        }
      } catch (slackError) {
        console.warn("Lead created, but Slack notification failed:", slackError);
      }

      toast({ title: "Lead Deployed", description: "Lead assigned from the Arsenal." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateLeadAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: "assigned" | "converted" | "dead" | "reallocated"; job_id?: string }) => {
      const { error } = await supabase
        .from("lead_assignments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead_assignments"] });
      toast({ title: "Assignment Updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

/* ── Distribution Rules ──────────────────────────── */

export function useDistributionRules() {
  return useQuery({
    queryKey: ["lead_distribution_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_distribution_rules")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDistributionRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      id: string;
      min_contracts_required?: number;
      lead_batch_size?: number;
      enforce_strict?: boolean;
    }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from("lead_distribution_rules")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead_distribution_rules"] });
      toast({ title: "Rules Updated", description: "Distribution rules forged." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

/* ── Rep Performance Metrics (computed) ──────────── */

export function useRepLeadMetrics() {
  const { data: assignments } = useLeadAssignments();
  const { data: rules } = useDistributionRules();

  const metrics = (assignments ?? []).reduce<
    Record<string, { total: number; converted: number; dead: number }>
  >((acc, a) => {
    const rid = a.assigned_rep_id;
    if (!acc[rid]) acc[rid] = { total: 0, converted: 0, dead: 0 };
    acc[rid].total++;
    if (a.status === "converted") acc[rid].converted++;
    if (a.status === "dead") acc[rid].dead++;
    return acc;
  }, {});

  const minContracts = rules?.min_contracts_required ?? 4;

  return Object.entries(metrics).map(([rep_id, m]) => ({
    rep_id,
    total_assigned: m.total,
    total_converted: m.converted,
    total_dead: m.dead,
    conversion_ratio: m.total > 0 ? m.converted / m.total : 0,
    eligible: m.converted >= minContracts,
  }));
}

/* ── Arsenal Summary Stats ───────────────────────── */

export function useArsenalStats() {
  const { data: packages } = useLeadPackages();
  const { data: assignments } = useLeadAssignments();

  const totalRemaining = (packages ?? []).reduce((s, p) => s + (p.leads_remaining ?? 0), 0);
  const totalPurchased = (packages ?? []).reduce((s, p) => s + (p.package_size ?? 0), 0);
  const totalCost = (packages ?? []).reduce((s, p) => s + Number(p.total_cost ?? 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const assignedThisMonth = (assignments ?? []).filter(
    (a) => a.created_at >= monthStart
  ).length;
  const converted = (assignments ?? []).filter((a) => a.status === "converted").length;

  return {
    totalRemaining,
    totalPurchased,
    totalCost,
    assignedThisMonth,
    converted,
    roi: totalCost > 0 ? ((converted / Math.max(totalPurchased, 1)) * 100) : 0,
  };
}
