import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier: SubscriptionTier;
  active: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  overridden_by: string | null;
  override_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Subscription | null) ?? { tier: "free" as SubscriptionTier, active: true };
    },
  });
}

export function useAllSubscriptions() {
  return useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });
}

export function useOverrideSubscription() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      tier,
      notes,
    }: {
      userId: string;
      tier: SubscriptionTier;
      notes: string;
    }) => {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            tier: tier as any,
            overridden_by: user!.id,
            override_notes: notes,
            active: true,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            tier: tier as any,
            overridden_by: user!.id,
            override_notes: notes,
            active: true,
          });
        if (error) throw error;
      }

      // Audit log
      await supabase.from("audits").insert({
        user_id: user!.id,
        entity_type: "subscription",
        action: "tier_override",
        entity_id: userId,
        details: { tier, notes } as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["all-subscriptions"] });
    },
  });
}

export function useFeatureGate() {
  const { data: subscription } = useSubscription();
  const tier = subscription?.tier ?? "free";

  return {
    tier,
    canUseCustomWorkflows: tier === "pro" || tier === "enterprise",
    canUseAiDetection: tier === "pro" || tier === "enterprise",
    canUseAdvancedReports: tier === "pro" || tier === "enterprise",
    canUseAllFeatures: tier === "enterprise",
    isPro: tier === "pro" || tier === "enterprise",
    isEnterprise: tier === "enterprise",
  };
}
