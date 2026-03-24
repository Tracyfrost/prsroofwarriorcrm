import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { BattleTooltip } from "./BattleTooltip";
import { Menu } from "lucide-react";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { companyName } = useWhiteLabelDefaults();

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] lg:hidden">
          <BattleTooltip phraseKey="open_menu">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
          </BattleTooltip>
          <span className="font-display text-sm font-bold uppercase tracking-wide text-foreground">{companyName}</span>
          <div className="ml-auto">
            <GlobalSearch />
          </div>
        </div>
        {/* Desktop search bar */}
        <div className="hidden lg:flex sticky top-0 z-20 h-12 items-center border-b border-border bg-background px-8">
          <GlobalSearch />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </main>
    </div>
  );
}
