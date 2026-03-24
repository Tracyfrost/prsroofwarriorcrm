// MOBILE-PORT-READY – maps 1:1 to React Native
import { useMasterLeads, useCallLogs } from "@/hooks/useCallSetter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, CalendarCheck, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { startOfWeek, startOfDay, isAfter } from "date-fns";

export function SetterPerformanceTab() {
  const { user } = useAuth();
  const { isOwnerOrAdmin, isManager } = usePermissions();
  const canViewAll = isOwnerOrAdmin || isManager;
  const { data: allLeads = [] } = useMasterLeads(false);
  const { data: callLogs = [] } = useCallLogs();

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-perf"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, name, level").eq("active", true);
      return data ?? [];
    },
  });

  // Compute metrics per setter
  const setterIds = canViewAll
    ? [...new Set(allLeads.map((l) => l.assigned_setter_id).filter(Boolean) as string[])]
    : user?.id ? [user.id] : [];

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(new Date());

  const metrics = setterIds.map((sid) => {
    const myLeads = allLeads.filter((l) => l.assigned_setter_id === sid);
    const myCalls = callLogs.filter((c) => c.setter_id === sid);
    const callsToday = myCalls.filter((c) => isAfter(new Date(c.call_time), today)).length;
    const callsWeek = myCalls.filter((c) => isAfter(new Date(c.call_time), weekStart)).length;
    const apptsSet = myLeads.filter((l) => l.status === "appointment_set" || l.status === "converted").length;
    const converted = myLeads.filter((l) => l.status === "converted").length;
    const qualified = myLeads.filter((l) => l.is_qualified).length;
    const conversionRate = myLeads.length > 0 ? Math.round((apptsSet / myLeads.length) * 100) : 0;
    const profile = profiles.find((p) => p.user_id === sid);

    return {
      setterId: sid,
      name: profile?.name || "Unknown",
      totalLeads: myLeads.length,
      callsToday,
      callsWeek,
      apptsSet,
      converted,
      qualified,
      conversionRate,
    };
  });

  // Summary cards for own performance
  const myMetrics = metrics.find((m) => m.setterId === user?.id);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {myMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Phone className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{myMetrics.callsToday}</p>
                <p className="text-xs text-muted-foreground">Calls Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{myMetrics.apptsSet}</p>
                <p className="text-xs text-muted-foreground">Appts Set</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Target className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{myMetrics.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{myMetrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conquest Progress */}
      {myMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calls to Conquest</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={myMetrics.totalLeads > 0 ? (myMetrics.apptsSet / myMetrics.totalLeads) * 100 : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{myMetrics.apptsSet}/{myMetrics.totalLeads} leads conquered</p>
          </CardContent>
        </Card>
      )}

      {/* Team Performance Table */}
      {canViewAll && metrics.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setter</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Calls (Week)</TableHead>
                <TableHead className="text-center">Appts</TableHead>
                <TableHead className="text-center">Qualified</TableHead>
                <TableHead className="text-center">Conv %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.setterId}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-center">{m.totalLeads}</TableCell>
                  <TableCell className="text-center">{m.callsWeek}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-600/20 text-green-400">{m.apptsSet}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{m.qualified}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{m.conversionRate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
