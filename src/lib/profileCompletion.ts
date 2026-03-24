import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;

/** 0–100 based on populated identity fields (ops-focused, not gamified). */
export function computeProfileCompletionPercent(p: ProfileRow | null | undefined): number {
  if (!p) return 0;
  const checks = [
    Boolean(p.name?.trim()),
    Boolean(p.email?.trim()),
    Boolean(p.phone?.trim()),
    Boolean(p.phone_secondary?.trim()),
    Boolean(p.address?.trim()),
    Boolean(p.profile_picture_url?.trim()),
    Boolean(p.google_drive_link?.trim()),
    Boolean(p.signature_text?.trim() || p.signature_url?.trim()),
    p.manager_id != null,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
