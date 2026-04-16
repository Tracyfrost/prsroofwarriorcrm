import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BattleTooltip } from "@/components/BattleTooltip";
import { useVendors } from "@/hooks/useVendors";
import { useSubs } from "@/hooks/useSubs";
import { useAllProfiles } from "@/hooks/useHierarchy";
import {
  useUpdateJobTracking,
  type JobTracking,
} from "@/hooks/useJobTracking";
import {
  usePaymentChecks, useCreatePaymentCheck, useUpdatePaymentCheck,
  useDeletePaymentCheck, useCheckHistory, CHECK_TYPES, CHECK_STATUSES,
  type PaymentCheck,
} from "@/hooks/usePaymentChecks";
import { useDraws, useCreateDraw, useUpdateDraw, useDeleteDraw, DRAW_TYPES, type Draw } from "@/hooks/useDraws";
import { useCommissions, useCreateCommission, useUpdateCommissionStatus, type Commission } from "@/hooks/useCommissions";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Calendar, Save, TrendingUp, Plus, Trash2, History,
  AlertTriangle, Percent, ArrowDownRight, Wallet, Pencil, Check, X, Users,
} from "lucide-react";
import { JobExpensesGrid } from "@/components/production/JobExpensesGrid";
import { CategoryExpenseGrid, useCategoryExpenseTotals } from "@/components/production/CategoryExpenseGrid";
import { SECURE_CATEGORIES, COMPANY_CATEGORIES, BONUS_CATEGORIES } from "@/hooks/useExpenseTypes";
import { format } from "date-fns";

interface Props {
  jobId: string;
  tracking: JobTracking;
}

