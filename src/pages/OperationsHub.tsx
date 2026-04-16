import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Briefcase, DollarSign, BarChart3, TrendingUp, Camera } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageWrapper } from "@/components/PageWrapper";
import { BattleTooltip } from "@/components/BattleTooltip";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";

type HubTile = {
  to: string;
  label: string;
  phraseKey: string;
  Icon: LucideIcon;
  requiredPerm: Permission;
};

const OPERATIONS_HUB_TILES: HubTile[] = [
  {
    to: "/jobs",
    label: "Battlefield Operations",
    phraseKey: "nav_jobs",
    Icon: Briefcase,
    requiredPerm: "add_job",
  },
  {
    to: "/commissions",
    label: "Commissions",
    phraseKey: "nav_commissions",
    Icon: DollarSign,
    requiredPerm: "view_commissions",
  },
  {
    to: "/financials/mains",
    label: "Financials",
    phraseKey: "nav_financials",
    Icon: BarChart3,
    requiredPerm: "edit_financials",
  },
  {
    to: "/reports",
    label: "Intel Reports",
    phraseKey: "nav_reports",
    Icon: TrendingUp,
    requiredPerm: "view_reports",
  },
  {
    to: "/sitecam",
    label: "SiteCam",
    phraseKey: "nav_sitecam",
    Icon: Camera,
    requiredPerm: "view_sitecam",
  },
];

export default function OperationsHub() {
  usePageTitle("Operations");
  const { can } = usePermissions();
  const visible = OPERATIONS_HUB_TILES.filter((t) => can(t.requiredPerm));

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Operations</h1>
          <p className="text-muted-foreground text-sm">Mission modules — select a theater</p>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No operations modules are available for your account.</p>
        ) : (
          <ul className="flex flex-wrap gap-6">
            {visible.map((tile) => (
              <li key={tile.to}>
                <BattleTooltip phraseKey={tile.phraseKey} side="bottom">
                  <Link
                    to={tile.to}
                    className={cn(
                      "group flex max-w-[6rem] flex-col items-center gap-2 rounded-lg outline-none",
                      "ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={tile.label}
                  >
                    <span
                      className={cn(
                        "flex size-[1in] shrink-0 items-center justify-center rounded-lg border border-border bg-card",
                        "text-muted-foreground shadow-sm transition-colors",
                        "group-hover:border-primary/30 group-hover:bg-accent/50 group-hover:text-foreground",
                      )}
                    >
                      <tile.Icon className="h-7 w-7 shrink-0" aria-hidden />
                    </span>
                    <span className="max-w-[6rem] text-center text-xs font-medium leading-tight text-foreground">
                      {tile.label}
                    </span>
                  </Link>
                </BattleTooltip>
              </li>
            ))}
          </ul>
        )}
      </PageWrapper>
    </AppLayout>
  );
}
