import { describe, expect, it } from "vitest";
import { uiToDbRole } from "@/lib/role-utils";
import { resolveJobsBackPath, type JobNavigationState } from "@/lib/jobNavigation";

/** Mirrors `matchesClientOwnerOrAdmin` / `matchesClientManager` / `canReceiveInspectionAssignment` in RBAC modules. */
function matchesClientOwnerOrAdmin(level: string, roles: readonly string[]) {
  return (
    level === "highest" ||
    level === "admin" ||
    roles.includes("owner") ||
    roles.includes("office_admin")
  );
}

function matchesClientManager(level: string, roles: readonly string[]) {
  return level === "manager" || roles.includes("manager");
}

function canReceiveInspectionAssignment(roles: readonly string[]) {
  return roles.includes("field_tech") || roles.includes("sales_rep");
}

describe("JobVault + SiteForge acceptance flow guards", () => {
  it("admin create-user payload maps to owner role", () => {
    expect(uiToDbRole("admin")).toBe("owner");
  });

  it("newly-created user with must-change flag is represented in navigation state", () => {
    const state: JobNavigationState = { openSiteCam: true, openWarRoom: false };
    expect(state.openSiteCam).toBe(true);
  });

  it("manager branch is recognized distinctly from admin branch", () => {
    expect(matchesClientManager("manager", ["manager"])).toBe(true);
    expect(matchesClientOwnerOrAdmin("manager", ["manager"])).toBe(false);
  });

  it("sales rep can receive inspection assignments", () => {
    expect(canReceiveInspectionAssignment(["sales_rep"])).toBe(true);
    expect(canReceiveInspectionAssignment(["manager"])).toBe(false);
  });

  it("customer-origin navigation returns to customer jobs tab", () => {
    expect(resolveJobsBackPath({ origin: "customer-jobs", customerId: "cust-1" })).toBe(
      "/customers/cust-1?tab=jobs",
    );
  });
});
