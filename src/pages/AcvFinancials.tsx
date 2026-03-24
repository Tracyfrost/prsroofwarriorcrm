import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { TradesBadges } from "@/components/job/TradesBadges";

export default function AcvFinancials() {
  const [search, setSearch] = useState("");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["acv-financials-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["acv-checks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_checks").select("job_id, amount, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const checksByJob = useMemo(() => {
    const map: Record<string, { received: number; total: number }> = {};
    checks.forEach((c: any) => {
      if (!map[c.job_id]) map[c.job_id] = { received: 0, total: 0 };
      map[c.job_id].total += c.amount || 0;
      if (["Received", "Deposited"].includes(c.status)) map[c.job_id].received += c.amount || 0;
    });
    return map;
  }, [checks]);

  const totals = useMemo(() => {
    let totalAcv = 0, totalRcv = 0, totalReceived = 0;
    jobs.forEach((j: any) => {
      totalAcv += (j.financials as any)?.acv ?? 0;
      totalRcv += (j.financials as any)?.rcv ?? 0;
    });
    Object.values(checksByJob).forEach((c) => { totalReceived += c.received; });
    return { totalAcv, totalRcv, totalReceived };
  }, [jobs, checksByJob]);

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j: any) =>
      j.job_id?.toLowerCase().includes(q) ||
      j.customers?.name?.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">ACV & Financials</h1>
            <p className="text-sm text-muted-foreground">Financial overview across all jobs</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total ACV</p>
                <p className="text-2xl font-bold text-foreground">${totals.totalAcv.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total RCV</p>
                <p className="text-2xl font-bold text-foreground">${totals.totalRcv.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Checks Received</p>
                <p className="text-2xl font-bold text-foreground">${totals.totalReceived.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Job ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job ID</th>
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trades</th>
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">ACV</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">RCV</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Received</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j: any) => {
                      const acv = (j.financials as any)?.acv ?? 0;
                      const rcv = (j.financials as any)?.rcv ?? 0;
                      const received = checksByJob[j.id]?.received ?? 0;
                      const variance = acv - received;
                      return (
                        <tr key={j.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3">
                             <Link to={`/jobs/${j.id}`} className="font-medium text-foreground hover:text-accent transition-colors">{j.job_id}</Link>
                           </td>
                           <td className="px-4 py-3"><TradesBadges trades={j.trade_types ?? []} size="xs" /></td>
                           <td className="px-4 py-3 text-muted-foreground">{j.customers?.name || "—"}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variant="outline" className="text-xs capitalize">{j.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${acv.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">${rcv.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">${received.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                            <span className={variance > 0 ? "text-destructive" : "text-success"}>
                              ${Math.abs(variance).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No jobs found</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-medium">
                      <td className="px-4 py-3" colSpan={4}>Totals</td>
                      <td className="px-4 py-3 text-right font-mono">${totals.totalAcv.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${totals.totalRcv.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${totals.totalReceived.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                        ${Math.abs(totals.totalAcv - totals.totalReceived).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
