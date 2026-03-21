/**
 * Normalize free-form lead source inputs into canonical `public.lead_sources.name` keys.
 *
 * Intentionally conservative:
 * - Keeps canonical keys as-is after slug normalization.
 * - Adds alias mappings for common "human" formats (spaces, hyphens, case).
 */
export function normalizeLeadSourceKey(input?: string | null): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1) Normalize to a predictable slug shape.
  // - collapse whitespace and hyphens into underscores
  // - strip any remaining non `a-z0-9_` chars
  const lower = trimmed.toLowerCase();
  const underscored = lower.replace(/[\s\-]+/g, "_");
  const cleaned = underscored
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) return null;

  // 2) Alias mappings to canonical keys.
  const aliasMap: Record<string, string> = {
    // existing canonical-ish keys
    self_gen: "self_gen",
    referral: "referral",
    marketing: "marketing",
    website: "website",
    insurance: "insurance",
    other: "other",

    // new intake keys and common variants
    "self_generated": "self_gen",
    "selfgen": "self_gen",

    "door_knock": "door_knock",
    "doorknock": "door_knock",

    "telemarketing_vendor": "telemarketing_vendor",
    "telemarketingvendor": "telemarketing_vendor",

    affiliate: "affiliate",
    facebook: "facebook",
    google: "google",

    yard_sign: "yard_sign",
    yardsign: "yard_sign",
  };

  return aliasMap[cleaned] ?? cleaned;
}

