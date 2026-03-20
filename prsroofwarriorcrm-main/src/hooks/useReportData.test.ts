import { describe, it, expect } from "vitest";
import {
  runCustomReport,
  type JobForReport,
  type CustomReportConfig,
} from "./useReportData";

const mkJob = (overrides: Partial<JobForReport> & { id: string }): JobForReport => ({
  id: overrides.id,
  parent_job_id: null,
  sales_rep_id: null,
  squares_estimated: null,
  squares_actual_installed: null,
  squares_final: null,
  number_of_squares: null,
  financials: null,
  created_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

describe("runCustomReport", () => {
  it("aggregates by rep using squares_actual_installed", () => {
    const jobs: JobForReport[] = [
      mkJob({
        id: "j1",
        sales_rep_id: "rep-a",
        squares_actual_installed: 10,
        financials: { rcv: 1000, acv: 500 },
      }),
      mkJob({
        id: "j2",
        sales_rep_id: "rep-a",
        squares_actual_installed: 5,
        financials: { rcv: 500, acv: 250 },
      }),
      mkJob({
        id: "j3",
        sales_rep_id: "rep-b",
        squares_actual_installed: 20,
        financials: { rcv: 2000, acv: 1000 },
      }),
    ];
    const assignmentsByJob = new Map<string, { job_id: string; user_id: string; assignment_role: string }[]>();
    const profileMap = new Map<string, { name?: string }>([
      ["rep-a", { name: "Rep A" }],
      ["rep-b", { name: "Rep B" }],
    ]);
    const config: CustomReportConfig = { groupBy: "rep", metrics: ["squares_installed", "rcv", "job_count"] };
    const result = runCustomReport(jobs, assignmentsByJob as any, profileMap, config);
    expect(result).toHaveLength(2);
    const repA = result.find((r) => r.group === "Rep A");
    const repB = result.find((r) => r.group === "Rep B");
    expect(repA?.squares_installed).toBe(15);
    expect(repA?.rcv).toBe(1500);
    expect(repA?.job_count).toBe(2);
    expect(repB?.squares_installed).toBe(20);
    expect(repB?.rcv).toBe(2000);
    expect(repB?.job_count).toBe(1);
  });

  it("filters by date range", () => {
    const jobs: JobForReport[] = [
      mkJob({ id: "j1", sales_rep_id: "r1", created_at: "2025-02-01T00:00:00Z", financials: { rcv: 100 } }),
      mkJob({ id: "j2", sales_rep_id: "r1", created_at: "2025-03-15T00:00:00Z", financials: { rcv: 200 } }),
    ];
    const profileMap = new Map([["r1", { name: "R1" }]]);
    const config: CustomReportConfig = {
      groupBy: "rep",
      metrics: ["job_count"],
      date_from: "2025-03-01",
      date_to: "2025-03-31",
    };
    const result = runCustomReport(jobs, new Map() as any, profileMap, config);
    expect(result).toHaveLength(1);
    expect(result[0].job_count).toBe(1);
  });
});
