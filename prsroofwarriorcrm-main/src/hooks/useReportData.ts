import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getReportingRepForJob, getSquaresReported } from "@/lib/reports/repResolution";

export type JobForReport = {
  id: string;
  parent_job_id: string | null;
  sales_rep_id: string | null;
  status?: string;
  squares_estimated: number | null;
  squares_actual_installed: number | null;
  squares_final: number | null;
  number_of_squares: number | null;
  financials: { rcv?: number; acv?: number } | null;
  created_at: string;
  deleted_at: string | null;
};

export type AssignmentForReport = { job_id: string; user_id: string; assignment_role: string };

export type BySalesRepRow = {
  rep_id: string;
  rep_name: string;
  squares_installed: number;
  rcv_total: number;
  acv_total: number;
  job_count: number;
};

export type SquaresSummary = {
  total_estimated: number;
  total_actual_installed: number;
  total_final: number;
  variance_estimated_vs_actual: number;
  variance_actual_vs_final: number;
};

function aggregateBySalesRep(
  jobs: JobForReport[],
  assignmentsByJob: Map<string, AssignmentForReport[]>,
  profileMap: Map<string, { name?: string }>,
  mainJobById: Map<string, JobForReport>
): BySalesRepRow[] {
  const repMap = new Map<string, { squares: number; rcv: number; acv: number; count: number }>();

  for (const job of jobs) {
    if (job.deleted_at) continue;
    const assignments = assignmentsByJob.get(job.id) ?? [];
    const mainJob = job.parent_job_id ? mainJobById.get(job.parent_job_id) : null;
    const mainAssignments = mainJob ? assignmentsByJob.get(mainJob.id) ?? [] : [];
    const mainRepId = mainJob
      ? getReportingRepForJob(mainJob, mainAssignments, undefined)
      : undefined;
    const repId = getReportingRepForJob(job, assignments, mainRepId);
    if (!repId) continue;

    const squares = job.squares_actual_installed ?? job.squares_final ?? job.number_of_squares ?? 0;
    const rcv = (job.financials as any)?.rcv ?? 0;
    const acv = (job.financials as any)?.acv ?? 0;

    const row = repMap.get(repId);
    const name = profileMap.get(repId)?.name ?? "Unknown";
    if (row) {
      row.squares += Number(squares);
      row.rcv += Number(rcv);
      row.acv += Number(acv);
      row.count += 1;
    } else {
      repMap.set(repId, { squares: Number(squares), rcv: Number(rcv), acv: Number(acv), count: 1 });
    }
  }

  return Array.from(repMap.entries()).map(([rep_id, row]) => ({
    rep_id,
    rep_name: profileMap.get(rep_id)?.name ?? "Unknown",
    squares_installed: row.squares,
    rcv_total: row.rcv,
    acv_total: row.acv,
    job_count: row.count,
  }));
}

function aggregateSquaresSummary(jobs: JobForReport[]): SquaresSummary {
  let total_estimated = 0;
  let total_actual_installed = 0;
  let total_final = 0;
  for (const j of jobs) {
    if (j.deleted_at) continue;
    total_estimated += Number(j.squares_estimated ?? 0);
    total_actual_installed += Number(j.squares_actual_installed ?? j.number_of_squares ?? 0);
    total_final += Number(j.squares_final ?? j.squares_actual_installed ?? j.number_of_squares ?? 0);
  }
  return {
    total_estimated,
    total_actual_installed,
    total_final,
    variance_estimated_vs_actual: total_actual_installed - total_estimated,
    variance_actual_vs_final: total_final - total_actual_installed,
  };
}

export function useReportJobs() {
  return useQuery({
    queryKey: ["report-jobs-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, parent_job_id, sales_rep_id, status, squares_estimated, squares_actual_installed, squares_final, number_of_squares, financials, created_at, deleted_at"
        )
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as JobForReport[];
    },
  });
}

export function useReportAssignments() {
  return useQuery({
    queryKey: ["report-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("job_id, user_id, assignment_role");
      if (error) throw error;
      const list = (data ?? []) as AssignmentForReport[];
      const byJob = new Map<string, AssignmentForReport[]>();
      for (const a of list) {
        const arr = byJob.get(a.job_id) ?? [];
        arr.push(a);
        byJob.set(a.job_id, arr);
      }
      return byJob;
    },
  });
}

