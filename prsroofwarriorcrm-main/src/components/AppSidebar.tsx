import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, UserCircle, Briefcase, Calendar, DollarSign, BarChart3, Package, Hammer, ClipboardList, X, Layers, Camera, FileSpreadsheet, Lock, ListChecks, Swords, PhoneCall } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProfile, LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { useSubscription } from "@/hooks/useSubscription";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BattleTooltip } from "@/components/BattleTooltip";

type Permission = import("@/hooks/usePermissions").Permission;

const navItems: { to: string; icon: any; label: string; requiredPerm?: Permission; phraseKey: string }[] = [
  { to: "/", icon: LayoutDashboard, label: "Command Center", phraseKey: "nav_dashboard" },
  { to: "/users/me", icon: UserCircle, label: "My Profile", phraseKey: "nav_my_profile" },
  { to: "/customers", icon: Users, label: "Customers", phraseKey: "nav_customers" },
  { to: "/jobs", icon: Briefcase, label: "Operations", requiredPerm: "add_job", phraseKey: "nav_jobs" },
  { to: "/jobs-only", icon: ListChecks, label: "Jobs Only", requiredPerm: "add_job", phraseKey: "nav_jobs_only" },
  { to: "/financials/mains", icon: Layers, label: "Financials", requiredPerm: "edit_financials", phraseKey: "nav_financials" },
  { to: "/production", icon: Hammer, label: "Production", requiredPerm: "view_production", phraseKey: "nav_production" },
  { to: "/appointments", icon: Calendar, label: "Deployments", phraseKey: "nav_appointments" },
  { to: "/commissions", icon: DollarSign, label: "Commissions", requiredPerm: "view_commissions", phraseKey: "nav_commissions" },
  { to: "/reports", icon: BarChart3, label: "Intel Reports", requiredPerm: "view_reports", phraseKey: "nav_reports" },
  { to: "/inventory", icon: Package, label: "Arsenal", requiredPerm: "view_inventory", phraseKey: "nav_inventory" },
  { to: "/sitecam", icon: Camera, label: "SiteCam", requiredPerm: "view_sitecam", phraseKey: "nav_sitecam" },
  { to: "/battle-ledger", icon: FileSpreadsheet, label: "Battle Ledger", requiredPerm: "view_battle_ledger", phraseKey: "nav_battle_ledger" },
  { to: "/lead-arsenal", icon: Swords, label: "Lead Command", requiredPerm: "view_reports", phraseKey: "nav_lead_arsenal" },
  { to: "/call-command", icon: PhoneCall, label: "Call Command", phraseKey: "nav_call_command" },
  { to: "/manager", icon: ClipboardList, label: "Officer Hub", requiredPerm: "view_all", phraseKey: "nav_manager" },
  { to: "/settings", icon: Settings, label: "Settings", requiredPerm: "manage_settings", phraseKey: "nav_settings" },
];

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: myProfile } = useMyProfile();
  const { data: subscription } = useSubscription();
  const { companyName, logoUrl } = useWhiteLabelDefaults();
  const { can } = usePermissions();
  const levelConfig = LEVEL_CONFIG[myProfile?.level ?? "lvl1"] || LEVEL_CONFIG.lvl1;
  const tier = subscription?.tier ?? "free";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 pt-[env(safe-area-inset-top)]",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={`${companyName} logo`} className="h-8 w-8 rounded-md object-contain" />
          ) : (
            <KnotShieldLogo size={34} />
          )}
          <div>
            <h1 className="font-display text-sm font-bold uppercase tracking-wide text-sidebar-accent-foreground">
              {companyName}
            </h1>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">
              Command CRM
            </p>
          </div>
        </div>
        <BattleTooltip phraseKey="close_sidebar" side="right">
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </BattleTooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== "/" && item.to !== "/users/me" && location.pathname.startsWith(item.to + "/")) ||
            (item.to === "/users/me" && (location.pathname === "/users/me" || location.pathname === `/users/${user?.id}`));
          const locked = item.requiredPerm ? !can(item.requiredPerm) : false;

          if (locked) {
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none">
                    <item.icon className="h-4.5 w-4.5" />
                    {item.label}
                    <Lock className="h-3 w-3 ml-auto" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">Access Denied — Command Restricted</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <BattleTooltip key={item.to} phraseKey={item.phraseKey} side="right">
              <Link
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            </BattleTooltip>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
            <UserCircle className="h-5 w-5 text-sidebar-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {profile?.name || "Operator"}
            </p>
            <div className="flex items-center gap-2">
              <p className="truncate text-xs text-sidebar-muted">
                {levelConfig.badge} {levelConfig.label}
              </p>
              <Badge variant="outline" className={cn(
                "text-[10px] shrink-0",
                tier === "enterprise" && "bg-gradient-accent text-accent-foreground",
                tier === "pro" && "bg-primary/20 text-primary border-primary/50",
                tier === "free" && "bg-muted/20 text-muted-foreground border-muted/50"
              )}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Badge>
            </div>
          </div>
          <BattleTooltip phraseKey="sign_out" side="right">
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </BattleTooltip>
        </div>
      </div>
    </aside>
  );
}
