import { Link, useLocation } from "react-router-dom";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BattleTooltip } from "@/components/BattleTooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { MAIN_NAV_ITEMS, MAIN_NAV_TOP_BAR_ITEMS, type MainNavItemDef } from "@/config/mainNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Permission = import("@/hooks/usePermissions").Permission;

const TOP_NAV_GAP_PX = 4;
const NAV_ICON = "h-4 w-4 shrink-0";

function maxVisibleNavItems(widths: number[], viewportWidth: number, gap: number): number {
  const n = widths.length;
  if (n === 0 || viewportWidth <= 0) return 0;
  for (let k = n; k >= 0; k--) {
    const itemsSum = widths.slice(0, k).reduce((a, b) => a + b, 0);
    const gapsSum = k > 1 ? (k - 1) * gap : 0;
    if (itemsSum + gapsSum <= viewportWidth) return k;
  }
  return 0;
}

function useSidebarNavIsActive() {
  const location = useLocation();
  const { user } = useAuth();
  return useCallback(
    (to: string) => {
      if (to === "/operations") {
        const p = location.pathname;
        if (p === "/operations") return true;
        if (p.startsWith("/operations/")) return true;
        if (p === "/jobs" || p.startsWith("/jobs/")) return true;
        if (p.startsWith("/commissions")) return true;
        if (p.startsWith("/financials")) return true;
        if (p.startsWith("/reports")) return true;
        if (p.startsWith("/sitecam")) return true;
        return false;
      }
      if (to === "/officers-hub") {
        const p = location.pathname;
        return (
          p === "/officers-hub" ||
          p === "/manager" ||
          p === "/inventory" ||
          p === "/battle-ledger" ||
          p === "/lead-arsenal" ||
          p === "/call-command"
        );
      }
      if (to === "/production") return location.pathname === "/production";
      if (to === "/users/me")
        return location.pathname === "/users/me" || location.pathname === `/users/${user?.id}`;
      if (to === "/") return location.pathname === "/";
      return location.pathname.startsWith(to);
    },
    [location.pathname, user?.id],
  );
}

