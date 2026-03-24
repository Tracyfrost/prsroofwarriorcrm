import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const LEVEL_CONFIG: Record<string, { label: string; commissionRate: number; overrideRate: number; badge: string }> = {
  highest: { label: "Owner / Executive", commissionRate: 0, overrideRate: 0, badge: "👑" },
  admin: { label: "Admin", commissionRate: 0, overrideRate: 0, badge: "🛡️" },
  manager: { label: "Manager", commissionRate: 0, overrideRate: 0, badge: "📋" },
  lvl5: { label: "Master Jedi (GM)", commissionRate: 0.50, overrideRate: 0.10, badge: "⭐" },
  lvl4: { label: "Jedi (Asst Mgr)", commissionRate: 0.50, overrideRate: 0.05, badge: "🔷" },
  lvl3: { label: "Senior Rep", commissionRate: 0.40, overrideRate: 0, badge: "🔶" },
  lvl2: { label: "Rep", commissionRate: 0.30, overrideRate: 0, badge: "🔹" },
  lvl1: { label: "Canvasser", commissionRate: 0, overrideRate: 0, badge: "📌" },
};

export const LEVELS = Object.keys(LEVEL_CONFIG) as Array<keyof typeof LEVEL_CONFIG>;

export type ProfileWithHierarchy = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  verified: boolean;
  level: string;
  manager_id: string | null;
  commission_rate: number;
  override_rate: number;
  created_at: string;
  last_login: string | null;
  must_change_password: boolean;
  roles: string[];
  manager_name?: string;
};

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles-hierarchy"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      if (rolesError) throw rolesError;

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
        manager_name: p.manager_id ? (profileMap.get(p.manager_id) as any)?.name || "Unknown" : null,
      })) as ProfileWithHierarchy[];
    },
  });
}

export function useUpdateProfileHierarchy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      level,
      manager_id,
      commission_rate,
      override_rate,
    }: {
      profileId: string;
      level: string;
      manager_id: string | null;
      commission_rate: number;
      override_rate: number;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          level: level as any,
          manager_id,
          commission_rate,
          override_rate,
        })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
    },
  });
}

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile-hierarchy", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfileByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfileByProfileId(profileId: string | undefined) {
  return useQuery({
    queryKey: ["profile-by-profile-id", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type ProfileUpdatePayload = {
  profileId: string;
  name?: string;
  email?: string;
  phone?: string | null;
  phone_secondary?: string | null;
  address?: string | null;
  google_drive_link?: string | null;
  signature_url?: string | null;
  signature_text?: string | null;
  profile_picture_url?: string | null;
};

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      const { profileId, ...fields } = payload;
      const { data: before, error: fetchErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .single();
      if (fetchErr) throw fetchErr;
      const { error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", profileId);
      if (error) throw error;
      const changedKeys = Object.keys(fields).filter((k) => (fields as Record<string, unknown>)[k] !== undefined);
      if (changedKeys.length > 0 && before?.user_id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const actorId = sessionData.session?.user?.id;
        if (actorId) {
          await supabase.from("audits").insert({
            user_id: actorId,
            subject_user_id: before.user_id,
            entity_type: "user",
            action: "profile_updated",
            entity_id: before.user_id,
            details: { updated_fields: changedKeys },
          });
        }
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-profile-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["profile-by-user"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
    },
  });
}