export function useReportProfilesMap() {
  return useQuery({
    queryKey: ["report-profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, user_id, name");
      if (error) throw error;
      const map = new Map<string, { name?: string }>();
      for (const p of data ?? []) {
        const row = p as { id: string; user_id?: string; name?: string };
        map.set(row.user_id ?? row.id, { name: row.name });
      }
      return map;
    },
  });
}

export function useBySalesRepReport(): {
  data: BySalesRepRow[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useReportJobs();
  const { data: assignmentsByJob = new Map(), isLoading: assignLoading } = useReportAssignments();
  const { data: profileMap = new Map(), isLoading: profilesLoading } = useReportProfilesMap();

  const mainJobById = new Map<string, JobForReport>();
  for (const j of jobs) {
    if (!j.parent_job_id) mainJobById.set(j.id, j);
  }

  const data = aggregateBySalesRep(jobs, assignmentsByJob, profileMap, mainJobById);
  return {
    data,
    isLoading: jobsLoading || assignLoading || profilesLoading,
    error: jobsError ?? null,
  };
}

export function useSquaresSummaryReport(): {
  data: SquaresSummary | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: jobs = [], isLoading, error } = useReportJobs();
  const data = jobs.length ? aggregateSquaresSummary(jobs) : null;
  return { data: data ?? null, isLoading, error: error ?? null };
}

export type CustomReportConfig = {
  groupBy?: "rep" | "status" | "month";
  metrics?: ("squares_installed" | "rcv" | "acv" | "job_count")[];
  date_from?: string | null;
  date_to?: string | null;
  statuses?: string[] | null;
};

export type CustomReportRow = Record<string, string | number>;

export function runCustomReport(
  jobs: JobForReport[],
  assignmentsByJob: Map<string, AssignmentForReport[]>,
  profileMap: Map<string, { name?: string }>,
  config: CustomReportConfig
): CustomReportRow[] {
  const mainJobById = new Map<string, JobForReport>();
  for (const j of jobs) {
    if (!j.parent_job_id) mainJobById.set(j.id, j);
  }

  const groupBy = config.groupBy ?? "rep";
  const metrics = config.metrics ?? ["squares_installed", "rcv", "job_count"];
  const dateFrom = config.date_from ? new Date(config.date_from).getTime() : null;
  const dateTo = config.date_to ? new Date(config.date_to).getTime() : null;
  const statusSet = config.statuses?.length ? new Set(config.statuses) : null;

  let filtered = jobs.filter((j) => !j.deleted_at);
  if (dateFrom != null) filtered = filtered.filter((j) => new Date(j.created_at).getTime() >= dateFrom);
  if (dateTo != null) filtered = filtered.filter((j) => new Date(j.created_at).getTime() <= dateTo);
  if (statusSet != null) filtered = filtered.filter((j) => j.status && statusSet.has(j.status));

  const keyToAgg = new Map<string, { squares: number; rcv: number; acv: number; count: number }>();

  for (const job of filtered) {
    const assignments = assignmentsByJob.get(job.id) ?? [];
    const mainJob = job.parent_job_id ? mainJobById.get(job.parent_job_id) : null;
    const mainAssignments = mainJob ? assignmentsByJob.get(mainJob.id) ?? [] : [];
    const mainRepId = mainJob ? getReportingRepForJob(mainJob, mainAssignments, undefined) : undefined;
    const repId = getReportingRepForJob(job, assignments, mainRepId);

    let key: string;
    if (groupBy === "rep") key = repId ? profileMap.get(repId)?.name ?? repId : "Unassigned";
    else if (groupBy === "status") key = job.status ?? "unknown";
    else {
      const d = new Date(job.created_at);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const squares = Number(job.squares_actual_installed ?? job.squares_final ?? job.number_of_squares ?? 0);
    const rcv = Number((job.financials as any)?.rcv ?? 0);
    const acv = Number((job.financials as any)?.acv ?? 0);

    const row = keyToAgg.get(key);
    if (row) {
      row.squares += squares;
      row.rcv += rcv;
      row.acv += acv;
      row.count += 1;
    } else {
      keyToAgg.set(key, { squares, rcv, acv, count: 1 });
    }
  }

  return Array.from(keyToAgg.entries()).map(([groupKey, row]) => {
    const out: CustomReportRow = { group: groupKey };
    if (metrics.includes("squares_installed")) out.squares_installed = row.squares;
    if (metrics.includes("rcv")) out.rcv = row.rcv;
    if (metrics.includes("acv")) out.acv = row.acv;
    if (metrics.includes("job_count")) out.job_count = row.count;
    return out;
  });
}
