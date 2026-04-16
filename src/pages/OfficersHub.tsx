import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Shield, Package, BookOpen, Phone, PhoneCall } from "lucide-react";
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
  requiredPerm?: Permission;
};

const OFFICERS_HUB_TILES: HubTile[] = [
  {
    to: "/manager",
    label: "Manager Dashboard",
    phraseKey: "nav_manager",
    Icon: Shield,
    requiredPerm: "view_all",
  },
  {
    to: "/inventory",
    label: "Arsenal",
    phraseKey: "nav_inventory",
    Icon: Package,
    requiredPerm: "view_inventory",
  },
  {
    to: "/battle-ledger",
    label: "Battle Ledger",
    phraseKey: "nav_battle_ledger",
    Icon: BookOpen,
    requiredPerm: "view_battle_ledger",
  },
  {
    to: "/lead-arsenal",
    label: "Lead Command",
    phraseKey: "nav_lead_arsenal",
    Icon: Phone,
    requiredPerm: "view_reports",
  },
  {
    to: "/call-command",
    label: "Call Command",
    phraseKey: "nav_call_command",
    Icon: PhoneCall,
  },
];

export default function OfficersHub() {
  usePageTitle("Officers Hub");
  const { can } = usePermissions();
  const visible = OFFICERS_HUB_TILES.filter((t) => !t.requiredPerm || can(t.requiredPerm));

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Officers Hub</h1>
          <p className="text-muted-foreground text-sm">Command modules — select a station</p>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No officers hub modules are available for your account.</p>
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
