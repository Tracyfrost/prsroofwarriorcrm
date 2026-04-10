import { LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProfile, LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BattleTooltip } from "@/components/BattleTooltip";

export function SidebarUserFooter({ compact = false }: { compact?: boolean }) {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: myProfile } = useMyProfile();
  const { data: subscription } = useSubscription();
  const levelConfig = LEVEL_CONFIG[myProfile?.level ?? "lvl1"] || LEVEL_CONFIG.lvl1;
  const tier = subscription?.tier ?? "free";

  return (
    <div className="border-t border-sidebar-border">
      <div
        className={cn(
          "flex items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
          compact ? "flex-col px-2 py-3" : "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
          <UserCircle className="h-5 w-5 text-sidebar-foreground" />
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {profile?.name || "Operator"}
            </p>
            <div className="flex items-center gap-2">
              <p className="truncate text-xs text-sidebar-muted">
                {levelConfig.badge} {levelConfig.label}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px]",
                  tier === "enterprise" && "bg-gradient-accent text-accent-foreground",
                  tier === "pro" && "border-primary/50 bg-primary/20 text-primary",
                  tier === "free" && "border-muted/50 bg-muted/20 text-muted-foreground"
                )}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Badge>
            </div>
          </div>
        )}
        <BattleTooltip phraseKey="sign_out" side="right">
          <button
            type="button"
            onClick={signOut}
            className={cn(
              "rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              compact && "mt-1"
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </BattleTooltip>
      </div>
    </div>
  );
}
