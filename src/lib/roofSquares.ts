/** Job fields used to resolve planning / fallback squares (subset of `jobs` row). */
export type PlanningJobSquares = {
  squares_estimated?: number | null;
  squares_actual_installed?: number | null;
  squares_final?: number | null;
  number_of_squares?: number | null;
};

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Planning roof SQ: Measurements (estimated) → parsed insurance scope text → legacy estimate → installed/final/legacy column.
 */
export function resolvePlanningRoofSquares(job: PlanningJobSquares | null, qual: Record<string, unknown> | null | undefined): number {
  const q = qual ?? {};
  const se = num(job?.squares_estimated);
  if (se > 0) return se;

  const scopeText = String(q.scope_sq_all_structures ?? "");
  const parsedScope = parseFloat(scopeText.match(/\d+\.?\d*/)?.[0] || "0");
  if (parsedScope > 0) return parsedScope;

  const ersq = num(q.estimate_roof_sq);
  if (ersq > 0) return ersq;

  const a = num(job?.squares_actual_installed);
  if (a > 0) return a;
  const f = num(job?.squares_final);
  if (f > 0) return f;
  const legacy = num(job?.number_of_squares);
  return legacy;
}
