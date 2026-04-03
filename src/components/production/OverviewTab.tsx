import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MILESTONE_KEYS, type Qualification } from "@/hooks/useJobProduction";
import type { PaymentCheck } from "@/hooks/usePaymentChecks";
import { parseScopeMetadata, type ProductionItem } from "@/hooks/useProduction";
import type { JobExpense } from "@/hooks/useJobExpenses";
import type { JobTracking } from "@/hooks/useJobTracking";
import type { Draw } from "@/hooks/useDraws";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";
import {
  calcTotalExpenses, calcTotalBonuses, calcTotalCompanyExpenses,
  calcGrossProfit, calcCommissionProfit,
} from "@/hooks/useJobTracking";
import {
  worstQualificationStatus,
  sumLineEstimatedExposure,
  sumPreDrawAmounts,
  materialOrderReadinessPct,
  anyLineQualificationHold,
} from "@/lib/productionRollups";
import { CHECK_TYPES } from "@/hooks/usePaymentChecks";
import { differenceInDays, format } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, DollarSign, TrendingUp, Percent, ArrowDownRight } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success, 142 76% 36%))",
  "hsl(var(--warning, 45 93% 47%))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--secondary))",
];

interface Props {
  milestones: Record<string, string | null>;
  checks: PaymentCheck[];
  qualification: Qualification;
  numberOfSquares: number;
  productionItems: ProductionItem[];
  assignments: any[];
  profileMap: Map<string, any>;
  tracking?: JobTracking;
  itemizedExpenses?: JobExpense[];
  draws?: Draw[];
}

