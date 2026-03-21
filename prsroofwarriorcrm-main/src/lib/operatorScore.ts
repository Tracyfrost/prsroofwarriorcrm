/** Lightweight 0–100 “operator” score from observable signals (no ML). */
export function computeOperatorScore(input: {
  profileCompletion: number;
  lastLoginAt: string | null;
  auditCount30d: number;
  jobsClosedThisMonth: number;
}): number {
  const completionPart = (input.profileCompletion / 100) * 30;
  const loginPart = input.lastLoginAt
    ? Math.max(
        0,
        25 -
          Math.min(
            25,
            (Date.now() - new Date(input.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24),
          ),
      )
    : 5;
  const activityPart = Math.min(45, input.auditCount30d * 2 + input.jobsClosedThisMonth * 4);
  return Math.min(100, Math.round(completionPart + loginPart + activityPart));
}

export type AccountHealth = "strong" | "ok" | "attention";

export function accountHealthFromScore(score: number, active: boolean): AccountHealth {
  if (!active) return "attention";
  if (score >= 70) return "strong";
  if (score >= 45) return "ok";
  return "attention";
}
