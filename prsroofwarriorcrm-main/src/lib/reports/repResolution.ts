/**
 * Display value for "squares" when a single number is shown (backward compatible).
 * Use: COALESCE(squares_actual_installed, squares_final, number_of_squares).
 */
export function getSquaresReported(job: {
  number_of_squares?: number | null;
  squares_estimated?: number | null;
  squares_actual_installed?: number | null;
  squares_final?: number | null;
}): number {
  const v =
    job.squares_actual_installed ?? job.squares_final ?? job.number_of_squares ?? null;
  return v != null ? Number(v) : 0;
}

/**
 * Rep attribution for reporting.
 * Rule: primary_rep from job_assignments if present, else jobs.sales_rep_id.
 * Sub-jobs: inherit main job's reporting rep unless explicitly overridden
 * (i.e. sub-job has its own primary_rep assignment or sales_rep_id).
 */

export type JobForRep = {
  id: string;
  parent_job_id?: string | null;
  sales_rep_id?: string | null;
};

export type AssignmentForRep = {
  user_id: string;
  assignment_role: string;
};

/**
 * Returns the reporting rep user_id for a job.
 * @param job - The job (must have id, parent_job_id, sales_rep_id)
 * @param assignments - Job assignments for this job (with assignment_role)
 * @param mainJobResolvedRepId - If this job is a sub-job, the main job's resolved rep id (from getReportingRepForJob(mainJob, mainAssignments))
 */
export function getReportingRepForJob(
  job: JobForRep,
  assignments: AssignmentForRep[],
  mainJobResolvedRepId?: string | null
): string | null {
  const primaryAssignment = assignments.find((a) => a.assignment_role === "primary_rep");
  const explicitRep = primaryAssignment?.user_id ?? job.sales_rep_id ?? null;

  // Sub-job: inherit main rep unless this job has an explicit rep
  if (job.parent_job_id != null && mainJobResolvedRepId != null) {
    return explicitRep ?? mainJobResolvedRepId;
  }

  return explicitRep;
}
