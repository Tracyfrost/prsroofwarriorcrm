import { describe, it, expect } from "vitest";
import { getReportingRepForJob, getSquaresReported } from "./repResolution";

describe("getSquaresReported", () => {
  it("returns squares_actual_installed when set", () => {
    expect(getSquaresReported({ squares_actual_installed: 25, number_of_squares: 20 })).toBe(25);
  });

  it("falls back to squares_final when actual_installed is null", () => {
    expect(getSquaresReported({ squares_final: 26, number_of_squares: 20 })).toBe(26);
  });

  it("falls back to number_of_squares when both new fields are null", () => {
    expect(getSquaresReported({ number_of_squares: 20 })).toBe(20);
  });

  it("returns 0 when all are null/undefined", () => {
    expect(getSquaresReported({})).toBe(0);
  });
});

describe("getReportingRepForJob", () => {
  it("returns primary_rep user_id when assignment present", () => {
    const job = { id: "j1", parent_job_id: null, sales_rep_id: "rep-old" };
    const assignments = [{ user_id: "rep-primary", assignment_role: "primary_rep" }];
    expect(getReportingRepForJob(job, assignments)).toBe("rep-primary");
  });

  it("returns sales_rep_id when no primary_rep assignment", () => {
    const job = { id: "j1", parent_job_id: null, sales_rep_id: "rep-job" };
    const assignments = [{ user_id: "other", assignment_role: "field_tech" }];
    expect(getReportingRepForJob(job, assignments)).toBe("rep-job");
  });

  it("returns null when no assignment and no sales_rep_id", () => {
    const job = { id: "j1", parent_job_id: null, sales_rep_id: null };
    expect(getReportingRepForJob(job, [])).toBe(null);
  });

  it("sub-job inherits main rep when sub has no explicit rep", () => {
    const subJob = { id: "j2", parent_job_id: "j1", sales_rep_id: null };
    const assignments = [];
    const mainRepId = "rep-main";
    expect(getReportingRepForJob(subJob, assignments, mainRepId)).toBe("rep-main");
  });

  it("sub-job uses own primary_rep when overridden", () => {
    const subJob = { id: "j2", parent_job_id: "j1", sales_rep_id: null };
    const assignments = [{ user_id: "rep-sub", assignment_role: "primary_rep" }];
    const mainRepId = "rep-main";
    expect(getReportingRepForJob(subJob, assignments, mainRepId)).toBe("rep-sub");
  });

  it("sub-job uses own sales_rep_id when overridden", () => {
    const subJob = { id: "j2", parent_job_id: "j1", sales_rep_id: "rep-sub-job" };
    const assignments = [];
    const mainRepId = "rep-main";
    expect(getReportingRepForJob(subJob, assignments, mainRepId)).toBe("rep-sub-job");
  });
});
