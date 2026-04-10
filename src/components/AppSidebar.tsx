import { Menu, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { cn } from "@/lib/utils";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { BattleTooltip } from "@/components/BattleTooltip";
import { MainNavList } from "@/components/sidebar/MainNavItems";
import { SidebarUserFooter } from "@/components/sidebar/SidebarUserFooter";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMainMenu: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed, onOpenMainMenu }: AppSidebarProps) {
  const { companyName, logoUrl } = useWhiteLabelDefaults();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 hidden h-screen flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out pt-[env(safe-area-inset-top)] lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + controls */}
      <div
        className={cn(
          "flex shrink-0 border-b border-sidebar-border",
          collapsed ? "flex-col items-center gap-2 px-1 py-3" : "h-16 items-center gap-2 px-2 pl-3"
        )}
      >
        <BattleTooltip phraseKey="open_menu" side="right">
          <button
            type="button"
            onClick={onOpenMainMenu}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Open main menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </BattleTooltip>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={`${companyName} logo`} className="h-8 w-8 shrink-0 rounded-md object-contain" />
            ) : (
              <KnotShieldLogo size={34} className="shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="truncate font-display text-sm font-bold uppercase tracking-wide text-sidebar-accent-foreground">
                {companyName}
              </h1>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Command CRM</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <KnotShieldLogo size={28} />
            )}
          </div>
        )}

        <BattleTooltip phraseKey={collapsed ? "expand_sidebar" : "collapse_sidebar"} side="right">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "mt-0.5" : "shrink-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </BattleTooltip>
      </div>

      {!collapsed && <MainNavList />}

      <SidebarUserFooter compact={collapsed} />
    </aside>
  );
}
