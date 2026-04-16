import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BattleTooltip } from "@/components/BattleTooltip";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { TopNavAccountMenu } from "@/components/sidebar/TopNavAccountMenu";
import { MainNavTopBar } from "@/components/sidebar/MainNavItems";
import { SidebarContextualNavMountPoint } from "@/components/layout/SidebarContextualNav";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function AppTopNav() {
  const { companyName, logoUrl } = useWhiteLabelDefaults();
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top)]",
        "supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm",
      )}
    >
      <div className="flex h-12 min-h-12 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {isMobile ? (
          <BattleTooltip phraseKey="open_menu" side="bottom">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              onClick={() => toggleSidebar()}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </BattleTooltip>
        ) : null}

        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
          ) : (
            <KnotShieldLogo size={32} className="shrink-0" />
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-display text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
              {companyName}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Command CRM</p>
          </div>
        </Link>

        <div className="min-w-0 flex-1 md:max-w-xs md:flex-none lg:max-w-md">
          <GlobalSearch />
        </div>

        <TopNavAccountMenu />
      </div>

      <MainNavTopBar />
      <SidebarContextualNavMountPoint />
    </header>
  );
}
