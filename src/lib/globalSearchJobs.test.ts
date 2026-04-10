import { describe, it, expect } from "vitest";
import { mergeGlobalSearchJobRows, type GlobalSearchJobRow } from "./globalSearchJobs";

function row(
  partial: Partial<GlobalSearchJobRow> & { id: string; job_id: string }
): GlobalSearchJobRow {
  return {
    claim_number: null,
    status: null,
    ...partial,
  };
}

describe("mergeGlobalSearchJobRows", () => {
  it("dedupes by id with job_id matches first", () => {
    const a = row({ id: "1", job_id: "J-1", claim_number: "C1" });
    const b = row({ id: "1", job_id: "J-1", claim_number: "C1" });
    expect(mergeGlobalSearchJobRows([a], [b], 10)).toEqual([a]);
  });

  it("fills from claim list after job_id list without exceeding limit", () => {
    const j1 = row({ id: "a", job_id: "JOB-A" });
    const j2 = row({ id: "b", job_id: "JOB-B" });
    const c1 = row({ id: "c", job_id: "JOB-C", claim_number: "X1" });
    expect(mergeGlobalSearchJobRows([j1], [j2, c1], 2)).toEqual([j1, j2]);
  });

  it("returns empty when both inputs empty", () => {
    expect(mergeGlobalSearchJobRows([], [], 5)).toEqual([]);
  });
});
