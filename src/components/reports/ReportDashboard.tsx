import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { TrendingUp, DollarSign, Briefcase, Users } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  lead: "hsl(220 65% 50%)",
  inspected: "hsl(38 92% 50%)",
  approved: "hsl(152 60% 40%)",
  scheduled: "hsl(280 60% 50%)",
  completed: "hsl(152 70% 35%)",
  closed: "hsl(220 10% 50%)",
};

const pieConfig: ChartConfig = { count: { label: "Jobs" } };
const revenueConfig: ChartConfig = {
  acv: { label: "ACV", color: "hsl(38 92% 50%)" },
  rcv: { label: "RCV", color: "hsl(220 65% 50%)" },
};
const monthlyConfig: ChartConfig = { jobs: { label: "Jobs Created", color: "hsl(38 92% 50%)" } };

function KpiCard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Icon className="h-6 w-6 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportDashboard() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["report-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("status, financials, created_at").is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["report-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commissions").select("amount, status, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["report-customer-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .is("archived_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const statusCounts = jobs.reduce((acc: Record<string, number>, j: any) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const totalAcv = jobs.reduce((s: number, j: any) => s + ((j.financials as any)?.acv ?? 0), 0);
  const totalRcv = jobs.reduce((s: number, j: any) => s + ((j.financials as any)?.rcv ?? 0), 0);
  const totalCommEarned = commissions.filter((c: any) => c.status === "earned").reduce((s: number, c: any) => s + c.amount, 0);
  const totalCommPaid = commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + c.amount, 0);

  const monthlyData: { month: string; jobs: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    const count = jobs.filter((j: any) => j.created_at?.startsWith(key)).length;
    monthlyData.push({ month: label, jobs: count });
  }

  const revenueByStatus = Object.keys(STATUS_COLORS).map((status) => {
    const statusJobs = jobs.filter((j: any) => j.status === status);
    return {
      status: status.charAt(0).toUpperCase() + status.slice(1),
      acv: statusJobs.reduce((s: number, j: any) => s + ((j.financials as any)?.acv ?? 0), 0),
      rcv: statusJobs.reduce((s: number, j: any) => s + ((j.financials as any)?.rcv ?? 0), 0),
    };
  }).filter((r) => r.acv > 0 || r.rcv > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Jobs" value={String(jobs.length)} icon={Briefcase} />
        <KpiCard title="Total Customers" value={String(customerCount)} icon={Users} />
        <KpiCard title="Total ACV" value={`$${totalAcv.toLocaleString()}`} icon={DollarSign} />
        <KpiCard title="Commissions Earned" value={`$${totalCommEarned.toLocaleString()}`} icon={TrendingUp} sub={`$${totalCommPaid.toLocaleString()} paid`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Job Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[280px]">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "hsl(220 15% 70%)"} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No job data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Jobs Created (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={monthlyConfig} className="h-[280px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Line type="monotone" dataKey="jobs" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ fill: "hsl(38 92% 50%)" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue by Job Status</CardTitle></CardHeader>
          <CardContent>
            {revenueByStatus.length > 0 ? (
              <ChartContainer config={revenueConfig} className="h-[300px]">
                <BarChart data={revenueByStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Bar dataKey="acv" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rcv" fill="hsl(220 65% 50%)" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
