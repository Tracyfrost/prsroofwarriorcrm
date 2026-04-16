import { Link } from "react-router-dom";
import { LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProfile, LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNavAccountMenu() {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: myProfile } = useMyProfile();
  const { data: subscription } = useSubscription();
  const levelConfig = LEVEL_CONFIG[myProfile?.level ?? "lvl1"] || LEVEL_CONFIG.lvl1;
  const tier = subscription?.tier ?? "free";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground transition-colors hover:bg-muted"
          aria-label="Account menu"
        >
          <UserCircle className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{profile?.name || "Operator"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <p className="text-xs text-muted-foreground">
              {levelConfig.badge} {levelConfig.label}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                tier === "enterprise" && "bg-gradient-accent text-accent-foreground",
                tier === "pro" && "border-primary/50 bg-primary/20 text-primary",
                tier === "free" && "border-muted/50 bg-muted/20 text-muted-foreground",
              )}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/users/me">My profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void signOut();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
