// MOBILE-PORT: Maps to React Native FlatList with performance cards
import { Users, CheckCircle, XCircle, Shield, ShieldAlert } from "lucide-react";
import { useRepLeadMetrics, useDistributionRules } from "@/hooks/useLeadArsenal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RepPerformanceTab() {
  const metrics = useRepLeadMetrics();
  const { data: rules } = useDistributionRules();
  const minRequired = rules?.min_contracts_required ?? 4;

  const { data: profiles } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .is("deleted_at", null)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const getName = (uid: string) => profiles?.find((p) => p.user_id === uid)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Rep Lead Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Dead</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Gating Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.rep_id}>
                  <TableCell className="font-medium">{getName(m.rep_id)}</TableCell>
                  <TableCell className="text-right">{m.total_assigned}</TableCell>
                  <TableCell className="text-right">{m.total_converted}</TableCell>
                  <TableCell className="text-right">{m.total_dead}</TableCell>
                  <TableCell>
                    <span className="text-sm">{(m.conversion_ratio * 100).toFixed(1)}%</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress
                        value={Math.min((m.total_converted / minRequired) * 100, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {m.total_converted}/{minRequired}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.eligible ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/40 gap-1">
                        <Shield className="h-3 w-3" /> Eligible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/40 gap-1">
                        <ShieldAlert className="h-3 w-3" /> Locked
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {metrics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No lead assignment data yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden space-y-2 p-3">
          {metrics.map((m) => (
            <div key={m.rep_id} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">{getName(m.rep_id)}</p>
                {m.eligible ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/40 text-xs gap-1">
                    <Shield className="h-3 w-3" /> Eligible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-xs gap-1">
                    <ShieldAlert className="h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center"><span className="text-muted-foreground block">Assigned</span><strong>{m.total_assigned}</strong></div>
                <div className="text-center"><span className="text-muted-foreground block">Converted</span><strong>{m.total_converted}</strong></div>
                <div className="text-center"><span className="text-muted-foreground block">Rate</span><strong>{(m.conversion_ratio * 100).toFixed(0)}%</strong></div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min((m.total_converted / minRequired) * 100, 100)} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground">{m.total_converted}/{minRequired}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
