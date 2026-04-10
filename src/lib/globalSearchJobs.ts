/** Rows returned for Operations — Jobs in global search (subset of `jobs`). */
export type GlobalSearchJobRow = {
  id: string;
  job_id: string;
  claim_number: string | null;
  status: string | null;
};

/**
 * Merge two job lists (e.g. from job_id ILIKE vs claim_number ILIKE), dedupe by id,
 * preserve order (job_id matches first), and cap length — avoids PostgREST `.or()` comma bugs.
 */
export function mergeGlobalSearchJobRows(
  byJobId: GlobalSearchJobRow[],
  byClaim: GlobalSearchJobRow[],
  limit: number
): GlobalSearchJobRow[] {
  const seen = new Set<string>();
  const out: GlobalSearchJobRow[] = [];
  for (const row of [...byJobId, ...byClaim]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