export function JobTrackingTab({ jobId, tracking: initial }: Props) {
  const { toast } = useToast();
  const { data: vendors = [] } = useVendors();
  const { data: subs = [] } = useSubs();
  const { data: profiles = [] } = useAllProfiles();
  const updateTracking = useUpdateJobTracking();

  const { data: checks = [] } = usePaymentChecks(jobId);
  const createCheck = useCreatePaymentCheck();
  const updateCheck = useUpdatePaymentCheck();
  const deleteCheck = useDeletePaymentCheck();
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  const { data: draws = [] } = useDraws(jobId);
  const createDraw = useCreateDraw();
  const deleteDraw = useDeleteDraw();

  // Category-based expense totals from job_expenses table
  const { secureTotal: gridSecureExpenses, companyTotal: gridCompanyExpenses, bonusTotal: gridBonusTotal } = useCategoryExpenseTotals(jobId);

  const [form, setForm] = useState<JobTracking>(initial || {});

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const set = (key: keyof JobTracking, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  // === Financial Calculations ===
  const receivedChecksTotal = checks
    .filter(c => c.status === "Received" || c.status === "Deposited")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const allChecksTotal = checks.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const manualIncome = form.income ?? 0;
  const totalIncome = manualIncome + receivedChecksTotal;
  const secureExpenses = gridSecureExpenses;
  const totalBonuses = gridBonusTotal;
  const companyExpenses = gridCompanyExpenses;

  // Pay structure
  const grossProfit = totalIncome - secureExpenses;
  const officeFeePct = form.office_fee_pct ?? 5;
  const officeFee = grossProfit * (officeFeePct / 100);
  const commissionProfit = grossProfit - officeFee;

  // Commission splits
  const salesShare = form.sales_share ?? 50;
  const managerShare = form.manager_share ?? 10;
  const companySharePct = form.company_share ?? 40;
  const salesCommissionRaw = commissionProfit * (salesShare / 100);
  const managerCommission = commissionProfit * (managerShare / 100);
  const companyCommission = commissionProfit * (companySharePct / 100);

  // Draws
  const totalDraws = draws.reduce((s, d) => s + d.amount, 0);
  const salesCommissionFinal = salesCommissionRaw - totalDraws;

  // Mismatch
  const hasLedgerImbalance = manualIncome > 0 && receivedChecksTotal > 0 && Math.abs(manualIncome - receivedChecksTotal) > manualIncome * 0.2;

  const marginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  const handleSave = async () => {
    try {
      await updateTracking.mutateAsync({ id: jobId, tracking: form });
      toast({ title: "Tracking data forged" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddCheck = async () => {
    try {
      await createCheck.mutateAsync({ job_id: jobId, type: "ACV", amount: 0, notes: "", status: "Received" });
      toast({ title: "Check added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateCheck = async (check: PaymentCheck, field: string, value: any) => {
    try {
      await updateCheck.mutateAsync({ id: check.id, jobId, [field]: value });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCheck = async (id: string) => {
    try {
      await deleteCheck.mutateAsync({ id, jobId });
      toast({ title: "Check removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddDraw = async () => {
    try {
      await createDraw.mutateAsync({ job_id: jobId, type: "Contract Signed", amount: 0 });
      toast({ title: "Draw deployed!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* === Pay Structure Summary KPIs === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-card border-success/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Total Income
            </p>
            <p className="text-lg font-bold text-foreground font-mono">${totalIncome.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Checks: ${receivedChecksTotal.toLocaleString()} + Manual: ${manualIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Gross Profit
            </p>
            <p className={`text-lg font-bold font-mono ${grossProfit >= 0 ? "text-success-foreground" : "text-destructive"}`}>
              ${grossProfit.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">Income − Secure Expenses</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Percent className="h-3 w-3" /> Commission Profit
            </p>
            <p className={`text-lg font-bold font-mono ${commissionProfit >= 0 ? "text-success-foreground" : "text-destructive"}`}>
              ${commissionProfit.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">Gross − {officeFeePct}% office fee (${officeFee.toLocaleString()})</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Victory Margin</p>
            <p className={`text-lg font-bold font-mono ${marginPct >= 0 ? "text-success-foreground" : "text-destructive"}`}>
              {marginPct.toFixed(1)}%
            </p>
            <Progress value={Math.max(0, Math.min(100, marginPct))} className="h-1 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Imbalance Alert */}
      {hasLedgerImbalance && (
        <Card className="shadow-card border-warning/50 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm text-warning font-medium">
              ⚠ Ledger Imbalance! Manual income (${manualIncome.toLocaleString()}) differs from check totals (${receivedChecksTotal.toLocaleString()}).
            </p>
          </CardContent>
        </Card>
      )}

      {/* === Payment Checks === */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Forge Income via Checks ({checks.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddCheck} disabled={createCheck.isPending}>
            <Plus className="mr-1 h-3 w-3" /> Secure Payment
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {checks.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2 border-b">
              {CHECK_TYPES.map(t => {
                const typeTotal = checks.filter(c => c.type === t).reduce((s, c) => s + (Number(c.amount) || 0), 0);
                if (typeTotal === 0) return null;
                return (
                  <Badge key={t} variant="outline" className="font-mono text-xs">
                    {t.replace("_", " ")}: ${typeTotal.toLocaleString()}
                  </Badge>
                );
              })}
              <Badge variant="default" className="font-mono text-xs ml-auto">
                Total: ${allChecksTotal.toLocaleString()}
              </Badge>
            </div>
          )}
          <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                    No checks recorded. Click "Secure Payment" to forge income.
                  </TableCell>
                </TableRow>
              ) : checks.map((check) => (
                <>
                  <TableRow key={check.id}>
                    <TableCell>
                      <Select value={check.type} onValueChange={(v) => handleUpdateCheck(check, "type", v)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHECK_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={check.status} onValueChange={(v) => handleUpdateCheck(check, "status", v)}>
                        <SelectTrigger className={`h-8 w-28 text-xs ${check.status === "Received" || check.status === "Deposited" ? "border-success/50" : ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHECK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={check.date_received ? format(new Date(check.date_received), "yyyy-MM-dd") : ""} onChange={(e) => handleUpdateCheck(check, "date_received", e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-8 text-xs w-36" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" defaultValue={check.amount} onBlur={(e) => { const val = parseFloat(e.target.value) || 0; if (val !== Number(check.amount)) handleUpdateCheck(check, "amount", val); }} className="h-8 text-xs w-28 font-mono" />
                    </TableCell>
                    <TableCell>
                      <Input defaultValue={check.notes ?? ""} onBlur={(e) => { if (e.target.value !== (check.notes ?? "")) handleUpdateCheck(check, "notes", e.target.value); }} className="h-8 text-xs" placeholder="Notes..." />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setExpandedCheckId(expandedCheckId === check.id ? null : check.id)}>
                          <History className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCheck(check.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCheckId === check.id && (
                    <TableRow key={`${check.id}-history`}>
                      <TableCell colSpan={6} className="p-0">
                        <CheckHistoryPanel checkId={check.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dates */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Tracking Dates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Signed Date</Label>
              <Input type="date" value={form.signed_date ?? ""} onChange={e => set("signed_date", e.target.value || null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Check Date</Label>
              <Input type="date" value={form.check_date ?? ""} onChange={e => set("check_date", e.target.value || null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Install Date</Label>
              <Input type="date" value={form.install_date ?? ""} onChange={e => set("install_date", e.target.value || null)} />
            </div>
          </CardContent>
        </Card>

        {/* Manual Income */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Manual Income</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Additional Income ($)</Label>
              <Input type="number" value={form.income ?? ""} placeholder="0" onChange={e => set("income", parseFloat(e.target.value) || 0)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Input value={form.source ?? ""} placeholder="e.g. Insurance, Self-pay" onChange={e => set("source", e.target.value)} />
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Income Forged:</span> ${totalIncome.toLocaleString()} from {checks.length} check(s) + manual
            </div>
          </CardContent>
        </Card>

        {/* Commission Splits */}
        <Card className="shadow-card border-primary/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4" /> Commission Splits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Office Fee %</Label>
              <Input type="number" value={form.office_fee_pct ?? 5} placeholder="5" onChange={e => set("office_fee_pct", parseFloat(e.target.value) || 0)} className="font-mono" min={0} max={100} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Sales %</Label>
                <Input type="number" value={form.sales_share ?? 50} onChange={e => set("sales_share", parseFloat(e.target.value) || 0)} className="font-mono" min={0} max={100} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Manager %</Label>
                <Input type="number" value={form.manager_share ?? 10} onChange={e => set("manager_share", parseFloat(e.target.value) || 0)} className="font-mono" min={0} max={100} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company %</Label>
                <Input type="number" value={form.company_share ?? 40} onChange={e => set("company_share", parseFloat(e.target.value) || 0)} className="font-mono" min={0} max={100} />
              </div>
            </div>
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Profit Secured</span>
                <span className="font-mono font-bold">${grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Office Fee ({officeFeePct}%)</span>
                <span className="font-mono text-destructive">−${officeFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Commission Profit</span>
                <span className="font-mono">${commissionProfit.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg border p-2 text-center bg-muted/30">
                  <p className="text-[9px] text-muted-foreground uppercase">Sales ({salesShare}%)</p>
                  <p className="font-mono text-sm font-bold text-foreground">${salesCommissionRaw.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2 text-center bg-muted/30">
                  <p className="text-[9px] text-muted-foreground uppercase">Manager ({managerShare}%)</p>
                  <p className="font-mono text-sm font-bold text-foreground">${managerCommission.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2 text-center bg-muted/30">
                  <p className="text-[9px] text-muted-foreground uppercase">Company ({companySharePct}%)</p>
                  <p className="font-mono text-sm font-bold text-foreground">${companyCommission.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendors & Subs */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Vendors & Subcontractors</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vendor</Label>
              <Select value={form.vendor_id ?? "none"} onValueChange={v => set("vendor_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subcontractor</Label>
              <Select value={form.sub_id ?? "none"} onValueChange={v => set("sub_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select sub" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subs.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.specialty}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === SECURE EXPENSES GRID === */}
      <CategoryExpenseGrid
        jobId={jobId}
        title="Forge Secure Ledger"
        icon={<TrendingUp className="h-4 w-4" />}
        categories={SECURE_CATEGORIES}
      />

      {/* === COMPANY BONUSES GRID === */}
      <CategoryExpenseGrid
        jobId={jobId}
        title="Company Bonuses"
        icon={<DollarSign className="h-4 w-4" />}
        categories={BONUS_CATEGORIES}
      />

      {/* === COMPANY EXPENSES GRID === */}
      <CategoryExpenseGrid
        jobId={jobId}
        title="Company Expenses"
        icon={<Wallet className="h-4 w-4" />}
        categories={COMPANY_CATEGORIES}
        badge="Post-Commission"
      />

      {/* Draws — Inline Editable */}
      <Card className="shadow-card border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" /> Draws Against Commission ({draws.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddDraw} disabled={createDraw.isPending}>
            <Plus className="mr-1 h-3 w-3" /> Secure Draw
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draws.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">
                    No draws deployed
                  </TableCell>
                </TableRow>
              ) : draws.map((draw) => (
                <DrawEditableRow key={draw.id} draw={draw} jobId={jobId} />
              ))}
              {draws.length > 0 && (
                <TableRow>
                  <TableCell className="font-bold text-sm">Total Draws</TableCell>
                  <TableCell className="font-mono text-sm font-bold text-destructive">−${totalDraws.toLocaleString()}</TableCell>
                  <TableCell colSpan={3}>
                    <span className="text-xs text-muted-foreground">
                      Sales Victory: <span className={`font-mono font-bold ${salesCommissionFinal >= 0 ? "text-success-foreground" : "text-destructive"}`}>${salesCommissionFinal.toLocaleString()}</span> (after draws)
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Card */}
      <CommissionsCard jobId={jobId} commissionProfit={commissionProfit} salesShare={salesShare} managerShare={managerShare} totalDraws={totalDraws} />

      {/* Itemized Expenses (legacy/general) */}
      <JobExpensesGrid jobId={jobId} />

      {/* Notes & Save */}
      <Card className="shadow-card">
        <CardContent className="p-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground flex min-w-0 flex-wrap gap-3">
            <span>Gross: <Badge variant={grossProfit >= 0 ? "default" : "destructive"} className="font-mono ml-1">${grossProfit.toLocaleString()}</Badge></span>
            <span>Commission: <Badge variant="outline" className="font-mono ml-1">${commissionProfit.toLocaleString()}</Badge></span>
            <span>Sales Victory: <Badge variant={salesCommissionFinal >= 0 ? "default" : "destructive"} className="font-mono ml-1">${salesCommissionFinal.toLocaleString()}</Badge></span>
          </div>
          <BattleTooltip phraseKey="submit" fallback="Forge the Numbers!">
            <Button onClick={handleSave} disabled={updateTracking.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateTracking.isPending ? "Forging..." : "Save Tracking"}
            </Button>
          </BattleTooltip>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckHistoryPanel({ checkId }: { checkId: string }) {
  const { data: history = [], isLoading } = useCheckHistory(checkId);

  if (isLoading) return <div className="p-3 text-xs text-muted-foreground">Loading history...</div>;
  if (history.length === 0) return <div className="p-3 text-xs text-muted-foreground">No changes recorded</div>;

  return (
    <div className="bg-muted/30 p-3 border-t">
      <p className="text-xs font-medium text-muted-foreground mb-2">Payment Log</p>
      <div className="space-y-1.5">
        {history.map((h) => (
          <div key={h.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{format(new Date(h.changed_at), "MMM d, h:mm a")}</span>
            <Badge variant="outline" className="text-[9px] px-1">{h.field_changed}</Badge>
            <span className="text-muted-foreground">{h.old_value ?? "—"}</span>
            <span>→</span>
            <span className="font-medium text-foreground">{h.new_value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline-editable draw row */
function DrawEditableRow({ draw, jobId }: { draw: Draw; jobId: string }) {
  const { toast } = useToast();
  const updateDraw = useUpdateDraw();
  const deleteDraw = useDeleteDraw();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ type: draw.type, amount: draw.amount.toString(), draw_date: draw.draw_date, notes: draw.notes || "" });

  const handleSave = async () => {
    try {
      await updateDraw.mutateAsync({
        id: draw.id,
        job_id: jobId,
        type: form.type,
        amount: parseFloat(form.amount) || 0,
        draw_date: form.draw_date,
        notes: form.notes,
      });
      toast({ title: "Draw updated" });
      setEditing(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (editing) {
    return (
      <TableRow className="bg-accent/5">
        <TableCell>
          <Select value={form.type} onValueChange={(v: Draw["type"]) => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DRAW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-xs font-mono w-24" />
        </TableCell>
        <TableCell>
          <Input type="date" value={form.draw_date} onChange={e => setForm(f => ({ ...f, draw_date: e.target.value }))} className="h-8 text-xs w-32" />
        </TableCell>
        <TableCell>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs" placeholder="Notes" />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-7 w-7 p-0" onClick={handleSave} disabled={updateDraw.isPending}><Check className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="group cursor-pointer hover:bg-accent/5" onDoubleClick={() => setEditing(true)}>
      <TableCell><Badge variant="outline" className="text-xs">{draw.type}</Badge></TableCell>
      <TableCell className="font-mono text-sm font-bold text-destructive">−${draw.amount.toLocaleString()}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{format(new Date(draw.draw_date), "MMM d, yyyy")}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{draw.notes || "—"}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => deleteDraw.mutate({ id: draw.id, job_id: jobId })} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Multi-rep commissions card */
function CommissionsCard({ jobId, commissionProfit, salesShare, managerShare, totalDraws }: {
  jobId: string; commissionProfit: number; salesShare: number; managerShare: number; totalDraws: number;
}) {
  const { toast } = useToast();
  const { data: commissions = [], isLoading } = useCommissions();
  const createCommission = useCreateCommission();
  const updateStatus = useUpdateCommissionStatus();
  const { data: profiles = [] } = useAllProfiles();
  const [adding, setAdding] = useState(false);
  const [newRep, setNewRep] = useState({ rep_id: "", amount: "", notes: "" });

  // Filter commissions for this job
  const jobCommissions = commissions.filter(c => c.job_id === jobId);
  const totalBase = jobCommissions.reduce((s, c) => s + c.amount, 0);
  const totalOverrides = jobCommissions.reduce((s, c) => s + (c.override_amount ?? 0), 0);
  const grandTotal = totalBase + totalOverrides;
  const afterDraws = totalBase - totalDraws;

  const handleAddRep = async () => {
    if (!newRep.rep_id || !newRep.amount) return;
    try {
      await createCommission.mutateAsync({
        rep_id: newRep.rep_id,
        job_id: jobId,
        amount: parseFloat(newRep.amount) || 0,
        notes: newRep.notes || "Manual entry",
      });
      toast({ title: "Commission added" });
      setNewRep({ rep_id: "", amount: "", notes: "" });
      setAdding(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (c: Commission) => {
    const next = c.status === "earned" ? "paid" : "earned";
    try {
      await updateStatus.mutateAsync({ id: c.id, status: next });
      toast({ title: `Marked ${next}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Commission Splits — War Chest ({jobCommissions.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="mr-1 h-3 w-3" /> Add Rep
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Summary badges */}
        {jobCommissions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-b">
            <Badge variant="outline" className="font-mono text-xs">Base: ${totalBase.toLocaleString()}</Badge>
            <Badge variant="outline" className="font-mono text-xs">Overrides: ${totalOverrides.toLocaleString()}</Badge>
            <Badge variant={afterDraws >= 0 ? "default" : "destructive"} className="font-mono text-xs ml-auto">
              After Draws: ${afterDraws.toLocaleString()}
            </Badge>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rep</TableHead>
              <TableHead>Base Amount</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adding && (
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Select value={newRep.rep_id || "placeholder"} onValueChange={v => v !== "placeholder" && setNewRep(f => ({ ...f, rep_id: v }))}>
                    <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Select rep" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>Select rep</SelectItem>
                      {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.name} ({(p.commission_rate * 100).toFixed(0)}%)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input type="number" value={newRep.amount} onChange={e => setNewRep(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="h-8 text-xs font-mono w-24" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">—</TableCell>
                <TableCell className="text-xs text-muted-foreground">Earned</TableCell>
                <TableCell>
                  <Input value={newRep.notes} onChange={e => setNewRep(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="h-8 text-xs" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleAddRep} disabled={createCommission.isPending}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdding(false)}>✕</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-sm">Loading...</TableCell></TableRow>
            ) : jobCommissions.length === 0 && !adding ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-sm">No commissions — auto-generated on job completion</TableCell></TableRow>
            ) : jobCommissions.map(c => {
              const repProfile = profiles.find(p => p.user_id === c.rep_id);
              const isOverride = (c.override_amount ?? 0) > 0 && c.amount === 0;
              return (
                <TableRow key={c.id} className="group">
                  <TableCell className="text-sm">
                    {repProfile?.name ?? "Unknown"}
                    {isOverride && <Badge variant="secondary" className="ml-1 text-[9px]">Override</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{c.amount > 0 ? `$${c.amount.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="font-mono text-sm text-accent">{(c.override_amount ?? 0) > 0 ? `$${c.override_amount!.toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Badge className={c.status === "paid" ? "bg-success/20 text-success-foreground" : "bg-warning/20 text-warning-foreground"}>
                      {c.status === "paid" ? "Paid" : "Earned"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{c.notes || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(c)} disabled={updateStatus.isPending}>
                      {c.status === "earned" ? "Pay" : "Unpay"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Victory gauge */}
        {jobCommissions.length > 0 && (
          <div className="px-4 py-3 border-t">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Victory Split Progress</span>
              <span className="font-mono font-bold text-foreground">
                {jobCommissions.filter(c => c.status === "paid").length}/{jobCommissions.length} Paid
              </span>
            </div>
            <Progress value={(jobCommissions.filter(c => c.status === "paid").length / jobCommissions.length) * 100} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
