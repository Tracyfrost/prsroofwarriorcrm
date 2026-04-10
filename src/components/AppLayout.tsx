import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { BattleTooltip } from "./BattleTooltip";
import { Menu } from "lucide-react";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MainNavList } from "@/components/sidebar/MainNavItems";
import { SidebarUserFooter } from "@/components/sidebar/SidebarUserFooter";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "prs-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const { companyName } = useWhiteLabelDefaults();

  useEffect(() => {
    setMainMenuOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleCollapsed}
        onOpenMainMenu={() => setMainMenuOpen(true)}
      />

      <Sheet open={mainMenuOpen} onOpenChange={setMainMenuOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-64 max-w-[85vw] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-64"
        >
          <SheetTitle className="sr-only">Main menu — navigation and account</SheetTitle>
          <div className="shrink-0 border-b border-sidebar-border px-4 py-3">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-sidebar-accent-foreground">
              {companyName}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Command CRM</p>
          </div>
          <MainNavList
            className="min-h-0 flex-1"
            onNavigate={() => setMainMenuOpen(false)}
          />
          <SidebarUserFooter />
        </SheetContent>
      </Sheet>

      <main
        className={cn(
          "min-w-0 flex-1 overflow-x-hidden transition-[margin] duration-200 ease-out",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] lg:hidden">
          <BattleTooltip phraseKey="open_menu">
            <button
              type="button"
              onClick={() => setMainMenuOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Open main menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </BattleTooltip>
          <span className="min-w-0 shrink font-display text-sm font-bold uppercase tracking-wide text-foreground truncate">
            {companyName}
          </span>
          <div className="ml-auto min-w-0 flex-1 max-w-[min(20rem,calc(100vw-7rem))]">
            <GlobalSearch />
          </div>
        </div>
        {/* Desktop search bar */}
        <div className="hidden h-12 min-w-0 items-center border-b border-border bg-background px-8 lg:flex lg:sticky lg:top-0 lg:z-20">
          <GlobalSearch />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </main>
    </div>
  );
}
