import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/hooks/useJobs";
import { useAllies } from "@/hooks/useAllies";
import { useAllJobExpenses } from "@/hooks/useJobExpenses";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { type JobTracking } from "@/hooks/useJobTracking";
import { TradesBadges } from "@/components/job/TradesBadges";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Download } from "lucide-react";

const SECURE_CATS = new Set(["Materials", "Labor", "Miscellaneous", "Permits", "Fees", "Inventory", "Payroll", "Refund"]);
const BONUS_CATS = new Set(["Bonus"]);

export default function BattleLedger() {
  const { data: jobs = [] } = useJobs();
  const { data: allies = [] } = useAllies(false);
  const { data: allExpenses = [] } = useAllJobExpenses();
  const { data: expenseTypes = [] } = useExpenseTypes(false);
  const [search, setSearch] = useState("");

  const allyMap = useMemo(() => new Map(allies.map(a => [a.id, a.name])), [allies]);
  const typeMap = useMemo(() => new Map(expenseTypes.map(t => [t.id, t])), [expenseTypes]);

  // Group expenses by job and category
  const jobExpenseData = useMemo(() => {
    const map = new Map<string, { secure: number; bonus: number; total: number }>();
    allExpenses.forEach(e => {
      const et = typeMap.get(e.expense_type_id);
      const cat = et?.category ?? "";
      const prev = map.get(e.job_id) ?? { secure: 0, bonus: 0, total: 0 };
      prev.total += e.amount;
      if (SECURE_CATS.has(cat)) prev.secure += e.amount;
      if (BONUS_CATS.has(cat)) prev.bonus += e.amount;
      map.set(e.job_id, prev);
    });
    return map;
  }, [allExpenses, typeMap]);

  const trackedJobs = useMemo(() => {
    return jobs
      .filter(j => {
        const t = (j as any).tracking as JobTracking | undefined;
        const hasExpenses = jobExpenseData.has(j.id);
        if (!t && !hasExpenses) return false;
        return (t?.income ?? 0) > 0 || hasExpenses;
      })
      .filter(j => {
        if (!search) return true;
        const q = search.toLowerCase();
        return j.job_id.toLowerCase().includes(q) || (j.customers?.name ?? "").toLowerCase().includes(q);
      });
  }, [jobs, search, jobExpenseData]);

  const getJobFinancials = (j: any) => {
    const t = ((j as any).tracking ?? {}) as JobTracking;
    const income = t.income ?? 0;
    const exp = jobExpenseData.get(j.id) ?? { secure: 0, bonus: 0, total: 0 };
    const netProfit = income - exp.secure;
    const margin = income > 0 ? (netProfit / income) * 100 : 0;
    return { income, secure: exp.secure, bonus: exp.bonus, total: exp.total, netProfit, margin };
  };

  const totals = useMemo(() => {
    let income = 0, secure = 0, bonus = 0, total = 0, netProfit = 0;
    trackedJobs.forEach(j => {
      const f = getJobFinancials(j);
      income += f.income;
      secure += f.secure;
      bonus += f.bonus;
      total += f.total;
      netProfit += f.netProfit;
    });
    return { income, secure, bonus, total, netProfit };
  }, [trackedJobs, jobExpenseData]);

  const exportCSV = () => {
    const headers = ["Job ID", "Customer", "Income", "Secure Expenses", "Bonuses", "All Expenses", "Net Profit", "Margin %", "Ally"];
    const rows = trackedJobs.map(j => {
      const t = ((j as any).tracking ?? {}) as JobTracking;
      const f = getJobFinancials(j);
      const allyId = t.vendor_id || t.sub_id;
      return [
        j.job_id, j.customers?.name ?? "", f.income.toString(),
        f.secure.toString(), f.bonus.toString(), f.total.toString(),
        f.netProfit.toString(), f.margin.toFixed(1),
        allyId ? allyMap.get(allyId) ?? "" : "",
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "battle-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">⚔ Battle Ledger</h1>
            <p className="text-muted-foreground text-sm">Job tracking overview — income, expenses, and net profit</p>
          </div>
          {trackedJobs.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold font-mono text-foreground">${totals.income.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Secure Expenses</p>
              <p className="text-xl font-bold font-mono text-foreground">${totals.secure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">All Expenses</p>
              <p className="text-xl font-bold font-mono text-foreground">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Bonuses</p>
              <p className="text-xl font-bold font-mono text-foreground">${totals.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-xl font-bold font-mono ${totals.netProfit >= 0 ? "text-success-foreground" : "text-destructive"}`}>
                ${totals.netProfit.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                     <TableHead>Trades</TableHead>
                     <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Secure Exp</TableHead>
                    <TableHead className="text-right">Bonuses</TableHead>
                    <TableHead className="text-right">All Exp</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Ally</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackedJobs.map(j => {
                    const t = ((j as any).tracking ?? {}) as JobTracking;
                    const f = getJobFinancials(j);
                    return (
                      <TableRow key={j.id}>
                        <TableCell>
                           <Link to={`/operations/${j.id}`} className="font-mono font-medium text-primary hover:underline">{j.job_id}</Link>
                         </TableCell>
                         <TableCell><TradesBadges trades={j.trade_types ?? []} size="xs" /></TableCell>
                         <TableCell>{j.customers?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">${f.income.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">${f.secure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">${f.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">${f.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${f.netProfit >= 0 ? "text-success-foreground" : "text-destructive"}`}>
                          ${f.netProfit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={f.margin >= 20 ? "default" : f.margin >= 0 ? "secondary" : "destructive"} className="font-mono text-xs">
                            {f.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{(() => { const aid = t.vendor_id || t.sub_id; return aid ? allyMap.get(aid) ?? "—" : "—"; })()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {trackedJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No jobs with tracking data yet. Add tracking in Job Details → Tracking tab.
                      </TableCell>
                    </TableRow>
                  )}
                  {trackedJobs.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-right text-sm">TOTALS</TableCell>
                      <TableCell className="text-right font-mono">${totals.income.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">${totals.secure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono">${totals.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`text-right font-mono ${totals.netProfit >= 0 ? "text-success-foreground" : "text-destructive"}`}>
                        ${totals.netProfit.toLocaleString()}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