export function OverviewTab({
  milestones, checks, qualification, numberOfSquares,
  productionItems, assignments, profileMap, tracking, itemizedExpenses = [], draws = [],
}: Props) {
  const { data: productionStatuses = [] } = useProductionItemStatuses(true);

  // Milestone progress
  const filledMilestones = MILESTONE_KEYS.filter(({ key }) => milestones?.[key]);
  const milestoneProgress = (filledMilestones.length / MILESTONE_KEYS.length) * 100;

  // Days
  const leadDate = milestones?.date_lead ? new Date(milestones.date_lead) : null;
  const completionDate = milestones?.date_of_completion ? new Date(milestones.date_of_completion) : null;
  const daysInPipeline = leadDate ? differenceInDays(completionDate || new Date(), leadDate) : 0;

  // Unified financials
  const receivedChecksTotal = checks
    .filter(c => c.status === "Received" || c.status === "Deposited")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const allChecksTotal = checks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const manualIncome = tracking?.income ?? 0;
  const totalIncome = manualIncome + receivedChecksTotal;
  const trackingExpenses = calcTotalExpenses(tracking ?? {});
  const itemizedTotal = itemizedExpenses.reduce((s, e) => s + e.amount, 0);
  const secureExpenses = trackingExpenses + itemizedTotal;
  const totalBonuses = calcTotalBonuses(tracking ?? {});
  const companyExpenses = calcTotalCompanyExpenses(tracking ?? {});

  // Pay structure
  const grossProfit = calcGrossProfit(totalIncome, secureExpenses);
  const officeFeePct = tracking?.office_fee_pct ?? 5;
  const officeFee = grossProfit * (officeFeePct / 100);
  const commissionProfit = calcCommissionProfit(grossProfit, officeFeePct);
  const salesShare = tracking?.sales_share ?? 50;
  const managerShare = tracking?.manager_share ?? 10;
  const companySharePct = tracking?.company_share ?? 40;
  const salesCommissionRaw = commissionProfit * (salesShare / 100);
  const managerCommission = commissionProfit * (managerShare / 100);
  const companyCommission = commissionProfit * (companySharePct / 100);
  const totalDraws = draws.reduce((s, d) => s + d.amount, 0);
  const salesCommissionFinal = salesCommissionRaw - totalDraws;
  const marginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  // Check breakdown by type
  const checksByType = CHECK_TYPES.map(t => ({
    type: t,
    label: t.replace("_", " "),
    total: checks.filter(c => c.type === t).reduce((s, c) => s + (Number(c.amount) || 0), 0),
    count: checks.filter(c => c.type === t).length,
  })).filter(d => d.count > 0);

  // Production summary
  const totalProdCost = productionItems.reduce((s, i) => s + i.labor_cost + i.material_cost, 0);
  const completedItems = productionItems.filter(i => i.status === "complete" || i.status === "billed");
  const prodProgress = productionItems.length > 0 ? (completedItems.length / productionItems.length) * 100 : 0;

  // Status distribution for pie
  const statusCounts = productionItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: productionStatuses.find(s => s.name === status)?.display_name || status,
    value: count,
  }));

  // Bottlenecks
  const bottlenecks: string[] = [];
  if (qualification?.status === "Underfunded") bottlenecks.push("Job is underfunded");
  if (anyLineQualificationHold(productionItems)) bottlenecks.push("Production line gate: Hold");
  if (checks?.length === 0) bottlenecks.push("No checks received");
  const onHold = productionItems.filter(i => i.status === "on_hold");
  if (onHold.length > 0) bottlenecks.push(`${onHold.length} production item(s) on hold`);
  const installScheduled = milestones?.date_to_install;
  const installActual = milestones?.date_of_install;
  if (installScheduled && !installActual && new Date(installScheduled) < new Date()) {
    bottlenecks.push("Install date has passed without actual install");
  }
  if (manualIncome > 0 && receivedChecksTotal > 0 && Math.abs(manualIncome - receivedChecksTotal) > manualIncome * 0.2) {
    bottlenecks.push("Ledger Imbalance: Manual income differs from check totals");
  }
  if (grossProfit < 0) bottlenecks.push(`Net loss of $${Math.abs(grossProfit).toLocaleString()}`);
  if (totalDraws > salesCommissionRaw) bottlenecks.push("Draws exceed sales commission — overdrawn!");

  return (
    <div className="space-y-4">
      {/* Pay Structure KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <Card className="shadow-card border-success/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Total Income
            </p>
            <p className="text-lg font-bold text-foreground font-mono">${totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Secure Expenses</p>
            <p className="text-lg font-bold text-foreground font-mono">${secureExpenses.toLocaleString()}</p>
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
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" /> Draws
            </p>
            <p className="text-lg font-bold text-destructive font-mono">−${totalDraws.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">{draws.length} draw(s)</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sales Victory</p>
            <p className={`text-lg font-bold font-mono ${salesCommissionFinal >= 0 ? "text-success-foreground" : "text-destructive"}`}>
              ${salesCommissionFinal.toLocaleString()}
            </p>
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

      {/* Commission Splits + Days */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Commission Splits</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sales ({salesShare}%)</span>
              <span className="font-mono font-bold">${salesCommissionRaw.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Manager ({managerShare}%)</span>
              <span className="font-mono font-bold">${managerCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Company ({companySharePct}%)</span>
              <span className="font-mono font-bold">${companyCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Office Fee ({officeFeePct}%)</span>
              <span className="font-mono text-destructive">−${officeFee.toLocaleString()}</span>
            </div>
            {companyExpenses > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company Expenses</span>
                <span className="font-mono">${companyExpenses.toLocaleString()}</span>
              </div>
            )}
            {totalBonuses > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bonuses</span>
                <span className="font-mono">${totalBonuses.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checks by type */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Checks by Type</CardTitle></CardHeader>
          <CardContent>
            {checksByType.length === 0 ? (
              <p className="text-xs text-muted-foreground">No checks recorded</p>
            ) : (
              <div className="space-y-2">
                {checksByType.map(ct => (
                  <div key={ct.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{ct.label}</Badge>
                      <span className="text-xs text-muted-foreground">({ct.count})</span>
                    </div>
                    <span className="font-mono text-sm font-bold">${ct.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm font-medium">All Checks</span>
                  <span className="font-mono text-sm font-bold">${allChecksTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress + Days */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-bold">{Math.round(milestoneProgress)}%</span>
              </div>
              <Progress value={milestoneProgress} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Production ({completedItems.length}/{productionItems.length})</span>
                <span className="font-bold">{Math.round(prodProgress)}%</span>
              </div>
              <Progress value={prodProgress} className="h-2" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Production Cost</span>
              <span className="font-mono font-bold">${totalProdCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs border-t pt-2">
              <span className="text-muted-foreground">Days in Pipeline</span>
              <span className="font-bold">{daysInPipeline} {leadDate ? `(since ${format(leadDate, "MMM d")})` : ""}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {productionItems.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm">Production lines (War Room)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Worst gate: {worstQualificationStatus(productionItems) || "—"}</Badge>
                <Badge variant="outline">Material readiness: {materialOrderReadinessPct(productionItems)}%</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Line exposure (est.)</span>
                <span className="font-mono font-semibold">${sumLineEstimatedExposure(productionItems).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pre-draw (lines)</span>
                <span className="font-mono font-semibold">${sumPreDrawAmounts(productionItems).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Qualification */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Qualification (job-level)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={
                qualification?.status === "Qualified" ? "bg-success/20 text-success-foreground" :
                qualification?.status === "Underfunded" ? "bg-destructive/20 text-destructive-foreground" :
                "bg-warning/20 text-warning-foreground"
              }>
                {qualification?.status || "Not Set"}
              </Badge>
              {numberOfSquares > 0 && <span className="text-xs text-muted-foreground">{numberOfSquares} squares</span>}
            </div>
            {qualification?.estimate_cost ? (
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Estimate:</span><span className="font-mono">${qualification.estimate_cost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">First Check:</span><span className="font-mono">${(qualification.first_check_funds ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Variance:</span><span className={`font-mono font-bold ${(qualification.variance ?? 0) > 0 ? "text-destructive" : "text-success-foreground"}`}>${Math.abs(qualification.variance ?? 0).toLocaleString()}</span></div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No qualification data entered</p>
            )}
          </CardContent>
        </Card>

        {/* Production status pie */}
        {pieData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm">Production Status</CardTitle></CardHeader>
            <CardContent className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {productionItems.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Line scope (War Room)</CardTitle>
            <p className="text-xs text-muted-foreground">Shingle, pitch, drop, and delivery from each production line.</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {productionItems.map((item) => {
              const m = parseScopeMetadata(item.scope_metadata);
              const drop = item.drop_location?.trim();
              const del = item.delivery_date
                ? format(new Date(item.delivery_date), "MMM d, yyyy")
                : null;
              const hasAny =
                m.shingle_style ||
                m.shingle_manufacturer ||
                m.shingle_color ||
                m.drip_edge_color ||
                m.pitch ||
                drop ||
                del;
              return (
                <div key={item.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{item.trade_types?.name || "Line"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {item.material_order_status || "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.scope_description || "—"}</p>
                  {!hasAny ? (
                    <p className="text-xs text-muted-foreground">No scope metadata yet — edit in War Room workbook.</p>
                  ) : (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 text-xs">
                      {m.shingle_style ? (
                        <>
                          <dt className="text-muted-foreground">Product / style</dt>
                          <dd>{m.shingle_style}</dd>
                        </>
                      ) : null}
                      {m.shingle_manufacturer ? (
                        <>
                          <dt className="text-muted-foreground">Manufacturer</dt>
                          <dd>{m.shingle_manufacturer}</dd>
                        </>
                      ) : null}
                      {m.shingle_color ? (
                        <>
                          <dt className="text-muted-foreground">Shingle color</dt>
                          <dd>{m.shingle_color}</dd>
                        </>
                      ) : null}
                      {m.drip_edge_color ? (
                        <>
                          <dt className="text-muted-foreground">Drip edge color</dt>
                          <dd>{m.drip_edge_color}</dd>
                        </>
                      ) : null}
                      {m.pitch ? (
                        <>
                          <dt className="text-muted-foreground">Pitch</dt>
                          <dd>{m.pitch}</dd>
                        </>
                      ) : null}
                      {drop ? (
                        <>
                          <dt className="text-muted-foreground">Drop location</dt>
                          <dd>{drop}</dd>
                        </>
                      ) : null}
                      {del ? (
                        <>
                          <dt className="text-muted-foreground">Material delivery</dt>
                          <dd>{del}</dd>
                        </>
                      ) : null}
                    </dl>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <Card className="shadow-card border-destructive/30">
          <CardHeader><CardTitle className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Bottlenecks & Alerts</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {bottlenecks.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Team */}
      {assignments.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Assigned Team</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {assignments.map((a: any) => {
                const profile = profileMap.get(a.user_id);
                return (
                  <div key={a.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 bg-muted/50">
                    <span className="text-sm font-medium">{profile?.name || "Unknown"}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{a.assignment_role}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
