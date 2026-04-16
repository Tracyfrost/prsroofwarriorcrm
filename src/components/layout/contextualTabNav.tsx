import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useSidebarContextualNavMount } from "@/components/layout/SidebarContextualNav";
import { useMediaMdUp } from "@/hooks/useMediaMdUp";

/**
 * TabsList for mobile / narrow viewports: horizontal scroll only (`md:hidden` when paired with sidebar portal).
 */
export function contextualTabListClassName(className?: string) {
  return cn(
    "flex h-auto w-full min-w-0 flex-none flex-row flex-wrap items-stretch gap-1 overflow-x-hidden overflow-y-visible rounded-lg border border-border bg-muted/40 p-2",
    className,
  );
}

/**
 * TabsList mounted in the app top bar contextual strip on md+ (via ContextualTabsPortal).
 */
export function contextualTabListSidebarClassName(className?: string) {
  return cn(
    "flex h-auto w-full min-w-0 flex-none flex-row flex-wrap items-stretch gap-1 overflow-x-hidden overflow-y-visible rounded-lg border border-sidebar-border bg-sidebar-accent/10 p-2",
    className,
  );
}

/**
 * TabsTrigger classes for mobile contextual strip (touch-friendly).
 */
export function contextualTabTriggerClassName(className?: string) {
  return cn(
    "shrink-0 justify-center px-3 py-2.5 text-sm font-medium min-h-[44px]",
    className,
  );
}

/**
 * TabsTrigger classes for top-bar portaled tab lists (md+).
 */
export function contextualTabTriggerSidebarClassName(className?: string) {
  return cn(
    "shrink-0 justify-center px-3 py-2.5 text-sm font-medium min-h-10 min-w-0 rounded-md whitespace-nowrap",
    className,
  );
}

/**
 * Primary job tabs (Operations / JobDetail) portaled under the header on md+ — horizontal royal blue bar.
 */
export function jobPageHorizontalPrimaryTabsListClassName(className?: string) {
  return cn(
    "flex h-auto w-full min-w-0 flex-none flex-row flex-wrap items-stretch gap-1 overflow-x-auto overflow-y-visible rounded-xl border border-blue-950/25 bg-[#4169E1] p-2 shadow-sm",
    className,
  );
}

/**
 * Triggers for {@link jobPageHorizontalPrimaryTabsListClassName}: white labels on blue; active encased cream/amber pill.
 */
export function jobPageHorizontalPrimaryTabsTriggerClassName(className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border-2 border-transparent px-3 py-2.5 text-sm font-medium text-white/90 shadow-none transition-colors min-h-10",
    "hover:bg-white/10 hover:text-white",
    "data-[state=active]:border-amber-400 data-[state=active]:bg-amber-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-md",
    "dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-amber-50",
    className,
  );
}

/** Renders children into the app top bar contextual slot on md+ (React tree stays under parent `Tabs`). */
export function ContextualTabsPortal({ children }: { children: React.ReactNode }) {
  const mount = useSidebarContextualNavMount();
  const mdUp = useMediaMdUp();
  if (!mount || !mdUp) return null;
  return createPortal(children, mount);
}
