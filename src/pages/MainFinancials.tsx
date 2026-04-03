import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, DollarSign, TrendingUp, BarChart3, ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { TradesBadges } from "@/components/job/TradesBadges";
import { anyLineQualificationHold, materialOrderReadinessPct } from "@/lib/productionRollups";

export default function MainFinancials() {
  const [search, setSearch] = useState("");
  const [expandedMain, setExpandedMain] = useState<Set<string>>(new Set());

  const { data: mainJobs = [], isLoading } = useQuery({
    queryKey: ["main-financials-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name)")
        .is("parent_job_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: subJobs = [] } = useQuery({
    queryKey: ["main-financials-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .not("parent_job_id", "is", null)
        .order("sub_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["main-financials-checks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_checks").select("job_id, amount, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["main-financials-production-lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_production_items")
        .select("job_id, labor_cost, material_cost, qualification_status, material_order_status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const itemsByJob = useMemo(() => {
    const m: Record<string, typeof productionLines> = {};
    for (const p of productionLines) {
      if (!m[p.job_id]) m[p.job_id] = [];
      m[p.job_id].push(p);
    }
    return m;
  }, [productionLines]);

  const subsByParent = useMemo(() => {
    const map: Record<string, any[]> = {};
    subJobs.forEach((s: any) => {
      if (!map[s.parent_job_id]) map[s.parent_job_id] = [];
      map[s.parent_job_id].push(s);
    });
    return map;
  }, [subJobs]);

  const checksByJob = useMemo(() => {
    const map: Record<string, number> = {};
    checks.forEach((c: any) => {
      if (["Received", "Deposited"].includes(c.status)) {
        map[c.job_id] = (map[c.job_id] || 0) + (c.amount || 0);
      }
    });
    return map;
  }, [checks]);

  // Calculate aggregated financials for each main job (own + subs)
  const mainJobData = useMemo(() => {
    return mainJobs.map((m: any) => {
      const subs = subsByParent[m.id] || [];
      const ownAcv = (m.financials as any)?.acv ?? 0;
      const ownRcv = (m.financials as any)?.rcv ?? 0;
      const subsAcv = subs.reduce((s: number, sub: any) => s + ((sub.financials as any)?.acv ?? 0), 0);
      const subsRcv = subs.reduce((s: number, sub: any) => s + ((sub.financials as any)?.rcv ?? 0), 0);
      const totalAcv = ownAcv + subsAcv;
      const totalRcv = ownRcv + subsRcv;

      // Checks: own + subs
      const allJobIds = [m.id, ...subs.map((s: any) => s.id)];
      const totalChecks = allJobIds.reduce((s: number, id: string) => s + (checksByJob[id] || 0), 0);
      const depreciation = totalRcv - totalAcv;
      const variance = totalAcv - totalChecks;

      const plines = allJobIds.flatMap((id: string) => itemsByJob[id] || []);
      const prodCost = plines.reduce(
        (s: number, r: (typeof productionLines)[number]) =>
          s + (Number(r.labor_cost) || 0) + (Number(r.material_cost) || 0),
        0,
      );
      const prodMatPct = materialOrderReadinessPct(plines as any);
      const prodLineHold = anyLineQualificationHold(plines as any);

      return {
        ...m,
        subs,
        totalAcv,
        totalRcv,
        totalChecks,
        depreciation,
        variance,
        subsCount: subs.length,
        prodCost,
        prodMatPct,
        prodLineHold,
      };
    });
  }, [mainJobs, subsByParent, checksByJob, itemsByJob]);

  const totals = useMemo(() => {
    return mainJobData.reduce((acc, j) => ({
      acv: acc.acv + j.totalAcv,
      rcv: acc.rcv + j.totalRcv,
      checks: acc.checks + j.totalChecks,
    }), { acv: 0, rcv: 0, checks: 0 });
  }, [mainJobData]);

  const filtered = useMemo(() => {
    if (!search) return mainJobData;
    const q = search.toLowerCase();
    return mainJobData.filter((j: any) =>
      j.job_id?.toLowerCase().includes(q) ||
      j.customers?.name?.toLowerCase().includes(q) ||
      (j as any).claim_number?.toLowerCase().includes(q)
    );
  }, [mainJobData, search]);

  const toggleExpand = (id: string) => {
    setExpandedMain(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Main Job Financials</h1>
            <p className="text-sm text-muted-foreground">Aggregated financials across main jobs and their sub-jobs</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Aggregated ACV</p>
                <p className="text-2xl font-bold text-foreground">${totals.acv.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Aggregated RCV</p>
                <p className="text-2xl font-bold text-foreground">${totals.rcv.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Checks Received</p>
                <p className="text-2xl font-bold text-foreground">${totals.checks.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Job ID, claim #, or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8"></th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job ID</th>
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trades</th>
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Claim #</th>
                       <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Subs</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">ACV (Agg)</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">RCV (Agg)</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Depreciation</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Checks</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Variance</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Prod $</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden lg:table-cell">Lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j: any) => (
                      <>
                        <tr key={j.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3">
                            {j.subsCount > 0 && (
                              <button onClick={() => toggleExpand(j.id)} className="text-muted-foreground hover:text-foreground">
                                {expandedMain.has(j.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                             <Link to={`/operations/${j.id}`} className="font-medium text-foreground hover:text-accent transition-colors font-mono">{j.job_id}</Link>
                           </td>
                           <td className="px-4 py-3"><TradesBadges trades={j.trade_types ?? []} size="xs" /></td>
                           <td className="px-4 py-3 text-muted-foreground font-mono">{j.claim_number || "—"}</td>
                           <td className="px-4 py-3 text-muted-foreground">{j.customers?.name || "—"}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {j.subsCount > 0 && <Badge variant="outline" className="text-xs">{j.subsCount} sub{j.subsCount !== 1 ? "s" : ""}</Badge>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">${j.totalAcv.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">${j.totalRcv.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">${j.depreciation.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden lg:table-cell">${j.totalChecks.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                            <span className={j.variance > 0 ? "text-destructive" : "text-success"}>
                              ${Math.abs(j.variance).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                            ${j.prodCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-col items-end gap-1">
                              {j.prodLineHold && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Hold
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">Mat {j.prodMatPct}%</span>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded sub-jobs */}
                        {expandedMain.has(j.id) && j.subs.map((sub: any) => {
                          const subAcv = (sub.financials as any)?.acv ?? 0;
                          const subRcv = (sub.financials as any)?.rcv ?? 0;
                          const subChecks = checksByJob[sub.id] || 0;
                          return (
                            <tr key={sub.id} className="border-b bg-muted/20 hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 pl-10">
                                <Link to={`/operations/${sub.id}`} className="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
                                  ↳ {sub.job_id}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">sub #{sub.sub_number}</td>
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 hidden sm:table-cell"></td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">${subAcv.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">${subRcv.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">${(subRcv - subAcv).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">${subChecks.toLocaleString()}</td>
                              <td className="px-4 py-2 hidden lg:table-cell"></td>
                              <td className="px-4 py-2 hidden md:table-cell"></td>
                              <td className="px-4 py-2 hidden lg:table-cell"></td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">No main jobs found</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-medium">
                      <td className="px-4 py-3" colSpan={6}>Totals</td>
                      <td className="px-4 py-3 text-right font-mono">${totals.acv.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${totals.rcv.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${(totals.rcv - totals.acv).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">${totals.checks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                        ${Math.abs(totals.acv - totals.checks).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" />
                      <td className="px-4 py-3 hidden lg:table-cell" />
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
