import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, DollarSign, Clock, RotateCcw, AlertTriangle, Star } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import type { CustomerJob } from "@/hooks/useCustomer";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(40, 85%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(270, 55%, 55%)",
];

interface Props {
  jobs: CustomerJob[];
  appointments: any[];
  customerCreatedAt: string;
}

export function CustomerAnalyticsTab({ jobs, appointments, customerCreatedAt }: Props) {
  const analytics = useMemo(() => {
    const jobData = jobs.map((j) => {
      const fin = j.financials as any;
      const checks = j.payment_checks ?? [];
      const acv = Number(fin?.acv || 0);
      const rcv = Number(fin?.rcv || 0);
      const depreciation = rcv - acv;
      const checksReceived = checks
        .filter((c) => c.status !== "Disputed")
        .reduce((s, c) => s + Number(c.amount || 0), 0);
      const dates = j.dates as any;

      // Cycle time: created_at to completed (or now)
      let cycleTimeDays: number | null = null;
      if (j.status === "completed" || j.status === "closed") {
        const end = dates?.end ? parseISO(dates.end) : new Date(j.updated_at);
        cycleTimeDays = differenceInDays(end, new Date(j.created_at));
      }

      return {
        ...j, acv, rcv, depreciation, checksReceived, cycleTimeDays,
        month: format(new Date(j.created_at), "MMM yyyy"),
      };
    });

    const totalRevenue = jobData.reduce((s, j) => s + j.rcv, 0);
    const totalAcv = jobData.reduce((s, j) => s + j.acv, 0);
    const totalChecks = jobData.reduce((s, j) => s + j.checksReceived, 0);
    const avgJobValue = jobData.length > 0 ? totalRevenue / jobData.length : 0;
    const completedJobs = jobData.filter((j) => j.cycleTimeDays !== null);
    const avgCycleTime = completedJobs.length > 0
      ? Math.round(completedJobs.reduce((s, j) => s + (j.cycleTimeDays ?? 0), 0) / completedJobs.length)
      : null;

    // CLV = total revenue + projected (20% of avg * count factor)
    const clv = totalRevenue + (jobData.length > 1 ? avgJobValue * 0.2 * jobData.length : 0);

    // Repeat rate
    const repeatRate = jobData.length > 1 ? ((jobData.length - 1) / jobData.length * 100) : 0;

    // Churn risk: no activity in 90+ days
    const lastActivity = [...jobs.map(j => new Date(j.updated_at)), ...appointments.map(a => new Date(a.date_time))];
    const mostRecent = lastActivity.length > 0 ? Math.max(...lastActivity.map(d => d.getTime())) : 0;
    const daysSinceActivity = mostRecent ? differenceInDays(new Date(), new Date(mostRecent)) : 999;
    const churnRisk = daysSinceActivity > 180 ? "High" : daysSinceActivity > 90 ? "Medium" : "Low";

    // Revenue trend by month
    const monthMap = new Map<string, number>();
    jobData.forEach((j) => {
      monthMap.set(j.month, (monthMap.get(j.month) || 0) + j.rcv);
    });
    const revenueTrend = Array.from(monthMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, revenue]) => ({ month, revenue }));

    // Status distribution
    const statusCounts = new Map<string, number>();
    jobData.forEach((j) => {
      statusCounts.set(j.status, (statusCounts.get(j.status) || 0) + 1);
    });
    const statusDist = Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value }));

    // Financial breakdown
    const financialBreakdown = [
      { name: "ACV", value: totalAcv },
      { name: "Depreciation", value: totalRevenue - totalAcv },
      { name: "Checks Recv'd", value: totalChecks },
    ].filter((d) => d.value > 0);

    // Trade type breakdown
    const tradeCounts = new Map<string, number>();
    jobData.forEach((j) => {
      (j.trade_types || []).forEach((t) => {
        tradeCounts.set(t, (tradeCounts.get(t) || 0) + 1);
      });
    });
    const tradeBreakdown = Array.from(tradeCounts.entries()).map(([name, value]) => ({ name, value }));

    // Carrier patterns
    const carrierMap = new Map<string, { count: number; totalAcv: number; totalDep: number }>();
    // We don't have carrier on jobs directly, but we can show per-job patterns
    // Instead, show claim patterns per job
    const claimPatterns = jobData.map((j) => ({
      jobId: j.job_id,
      acv: j.acv,
      rcv: j.rcv,
      depreciation: j.depreciation,
      checksReceived: j.checksReceived,
      variance: j.rcv - j.checksReceived,
      status: j.status,
      cycleTimeDays: j.cycleTimeDays,
    }));

    // Auto tags
    const tags: string[] = [];
    if (clv > 50000) tags.push("High-Value");
    if (jobData.length > 1) tags.push("Repeat");
    if (churnRisk === "High") tags.push("Churn-Risk");
    if (avgCycleTime !== null && avgCycleTime < 30) tags.push("Fast-Close");

    return {
      jobData, totalRevenue, totalAcv, totalChecks, avgJobValue,
      avgCycleTime, clv, repeatRate, churnRisk, daysSinceActivity,
      revenueTrend, statusDist, financialBreakdown, tradeBreakdown,
      claimPatterns, tags,
    };
  }, [jobs, appointments]);

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Tags */}
      {analytics.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {analytics.tags.map((tag) => (
            <Badge
              key={tag}
              variant={tag === "Churn-Risk" ? "destructive" : tag === "High-Value" ? "default" : "secondary"}
            >
              {tag === "High-Value" && <Star className="h-3 w-3 mr-1" />}
              {tag === "Churn-Risk" && <AlertTriangle className="h-3 w-3 mr-1" />}
              {tag === "Repeat" && <RotateCcw className="h-3 w-3 mr-1" />}
              {tag === "Fast-Close" && <Clock className="h-3 w-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Customer LTV" value={fmt(analytics.clv)} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Total Revenue" value={fmt(analytics.totalRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Avg Job Value" value={fmt(analytics.avgJobValue)} />
        <KpiCard label="Avg Cycle Time" value={analytics.avgCycleTime !== null ? `${analytics.avgCycleTime}d` : "—"} icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Repeat Rate" value={`${analytics.repeatRate.toFixed(0)}%`} icon={<RotateCcw className="h-4 w-4" />} />
        <KpiCard
          label="Churn Risk"
          value={analytics.churnRisk}
          icon={<AlertTriangle className="h-4 w-4" />}
          highlight={analytics.churnRisk === "High" ? "destructive" : analytics.churnRisk === "Medium" ? "warning" : "success"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {analytics.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Financial Breakdown */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Financial Breakdown</CardTitle></CardHeader>
          <CardContent>
            {analytics.financialBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.financialBreakdown}
                    cx="50%" cy="50%"
                    outerRadius={80} innerRadius={40}
                    dataKey="value" nameKey="name"
                    label={({ name, value }) => `${name}: ${fmt(value)}`}
                    labelLine={false}
                  >
                    {analytics.financialBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No financial data</p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Job Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {analytics.statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.statusDist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="value" name="Jobs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No jobs</p>
            )}
          </CardContent>
        </Card>

        {/* Trade Type Breakdown */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Trade Types</CardTitle></CardHeader>
          <CardContent>
            {analytics.tradeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.tradeBreakdown}
                    cx="50%" cy="50%"
                    outerRadius={80} innerRadius={40}
                    dataKey="value" nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {analytics.tradeBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No trade data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claim Patterns Table */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm">Claim & Financial Patterns</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">ACV</TableHead>
                <TableHead className="text-right">RCV</TableHead>
                <TableHead className="text-right">Depreciation</TableHead>
                <TableHead className="text-right">Checks Recv'd</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Cycle (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.claimPatterns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No claim data</TableCell>
                </TableRow>
              ) : (
                <>
                  {analytics.claimPatterns.map((c) => (
                    <TableRow key={c.jobId}>
                      <TableCell className="font-medium text-sm">{c.jobId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.acv)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.rcv)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.depreciation)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.checksReceived)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${c.variance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {fmt(c.variance)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.cycleTimeDays ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {/* Averages row */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Averages / Totals</TableCell>
                    <TableCell className="text-right text-sm">{fmt(analytics.totalAcv)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(analytics.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(analytics.totalRevenue - analytics.totalAcv)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(analytics.totalChecks)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(analytics.totalRevenue - analytics.totalChecks)}</TableCell>
                    <TableCell className="text-right text-sm">{analytics.avgCycleTime ?? "—"}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm">Activity Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Appointments</p>
              <p className="text-lg font-semibold">{appointments.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Days Since Last Activity</p>
              <p className="text-lg font-semibold">{analytics.daysSinceActivity < 999 ? `${analytics.daysSinceActivity}d` : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer Since</p>
              <p className="text-lg font-semibold">{format(new Date(customerCreatedAt), "MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lifetime (days)</p>
              <p className="text-lg font-semibold">{differenceInDays(new Date(), new Date(customerCreatedAt))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: string }) {
  const highlightClass = highlight === "destructive" ? "text-destructive" : highlight === "warning" ? "text-yellow-600" : highlight === "success" ? "text-emerald-600" : "";
  return (
    <Card className="shadow-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
        <p className={`text-xl font-bold ${highlightClass || "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
