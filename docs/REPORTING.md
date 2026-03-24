# Reporting: Squares & Rep Attribution

## Squares tracking (Option B)

- **Columns on `jobs`**: `squares_estimated`, `squares_actual_installed`, `squares_final` (all nullable numeric).
- **Total Squares Installed** in reports always uses `squares_actual_installed` (with fallback to `squares_final`, then legacy `number_of_squares` for backfill).
- **Backward compatibility**: Existing `number_of_squares` is unchanged. Display value is `COALESCE(squares_actual_installed, squares_final, number_of_squares)`.

## Rep attribution (single rule)

- **Primary rule**: `primary_rep` from `job_assignments` if present, else `jobs.sales_rep_id`.
- **Sub-jobs**: Sub-jobs inherit the main job’s reporting rep unless explicitly overridden (i.e. the sub-job has its own `primary_rep` assignment or `sales_rep_id`).

Implementation: `getReportingRepForJob(job, assignments, mainJobResolvedRepId)` in `src/lib/reports/repResolution.ts`. Use this everywhere report logic needs rep attribution.
