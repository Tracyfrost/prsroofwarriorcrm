import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, BarChart3, Gauge } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { UserProfileKpis } from "@/hooks/useUserProfileKpis";
import type { AccountHealth } from "@/lib/operatorScore";
import { UserProfileAvatar } from "./UserProfileAvatar";
import { formatAuditActionLabel } from "./auditLabels";

type AuditRow = Tables<"audits">;
type Profile = Tables<"profiles">;

function KpiItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2 min-w-[120px] flex-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function UserProfilePerformanceZone({
  profile,
  kpis,
  kpisLoading,
  audits,
  auditsLoading,
  operatorScore,
  accountHealth,
}: {
  profile: Profile;
  kpis: UserProfileKpis | undefined;
  kpisLoading: boolean;
  audits: AuditRow[];
  auditsLoading: boolean;
  operatorScore: number;
  accountHealth: AccountHealth;
}) {
  const healthLabel =
    accountHealth === "strong" ? "Healthy" : accountHealth === "ok" ? "Fair" : "Needs attention";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Activity &amp; performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={accountHealth === "attention" ? "destructive" : accountHealth === "ok" ? "secondary" : "default"}
            >
              Account: {healthLabel}
            </Badge>
            <Badge variant="outline" className="gap-1 tabular-nums">
              <Gauge className="h-3 w-3" />
              Operator {operatorScore}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">KPI strip</p>
          {kpisLoading ? (
            <p className="text-sm text-muted-foreground">Loading metrics…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <KpiItem label="Jobs closed (mo)" value={String(kpis?.jobsClosedThisMonth ?? 0)} />
              <KpiItem
                label="Pipeline ACV"
                value={
                  kpis != null && kpis.pipelineAcv > 0 ? `$${Math.round(kpis.pipelineAcv).toLocaleString()}` : "—"
                }
              />
              <KpiItem
                label="Pending commissions"
                value={
                  kpis != null && kpis.pendingCommissions > 0
                    ? `$${Math.round(kpis.pendingCommissions).toLocaleString()}`
                    : "—"
                }
              />
              <KpiItem
                label="Assigned leads"
                value={String(kpis?.followUpsDue ?? 0)}
                sub="Open assignments"
              />
              <KpiItem
                label="Response time"
                value={kpis?.responseTimeHours != null ? `${kpis.responseTimeHours}h` : "—"}
                sub={kpis?.stubs.responseTime ? "Not tracked yet" : undefined}
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Timeline
          </p>
          {auditsLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {audits.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <UserProfileAvatar
                    profile={{ name: profile.name, profile_picture_url: profile.profile_picture_url, user_id: profile.user_id }}
                    className="h-8 w-8 rounded-full shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground">
                      {formatAuditActionLabel(a.action, a.entity_type, a.details)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
