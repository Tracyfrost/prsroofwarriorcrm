export type JobNavigationState = {
  origin?: "jobs-list" | "customer-jobs";
  customerId?: string;
  /** Deep link: Operations opens War Room + Job files; Job detail opens Production + Job files */
  openJobFiles?: boolean;
};

export function customerJobsState(customerId: string): JobNavigationState {
  return {
    origin: "customer-jobs",
    customerId,
  };
}

export function jobsListState(): JobNavigationState {
  return {
    origin: "jobs-list",
  };
}

export function resolveJobsBackPath(state: JobNavigationState | null | undefined): string {
  if (state?.origin === "customer-jobs" && state.customerId) {
    return `/customers/${state.customerId}?tab=jobs`;
  }
  return "/jobs";
}
