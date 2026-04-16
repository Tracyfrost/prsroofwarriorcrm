import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SidebarContextualNavContextValue = {
  mountNode: HTMLElement | null;
  setMountRef: (el: HTMLElement | null) => void;
};

const SidebarContextualNavContext = createContext<SidebarContextualNavContextValue | null>(null);

export function SidebarContextualNavProvider({ children }: { children: ReactNode }) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const setMountRef = useCallback((el: HTMLElement | null) => {
    setMountNode(el);
  }, []);
  const value = useMemo(() => ({ mountNode, setMountRef }), [mountNode, setMountRef]);
  return (
    <SidebarContextualNavContext.Provider value={value}>{children}</SidebarContextualNavContext.Provider>
  );
}

/** Portal target for page-level tab lists on md+; null if outside provider or before mount. */
export function useSidebarContextualNavMount(): HTMLElement | null {
  return useContext(SidebarContextualNavContext)?.mountNode ?? null;
}

export function SidebarContextualNavMountPoint() {
  const ctx = useContext(SidebarContextualNavContext);
  if (!ctx) return null;
  return (
    <div
      ref={ctx.setMountRef}
      className="hidden min-h-0 w-full flex-col gap-1 empty:hidden [&:empty]:hidden md:flex md:flex-row md:flex-wrap md:items-stretch md:overflow-x-hidden md:border-t md:border-border/60 md:bg-transparent md:px-2 md:py-2"
      data-sidebar-contextual-slot
      aria-live="polite"
    />
  );
}
