import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllProductionItems } from "@/hooks/useProduction";
import { Briefcase, HardHat, Calendar, AlertTriangle, DollarSign } from "lucide-react";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { Link } from "react-router-dom";

export default function ManagerDashboard() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["manager-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*, customers(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: productionItems = [] } = useAllProductionItems();

  // Job status counts
  const jobsByStatus = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  // Production queue by trade
  const queueByTrade = productionItems
    .filter((i) => ["ready", "scheduled", "in_progress"].includes(i.status))
    .reduce<Record<string, number>>((acc, i) => {
      const name = i.trade_types?.name || "Other";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  // Upcoming installs (items with scheduled_start_date within next 30 days)
  const now = new Date();
  const upcoming7 = productionItems.filter(
    (i) => i.scheduled_start_date && isBefore(new Date(i.scheduled_start_date), addDays(now, 7)) && isAfter(new Date(i.scheduled_start_date), now)
  );
  const upcoming14 = productionItems.filter(
    (i) => i.scheduled_start_date && isBefore(new Date(i.scheduled_start_date), addDays(now, 14)) && isAfter(new Date(i.scheduled_start_date), now)
  );
  const upcoming30 = productionItems.filter(
    (i) => i.scheduled_start_date && isBefore(new Date(i.scheduled_start_date), addDays(now, 30)) && isAfter(new Date(i.scheduled_start_date), now)
  );

  // Bottlenecks
  const onHold = productionItems.filter((i) => i.status === "on_hold").length;
  const draftItems = productionItems.filter((i) => i.status === "draft").length;

  // Production margin snapshot
  const totalRevenue = jobs.reduce((s, j) => s + ((j.financials as any)?.acv ?? 0), 0);
  const totalProductionCost = productionItems.reduce((s, i) => s + (i.labor_cost || 0) + (i.material_cost || 0), 0);
  const margin = totalRevenue > 0 ? ((totalRevenue - totalProductionCost) / totalRevenue * 100) : 0;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground text-sm">Team overview, production queue, and financial snapshot</p>
        </div>

        {/* Top row KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
                </div>
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Production</p>
                  <p className="text-2xl font-bold text-foreground">
                    {productionItems.filter((i) => ["ready", "scheduled", "in_progress"].includes(i.status)).length}
                  </p>
                </div>
                <HardHat className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Installs (7 days)</p>
                  <p className="text-2xl font-bold text-foreground">{upcoming7.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-2xl font-bold text-foreground">{margin.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">${totalRevenue.toLocaleString()} rev − ${totalProductionCost.toLocaleString()} cost</p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Jobs by Status */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm">Jobs by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(jobsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs capitalize">{status}</Badge>
                    <span className="font-mono text-sm font-bold">{count}</span>
                  </div>
                ))}
              </div>
              <Link to="/jobs" className="text-xs text-accent mt-3 block hover:underline">View all jobs →</Link>
            </CardContent>
          </Card>

          {/* Production Queue by Trade */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm">Production Queue by Trade</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(queueByTrade).map(([trade, count]) => (
                  <div key={trade} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{trade}</span>
                    <span className="font-mono text-sm font-bold">{count}</span>
                  </div>
                ))}
                {Object.keys(queueByTrade).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No active production</p>
                )}
              </div>
              <Link to="/production" className="text-xs text-accent mt-3 block hover:underline">View production board →</Link>
            </CardContent>
          </Card>

          {/* Upcoming Installs */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Upcoming Installs</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcoming7.length}</p>
                  <p className="text-xs text-muted-foreground">7 days</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcoming14.length}</p>
                  <p className="text-xs text-muted-foreground">14 days</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcoming30.length}</p>
                  <p className="text-xs text-muted-foreground">30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Bottlenecks</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">On Hold</span>
                  <Badge variant={onHold > 0 ? "destructive" : "outline"}>{onHold}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Draft (not started)</span>
                  <Badge variant={draftItems > 3 ? "destructive" : "outline"}>{draftItems}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
