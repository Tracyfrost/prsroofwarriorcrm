import { Link, useLocation } from "react-router-dom";
import {
  Grid,
  User,
  Users,
  Briefcase,
  List,
  Hammer,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  Package,
  Camera,
  BookOpen,
  Phone,
  PhoneCall,
  Shield,
  Settings,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BattleTooltip } from "@/components/BattleTooltip";

type Permission = import("@/hooks/usePermissions").Permission;

export function SidebarNavItem({
  to,
  icon,
  label,
  phraseKey,
  requiredPerm,
  activeClass,
  isActive: active,
  onClose,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  phraseKey: string;
  requiredPerm?: Permission;
  activeClass?: string;
  isActive: boolean;
  onClose?: () => void;
}) {
  const { can } = usePermissions();
  const locked = requiredPerm ? !can(requiredPerm) : false;

  if (locked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50">
            {icon}
            {label}
            <Lock className="ml-auto h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">Access Denied — Command Restricted</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <BattleTooltip phraseKey={phraseKey} side="right">
      <Link
        to={to}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active
            ? activeClass ?? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        {icon}
        {label}
      </Link>
    </BattleTooltip>
  );
}

function useSidebarNavIsActive() {
  const location = useLocation();
  const { user } = useAuth();
  return (to: string) => {
    if (to === "/operations" || to === "/jobs")
      return location.pathname.startsWith("/operations/") || location.pathname.startsWith("/jobs");
    if (to === "/production") return location.pathname === "/production";
    if (to === "/users/me")
      return location.pathname === "/users/me" || location.pathname === `/users/${user?.id}`;
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };
}

export function MainNavList({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const isActive = useSidebarNavIsActive();

  return (
    <nav className={cn("flex-1 space-y-1 overflow-y-auto px-3 py-4", className)}>
      <SidebarNavItem
        to="/"
        icon={<Grid className="h-5 w-5" />}
        label="Command Center"
        phraseKey="nav_dashboard"
        isActive={isActive("/")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/users/me"
        icon={<User className="h-5 w-5" />}
        label="My Profile"
        phraseKey="nav_my_profile"
        isActive={isActive("/users/me")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/customers"
        icon={<Users className="h-5 w-5" />}
        label="Customers"
        phraseKey="nav_customers"
        isActive={isActive("/customers")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/jobs"
        icon={<Briefcase className="h-5 w-5" />}
        label="Operations"
        phraseKey="nav_jobs"
        requiredPerm="add_job"
        activeClass="bg-primary/10 text-primary"
        isActive={isActive("/jobs")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/jobs-only"
        icon={<List className="h-5 w-5" />}
        label="Jobs Only"
        phraseKey="nav_jobs_only"
        requiredPerm="add_job"
        isActive={isActive("/jobs-only")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/production"
        icon={<Hammer className="h-5 w-5" />}
        label="Production"
        phraseKey="nav_production"
        requiredPerm="view_production"
        isActive={isActive("/production")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/appointments"
        icon={<Calendar className="h-5 w-5" />}
        label="Deployments"
        phraseKey="nav_appointments"
        isActive={isActive("/appointments")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/commissions"
        icon={<DollarSign className="h-5 w-5" />}
        label="Commissions"
        phraseKey="nav_commissions"
        requiredPerm="view_commissions"
        isActive={isActive("/commissions")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/financials/mains"
        icon={<BarChart3 className="h-5 w-5" />}
        label="Financials"
        phraseKey="nav_financials"
        requiredPerm="edit_financials"
        isActive={isActive("/financials/mains")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/reports"
        icon={<TrendingUp className="h-5 w-5" />}
        label="Intel Reports"
        phraseKey="nav_reports"
        requiredPerm="view_reports"
        isActive={isActive("/reports")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/inventory"
        icon={<Package className="h-5 w-5" />}
        label="Arsenal"
        phraseKey="nav_inventory"
        requiredPerm="view_inventory"
        isActive={isActive("/inventory")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/sitecam"
        icon={<Camera className="h-5 w-5" />}
        label="SiteCam"
        phraseKey="nav_sitecam"
        requiredPerm="view_sitecam"
        isActive={isActive("/sitecam")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/battle-ledger"
        icon={<BookOpen className="h-5 w-5" />}
        label="Battle Ledger"
        phraseKey="nav_battle_ledger"
        requiredPerm="view_battle_ledger"
        isActive={isActive("/battle-ledger")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/lead-arsenal"
        icon={<Phone className="h-5 w-5" />}
        label="Lead Command"
        phraseKey="nav_lead_arsenal"
        requiredPerm="view_reports"
        isActive={isActive("/lead-arsenal")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/call-command"
        icon={<PhoneCall className="h-5 w-5" />}
        label="Call Command"
        phraseKey="nav_call_command"
        isActive={isActive("/call-command")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/manager"
        icon={<Shield className="h-5 w-5" />}
        label="Officer Hub"
        phraseKey="nav_manager"
        requiredPerm="view_all"
        isActive={isActive("/manager")}
        onClose={onNavigate}
      />
      <SidebarNavItem
        to="/settings"
        icon={<Settings className="h-5 w-5" />}
        label="Settings"
        phraseKey="nav_settings"
        requiredPerm="manage_settings"
        isActive={isActive("/settings")}
        onClose={onNavigate}
      />
    </nav>
  );
}
