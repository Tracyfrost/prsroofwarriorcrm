import type { LucideIcon } from "lucide-react";
import {
  Grid,
  User,
  Users,
  Briefcase,
  List,
  Hammer,
  Calendar,
  Shield,
  Settings,
} from "lucide-react";
import type { Permission } from "@/hooks/usePermissions";

export type MainNavItemDef = {
  to: string;
  label: string;
  phraseKey: string;
  Icon: LucideIcon;
  requiredPerm?: Permission;
  activeClass?: string;
  /** Omit from desktop horizontal bar; still shown in mobile sheet. */
  hideFromTopBar?: boolean;
};

export const MAIN_NAV_ITEMS: MainNavItemDef[] = [
  { to: "/", label: "Command Center", phraseKey: "nav_dashboard", Icon: Grid },
  { to: "/users/me", label: "My Profile", phraseKey: "nav_my_profile", Icon: User, hideFromTopBar: true },
  { to: "/customers", label: "Customers", phraseKey: "nav_customers", Icon: Users },
  {
    to: "/operations",
    label: "Operations",
    phraseKey: "nav_jobs",
    Icon: Briefcase,
  },
  { to: "/jobs-only", label: "Jobs Only", phraseKey: "nav_jobs_only", Icon: List, requiredPerm: "add_job" },
  { to: "/production", label: "Production", phraseKey: "nav_production", Icon: Hammer, requiredPerm: "view_production" },
  { to: "/appointments", label: "Deployments", phraseKey: "nav_appointments", Icon: Calendar },
  {
    to: "/officers-hub",
    label: "Officers Hub",
    phraseKey: "nav_officers_hub",
    Icon: Shield,
    requiredPerm: "view_all",
  },
  { to: "/settings", label: "Settings", phraseKey: "nav_settings", Icon: Settings, requiredPerm: "manage_settings" },
];

/** Primary nav items shown in the desktop horizontal bar (excludes `hideFromTopBar`). */
export const MAIN_NAV_TOP_BAR_ITEMS: MainNavItemDef[] = MAIN_NAV_ITEMS.filter((item) => !item.hideFromTopBar);
