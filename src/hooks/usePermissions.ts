import { useMemo } from "react";
import { useUserRoles } from "@/hooks/useProfile";
import { useMyProfile } from "@/hooks/useHierarchy";

export type Permission =
  | "view_all"         // See all data globally
  | "view_team"        // See team/subordinate data
  | "view_own"         // See only own data
  | "add_customer"
  | "edit_customer"
  | "delete_customer"
  | "add_job"
  | "edit_job"
  | "delete_job"
  | "add_appointment"
  | "edit_appointment"
  | "delete_appointment"
  | "manage_users"
  | "manage_settings"
  | "edit_financials"
  | "view_commissions"
  | "edit_commissions"
  | "view_production"
  | "edit_production"
  | "view_reports"
  | "view_inventory"
  | "edit_inventory"
  | "view_sitecam"
  | "edit_sitecam"
  | "view_battle_ledger";

type UserLevel = string;

/**
 * RBAC permission matrix.
 * - highest/admin/owner/office_admin: full control
 * - manager: view everything, add customers/appointments only (read-only elsewhere)
 * - lvl5-lvl2 (sales_rep/field_tech): standard rep perms
 * - lvl1 (canvasser): add customer + appointment only
 */
function resolvePermissions(level: UserLevel, roles: string[]): Set<Permission> {
  const perms = new Set<Permission>();

  const isOwnerOrAdmin =
    level === "highest" ||
    level === "admin" ||
    roles.includes("owner") ||
    roles.includes("office_admin");

  const isManager = level === "manager" || roles.includes("manager");
  const isLvl1 = level === "lvl1";

  if (isOwnerOrAdmin) {
    // Full control
    const all: Permission[] = [
      "view_all", "add_customer", "edit_customer", "delete_customer",
      "add_job", "edit_job", "delete_job",
      "add_appointment", "edit_appointment", "delete_appointment",
      "manage_users", "manage_settings",
      "edit_financials", "view_commissions", "edit_commissions",
      "view_production", "edit_production",
      "view_reports", "view_inventory", "edit_inventory",
      "view_sitecam", "edit_sitecam", "view_battle_ledger",
    ];
    all.forEach((p) => perms.add(p));
    return perms;
  }

  if (isManager) {
    // View everything, but limited edits
    perms.add("view_all");
    perms.add("add_customer");
    perms.add("add_appointment");
    perms.add("view_commissions");
    perms.add("view_production");
    perms.add("view_reports");
    perms.add("view_inventory");
    perms.add("view_sitecam");
    perms.add("view_battle_ledger");
    return perms;
  }

  if (isLvl1) {
    // Canvasser: add customer and appointment only
    perms.add("view_own");
    perms.add("add_customer");
    perms.add("add_appointment");
    return perms;
  }

  // Standard reps (lvl2-lvl5)
  perms.add("view_team");
  perms.add("add_customer");
  perms.add("edit_customer");
  perms.add("add_job");
  perms.add("edit_job");
  perms.add("add_appointment");
  perms.add("edit_appointment");
  perms.add("edit_financials");
  perms.add("view_commissions");
  perms.add("view_production");
  perms.add("edit_production");
  perms.add("view_reports");
  perms.add("view_inventory");
  perms.add("view_sitecam");
  perms.add("edit_sitecam");
  perms.add("view_battle_ledger");

  return perms;
}

export function usePermissions() {
  const { data: myProfile } = useMyProfile();
  const { data: myRoles = [] } = useUserRoles();

  const level = myProfile?.level ?? "lvl1";

  const permissions = useMemo(
    () => resolvePermissions(level, myRoles),
    [level, myRoles]
  );

  const can = (perm: Permission) => permissions.has(perm);

  const isOwnerOrAdmin =
    level === "highest" ||
    level === "admin" ||
    myRoles.includes("owner") ||
    myRoles.includes("office_admin");

  const isManager = level === "manager" || myRoles.includes("manager");
  const isLvl1 = level === "lvl1";

  return {
    can,
    permissions,
    isOwnerOrAdmin,
    isManager,
    isLvl1,
    level,
    roles: myRoles,
  };
}