function TopNavBarFace({
  item,
  active,
}: {
  item: MainNavItemDef;
  active: boolean;
}) {
  const { can } = usePermissions();
  const Icon = item.Icon;
  const locked = item.requiredPerm ? !can(item.requiredPerm) : false;

  if (locked) {
    return (
      <div
        className={cn(
          "flex cursor-not-allowed select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground/50 md:text-sm",
        )}
      >
        <Icon className={NAV_ICON} />
        <span className="whitespace-nowrap">{item.label}</span>
        <Lock className="h-3 w-3 shrink-0" />
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 md:text-sm",
        active
          ? item.activeClass ?? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={NAV_ICON} />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

function TopNavBarItem({
  item,
  isActive,
}: {
  item: MainNavItemDef;
  isActive: boolean;
}) {
  const { can } = usePermissions();
  const locked = item.requiredPerm ? !can(item.requiredPerm) : false;

  const face = <TopNavBarFace item={item} active={isActive} />;

  if (locked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">{face}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Access Denied — Command Restricted</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <BattleTooltip phraseKey={item.phraseKey} side="bottom">
      <span className="inline-flex shrink-0">{face}</span>
    </BattleTooltip>
  );
}

/** Desktop horizontal primary nav with overflow → More menu. */
export function MainNavTopBar() {
  const isActive = useSidebarNavIsActive();
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLButtonElement>(null);
  const [visibleCount, setVisibleCount] = useState(MAIN_NAV_TOP_BAR_ITEMS.length);

  const recompute = useCallback(() => {
    const viewport = viewportRef.current;
    const measureRow = measureRowRef.current;
    if (!viewport || !measureRow) return;

    const widths = [...measureRow.children].map((ch) => (ch as HTMLElement).getBoundingClientRect().width);
    const vw = viewport.getBoundingClientRect().width;
    const kAll = maxVisibleNavItems(widths, vw, TOP_NAV_GAP_PX);

    if (kAll >= MAIN_NAV_TOP_BAR_ITEMS.length) {
      setVisibleCount(MAIN_NAV_TOP_BAR_ITEMS.length);
      return;
    }

    const moreW = moreMeasureRef.current?.getBoundingClientRect().width ?? 88;
    // k items + k gaps (before More) + moreW ≤ viewport width
    const withMoreBudget = vw - moreW - TOP_NAV_GAP_PX;
    const kWithMore = maxVisibleNavItems(widths, Math.max(0, withMoreBudget), TOP_NAV_GAP_PX);
    setVisibleCount(kWithMore);
  }, []);

  useLayoutEffect(() => {
    recompute();
    const viewport = viewportRef.current;
    const measureRow = measureRowRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(viewport);
    if (measureRow) ro.observe(measureRow);
    return () => ro.disconnect();
  }, [recompute]);

  useLayoutEffect(() => {
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recompute]);

  const visible = MAIN_NAV_TOP_BAR_ITEMS.slice(0, visibleCount);
  const overflow = MAIN_NAV_TOP_BAR_ITEMS.slice(visibleCount);
  const overflowActive = overflow.some((item) => isActive(item.to));

  return (
    <div className="relative hidden w-full min-w-0 md:block">
      {/* Off-DOM width probe — matches bar link styling */}
      <div
        ref={measureRowRef}
        className="pointer-events-none fixed left-0 top-0 z-[-1] flex w-max flex-nowrap gap-1 opacity-0"
        aria-hidden
      >
        {MAIN_NAV_TOP_BAR_ITEMS.map((item) => (
          <div key={item.to} className="inline-flex shrink-0">
            <span className="inline-flex shrink-0">
              <TopNavBarFace item={item} active={false} />
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        ref={moreMeasureRef}
        className="pointer-events-none fixed left-0 top-0 z-[-1] inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-sidebar-border bg-sidebar px-2 text-sm font-medium opacity-0"
        aria-hidden
        tabIndex={-1}
      >
        More
        <ChevronDown className="h-4 w-4" />
      </button>

      <div className="flex w-full min-w-0 items-center gap-1 border-t border-sidebar-border bg-sidebar px-2 py-1.5 text-sidebar-foreground">
        <div
          ref={viewportRef}
          className="flex min-h-9 min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-hidden"
        >
          {visible.map((item) => (
            <TopNavBarItem key={item.to} item={item} isActive={isActive(item.to)} />
          ))}
        </div>
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 shrink-0 gap-1 border-sidebar-border bg-sidebar-accent/20 text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                  overflowActive && "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                More
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[min(70vh,24rem)] w-56 overflow-y-auto">
              {overflow.map((item) => (
                <TopNavOverflowMenuItem key={item.to} item={item} isActive={isActive(item.to)} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function TopNavOverflowMenuItem({ item, isActive }: { item: MainNavItemDef; isActive: boolean }) {
  const { can } = usePermissions();
  const Icon = item.Icon;
  const locked = item.requiredPerm ? !can(item.requiredPerm) : false;

  if (locked) {
    return (
      <DropdownMenuItem disabled className="gap-2 opacity-60">
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
        <Lock className="ml-auto h-3 w-3" />
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem asChild className={cn(isActive && "bg-accent")}>
      <Link
        to={item.to}
        className={cn("flex cursor-pointer items-center gap-2", isActive && "font-medium text-primary")}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    </DropdownMenuItem>
  );
}

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
  icon: ReactNode;
  label: string;
  phraseKey: string;
  requiredPerm?: Permission;
  activeClass?: string;
  isActive: boolean;
  onClose?: () => void;
}) {
  const { can } = usePermissions();
  const { state, isMobile } = useSidebar();
  const collapsedDesktop = state === "collapsed" && !isMobile;
  const locked = requiredPerm ? !can(requiredPerm) : false;

  if (locked) {
    const lockedInner = (
      <div
        className={cn(
          "flex min-h-[44px] cursor-not-allowed select-none items-center font-medium text-muted-foreground/50",
          "gap-3 rounded-lg px-3 py-2.5 text-sm",
          collapsedDesktop && "justify-center px-2",
        )}
      >
        {icon}
        <span className={cn("whitespace-nowrap", collapsedDesktop && "sr-only")}>{label}</span>
        <Lock className={cn("h-3 w-3", collapsedDesktop ? "sr-only" : "ml-auto")} />
      </div>
    );
    if (collapsedDesktop) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{lockedInner}</TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Access Denied — Command Restricted</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return lockedInner;
  }

  const link = (
    <Link
      to={to}
      onClick={onClose}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        collapsedDesktop && "justify-center px-2",
        active
          ? activeClass ?? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      {icon}
      <span className={cn(!collapsedDesktop && "truncate", collapsedDesktop && "sr-only")}>{label}</span>
    </Link>
  );

  if (collapsedDesktop) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <BattleTooltip phraseKey={phraseKey} side="right">
      {link}
    </BattleTooltip>
  );
}

const navIcon = "h-5 w-5 shrink-0";

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
      {MAIN_NAV_ITEMS.map((item) => {
        const Icon = item.Icon;
        return (
          <SidebarNavItem
            key={item.to}
            to={item.to}
            icon={<Icon className={navIcon} />}
            label={item.label}
            phraseKey={item.phraseKey}
            requiredPerm={item.requiredPerm}
            activeClass={item.activeClass}
            isActive={isActive(item.to)}
            onClose={onNavigate}
          />
        );
      })}
    </nav>
  );
}
