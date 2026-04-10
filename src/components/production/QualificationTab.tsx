import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  PanelRight,
  Download,
  Calculator,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateQualification, type Qualification } from "@/hooks/useJobProduction";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ProductionItem } from "@/hooks/useProduction";
import type { Draw } from "@/hooks/useDraws";
import { DRAW_TYPES } from "@/hooks/useDraws";
import {
  worstQualificationStatus,
  sumLineEstimatedExposure,
  sumPreDrawAmounts,
} from "@/lib/productionRollups";
import {
  mergeJobOrderingLines,
  type JobOrderingLine,
} from "@/lib/jobOrderingTemplate";
import {
  computeWarRoomQualificationMetrics,
  defaultDrawInclusions,
} from "@/lib/qualificationCalculations";
import { resolvePlanningRoofSquares, type PlanningJobSquares } from "@/lib/roofSquares";
import { buildJobOrderingWorksheetCsv } from "@/lib/orderFormCsv";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { color: string; icon: typeof ShieldCheck; label: string }> = {
  Qualified: { color: "bg-success/20 text-success-foreground", icon: ShieldCheck, label: "Qualified" },
  Review: { color: "bg-warning/20 text-warning-foreground", icon: AlertTriangle, label: "Under Review" },
  Underfunded: { color: "bg-destructive/20 text-destructive-foreground", icon: XCircle, label: "Underfunded" },
};

const LINE_GATE_CONFIG: Record<string, { color: string; label: string }> = {
  Go: { color: "bg-success/20 text-success-foreground", label: "Go" },
  Hold: { color: "bg-destructive/20 text-destructive-foreground", label: "Hold" },
  Supplement: { color: "bg-warning/20 text-warning-foreground", label: "Supplement" },
  Pending: { color: "bg-muted text-muted-foreground", label: "Pending" },
};

const JOB_GATE_BADGE: Record<string, string> = {
  Go: "bg-success/20 text-success-foreground border-success/30",
  Hold: "bg-destructive/20 text-destructive-foreground border-destructive/30",
  Supplement: "bg-warning/20 text-warning-foreground border-warning/30",
};

function normalizeDraft(q: Qualification): Qualification {
  return {
    ...q,
    estimated_cost_draw_inclusions: {
      ...defaultDrawInclusions(),
      ...(q.estimated_cost_draw_inclusions ?? {}),
    },
    job_ordering_lines: mergeJobOrderingLines(q.job_ordering_lines),
  };
}

interface Props {
  jobId: string;
  jobDisplayId?: string;
  qualification: Qualification;
  planningJobSquares: PlanningJobSquares;
  productionItems?: ProductionItem[];
  draws?: Draw[];
  receivedChecksTotal?: number;
  onNavigateWarRoom?: () => void;
}

export function QualificationTab({
  jobId,
  jobDisplayId,
  qualification,
  planningJobSquares,
  productionItems = [],
  draws = [],
  receivedChecksTotal = 0,
  onNavigateWarRoom,
}: Props) {
  const qualSnapshot = useMemo(() => JSON.stringify(qualification ?? {}), [qualification]);
  const [draft, setDraft] = useState<Qualification>(() => normalizeDraft(qualification));
  const updateQual = useUpdateQualification();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const parsed = JSON.parse(qualSnapshot) as Qualification;
      setDraft(normalizeDraft(parsed));
    } catch {
      setDraft(normalizeDraft({}));
    }
  }, [qualSnapshot, jobId]);

  const metrics = useMemo(
    () => computeWarRoomQualificationMetrics(draft, draws, receivedChecksTotal, planningJobSquares),
    [draft, draws, receivedChecksTotal, planningJobSquares],
  );

  const planningSq = useMemo(
    () => resolvePlanningRoofSquares(planningJobSquares, draft as Record<string, unknown>),
    [planningJobSquares, draft],
  );

  const orderingLines = useMemo(
    () => mergeJobOrderingLines(draft.job_ordering_lines),
    [draft.job_ordering_lines],
  );

  const setLine = useCallback((index: number, patch: Partial<JobOrderingLine>) => {
    const next = orderingLines.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setDraft((d) => ({ ...d, job_ordering_lines: next }));
  }, [orderingLines]);

  const handleSave = async () => {
    try {
      await updateQual.mutateAsync({
        id: jobId,
        qualification: {
          ...draft,
          job_ordering_lines: orderingLines,
        },
      });
      toast({ title: "War Room qualification saved" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const exportOrderCsv = () => {
    const { csv, filename } = buildJobOrderingWorksheetCsv({
      jobDisplayId,
      jobId,
      planningSq,
      orderingLines,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Order form CSV downloaded" });
  };

  const variance = metrics.legacyVariance;
  const status =
    variance <= 0 ? "Qualified" : variance < 10000 ? "Review" : "Underfunded";
  const displayStatus = draft.status || status;
  const displayVariance = draft.variance ?? variance;
  const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Review;
  const StatusIcon = config.icon;

  const chartData = [
    { name: "Total job cost", value: metrics.totalJobCost },
    { name: "Funds received", value: metrics.fundsReceived },
    { name: "Est. rollup", value: metrics.estimatedCostRollup },
  ];

  const worstGate = worstQualificationStatus(productionItems);
  const lineExposure = sumLineEstimatedExposure(productionItems);
  const preDrawSum = sumPreDrawAmounts(productionItems);
  const lineGateCfg = worstGate ? LINE_GATE_CONFIG[worstGate] || LINE_GATE_CONFIG.Pending : null;
  const jobGateClass = JOB_GATE_BADGE[metrics.jobLevelGate] || JOB_GATE_BADGE.Hold;

  const num = (v: string) => (v.trim() === "" ? undefined : parseFloat(v));
  const str = (v: string | undefined) => v ?? "";

  return (
    <div className="space-y-4">
      {/* KPI bar */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            War Room qualification (live)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Job-level gate reflects funds vs job cost. Line gate (worst production line) is separate — a line can be Hold even when job-level looks Go.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Job gate</p>
            <Badge className={`mt-1 w-fit border ${jobGateClass}`}>{metrics.jobLevelGate}</Badge>
          </div>
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Line gate (worst)</p>
            {lineGateCfg ? (
              <Badge className={`mt-1 w-fit border ${lineGateCfg.color}`}>{lineGateCfg.label}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Qual. squares</p>
            <p className="font-mono text-lg font-semibold">{metrics.qualifyingSquares.toLocaleString()}</p>
          </div>
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Roof line ($)</p>
            <p className="font-mono text-lg font-semibold">${metrics.roofLineCost.toLocaleString()}</p>
          </div>
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Funds received</p>
            <p className="font-mono text-lg font-semibold">${metrics.fundsReceived.toLocaleString()}</p>
          </div>
          <div className="flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Difference</p>
            <p
              className={`font-mono text-lg font-semibold ${metrics.difference >= 0 ? "text-success-foreground" : "text-destructive"}`}
            >
              ${metrics.difference.toLocaleString()}
            </p>
          </div>
          <div className="col-span-2 flex min-h-[44px] flex-col justify-center rounded-md border bg-muted/30 px-2 py-2 md:col-span-2 lg:col-span-2">
            <p className="text-[10px] uppercase text-muted-foreground">Profit projected</p>
            <p
              className={`font-mono text-xl font-bold ${metrics.totalProfitProjected >= 0 ? "text-success-foreground" : "text-destructive"}`}
            >
              ${metrics.totalProfitProjected.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {productionItems.length > 0 && (
        <Card className="shadow-card border-primary/20">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm">Line qualification (War Room)</CardTitle>
            {onNavigateWarRoom && (
              <Button type="button" variant="outline" size="sm" className="h-8 min-h-[44px] sm:min-h-0" onClick={onNavigateWarRoom}>
                <PanelRight className="mr-2 h-3.5 w-3.5" />
                Open War Room
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {lineGateCfg && (
                <Badge className={lineGateCfg.color + " border"}>{lineGateCfg.label} (worst line)</Badge>
              )}
              <span className="text-muted-foreground">
                {productionItems.length} line{productionItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Line exposure (est.)</p>
                <p className="font-mono font-semibold">${lineExposure.toLocaleString()}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Pre-draw (lines)</p>
                <p className="font-mono font-semibold">${preDrawSum.toLocaleString()}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Checks received (job)</p>
                <p className="font-mono font-semibold">${receivedChecksTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className={`rounded-full p-3 ${config.color}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Badge className={config.color + " text-sm px-3 py-1"}>{config.label}</Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Legacy variance (est. − first check):{" "}
              <span className={`font-bold ${displayVariance > 0 ? "text-destructive" : "text-success-foreground"}`}>
                ${Math.abs(displayVariance).toLocaleString()}
              </span>
              {displayVariance > 0 ? " underfunded" : " surplus"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Remove / replace &amp; pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Squares pull off</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.squares_pull_off ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      squares_pull_off: num(e.target.value) ?? 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Squares put back</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.squares_put_back ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      squares_put_back: num(e.target.value) ?? 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Price per SQ ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.price_per_sq ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      price_per_sq: num(e.target.value) ?? 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Planning roof SQ (read-only)</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm tabular-nums">
                  {planningSq > 0 ? planningSq.toLocaleString() : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Master squares are set on the <span className="font-medium text-foreground">Measurements</span> tab (
                  <span className="font-mono">jobs.squares_estimated</span>). Use &quot;Copy planning SQ to legacy&quot;
                  below if an export needs <span className="font-mono">qualification.estimate_roof_sq</span>.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manual estimate cost ($) — legacy trigger</Label>
              <Input
                type="number"
                value={draft.estimate_cost ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    estimate_cost: num(e.target.value) ?? 0,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">First check funds ($)</Label>
              <Input
                type="number"
                value={draft.first_check_funds ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    first_check_funds: num(e.target.value) ?? 0,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Scope &amp; logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Scope SQ&apos;s (all structures)</Label>
                <Input
                  value={str(draft.scope_sq_all_structures)}
                  onChange={(e) => setDraft((d) => ({ ...d, scope_sq_all_structures: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Actual SQ&apos;s</Label>
                <Input
                  value={str(draft.scope_actual_sq)}
                  onChange={(e) => setDraft((d) => ({ ...d, scope_actual_sq: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shingle type</Label>
                <Input
                  value={str(draft.shingle_type)}
                  onChange={(e) => setDraft((d) => ({ ...d, shingle_type: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shingle color</Label>
                <Input
                  value={str(draft.shingle_color)}
                  onChange={(e) => setDraft((d) => ({ ...d, shingle_color: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Drip edge color</Label>
                <Input
                  value={str(draft.drip_edge_color)}
                  onChange={(e) => setDraft((d) => ({ ...d, drip_edge_color: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Roof pitch</Label>
                <Input
                  value={str(draft.roof_pitch)}
                  onChange={(e) => setDraft((d) => ({ ...d, roof_pitch: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Materials drop location</Label>
                <Input
                  value={str(draft.materials_drop_location)}
                  onChange={(e) => setDraft((d) => ({ ...d, materials_drop_location: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Material delivery date</Label>
                <Input
                  type="date"
                  value={draft.material_delivery_date?.split("T")[0] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, material_delivery_date: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional comments</Label>
              <Textarea
                rows={3}
                value={str(draft.additional_comments)}
                onChange={(e) => setDraft((d) => ({ ...d, additional_comments: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm">Sales draws → estimated cost rollup</CardTitle>
          <p className="text-xs text-muted-foreground">
            Toggle which draw types add into the rollup (shown below). Rollup = manual estimate + selected draws.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {DRAW_TYPES.map((t) => (
              <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={!!draft.estimated_cost_draw_inclusions?.[t]}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({
                      ...d,
                      estimated_cost_draw_inclusions: {
                        ...defaultDrawInclusions(),
                        ...d.estimated_cost_draw_inclusions,
                        [t]: !!c,
                      },
                    }))
                  }
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Draws subtotal (selected)</span>
              <span className="font-mono font-semibold">${metrics.drawsSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-muted-foreground">Estimated cost rollup</span>
              <span className="font-mono font-bold">${metrics.estimatedCostRollup.toLocaleString()}</span>
            </div>
          </div>
          {draws.length === 0 ? (
            <p className="text-xs text-muted-foreground">No draws recorded for this job.</p>
          ) : (
            <ul className="text-xs space-y-1 text-muted-foreground">
              {draws.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span>
                    {d.type} — {d.draw_date}
                  </span>
                  <span className="font-mono">${(Number(d.amount) || 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Job ordering</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              The SQ column is planning roof squares. Set the master value on the <span className="font-medium text-foreground">Measurements</span> tab; the resolver may fall back to scope text or legacy fields only when master is unset.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => {
                if (planningSq <= 0) {
                  toast({
                    title: "Set planning SQ first",
                    description: "Enter master planning squares on the Measurements tab (calculator or GAF PDF).",
                    variant: "destructive",
                  });
                  return;
                }
                setDraft((d) => ({ ...d, estimate_roof_sq: planningSq }));
                toast({
                  title: "Legacy field updated in draft",
                  description: "qualification.estimate_roof_sq matches planning SQ — save qualification to persist.",
                });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy planning SQ to legacy
            </Button>
            <Button type="button" variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto" onClick={exportOrderCsv}>
              <Download className="mr-2 h-4 w-4" />
              Generate order form (CSV)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 whitespace-nowrap">Q1</TableHead>
                  <TableHead className="min-w-[120px]">Material</TableHead>
                  <TableHead className="w-24">Q2</TableHead>
                  <TableHead className="w-24">Q3</TableHead>
                  <TableHead className="w-16 text-center">SQ</TableHead>
                  <TableHead className="w-20">50&apos;</TableHead>
                  <TableHead className="w-20">25&apos;</TableHead>
                  <TableHead className="w-16">Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderingLines.map((row, idx) => (
                  <TableRow key={row.key}>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 min-w-[4rem] text-xs"
                        value={row.q1}
                        onChange={(e) => setLine(idx, { q1: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1 text-xs font-medium">{row.label}</TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 min-w-[4rem] text-xs"
                        value={row.q2}
                        onChange={(e) => setLine(idx, { q2: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 min-w-[4rem] text-xs"
                        value={row.q3}
                        onChange={(e) => setLine(idx, { q3: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1 text-center text-xs font-mono text-muted-foreground">
                      {planningSq > 0 ? planningSq.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 w-16 text-xs"
                        value={row.valley50ft}
                        onChange={(e) => setLine(idx, { valley50ft: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 w-16 text-xs"
                        value={row.valley25ft}
                        onChange={(e) => setLine(idx, { valley25ft: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Checkbox
                        checked={row.flag}
                        onCheckedChange={(c) => setLine(idx, { flag: !!c })}
                        aria-label="Flag"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Job qualifying</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex min-h-[44px] items-center gap-2">
                <Checkbox
                  checked={!!draft.qualify_yes}
                  onCheckedChange={(c) => setDraft((d) => ({ ...d, qualify_yes: !!c }))}
                />
                <span>Qualify = Yes</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Deductible ($)</Label>
                <Input
                  type="number"
                  value={draft.deductible ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, deductible: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimate line ($)</Label>
                <Input
                  type="number"
                  value={draft.estimate_line ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, estimate_line: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eagleview ($)</Label>
                <Input
                  type="number"
                  value={draft.eagleview_fee ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, eagleview_fee: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pre-draw manual ($)</Label>
                <Input
                  type="number"
                  placeholder="10% of first check if empty"
                  value={draft.pre_draw_amount_manual ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      pre_draw_amount_manual: e.target.value === "" ? undefined : num(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Job cost ($)</Label>
                <Input
                  type="number"
                  value={draft.job_cost_misc ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, job_cost_misc: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rolled roofing ($)</Label>
                <Input
                  type="number"
                  value={draft.rolled_roofing ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, rolled_roofing: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">2-story fee ($)</Label>
                <Input
                  type="number"
                  value={draft.two_story_fee ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, two_story_fee: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Installer pay total ($)</Label>
                <Input
                  type="number"
                  value={draft.installer_pay_total ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, installer_pay_total: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gutters ($)</Label>
                <Input
                  type="number"
                  value={draft.gutters ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, gutters: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Patio ($)</Label>
                <Input
                  type="number"
                  value={draft.patio ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, patio: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Interior ($)</Label>
                <Input
                  type="number"
                  value={draft.interior ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, interior: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Supp / appr fee ($)</Label>
                <Input
                  type="number"
                  value={draft.supp_appr_fee ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, supp_appr_fee: num(e.target.value) ?? 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recoverable depreciation ($)</Label>
                <Input
                  type="number"
                  value={draft.recoverable_depreciation ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, recoverable_depreciation: num(e.target.value) ?? 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Other cost projected ($)</Label>
                <Input
                  type="number"
                  value={draft.other_cost_projected ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, other_cost_projected: num(e.target.value) ?? 0 }))
                  }
                />
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pre-draw (calc)</span>
                <span>${metrics.preDrawAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job cost base total</span>
                <span className="font-semibold">${metrics.jobCostBaseTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total job cost</span>
                <span className="font-bold">${metrics.totalJobCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funds received on job</span>
                <span>${metrics.fundsReceived.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difference</span>
                <span className={metrics.difference >= 0 ? "text-success-foreground" : "text-destructive"}>
                  ${metrics.difference.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total profit projected</span>
                <span className={metrics.totalProfitProjected >= 0 ? "text-success-foreground" : "text-destructive"}>
                  ${metrics.totalProfitProjected.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Costs vs funds</CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0
                          ? "hsl(var(--primary))"
                          : i === 1
                            ? "hsl(var(--success, 142 76% 36%))"
                            : "hsl(var(--muted-foreground))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={updateQual.isPending} className="w-full min-h-[48px]">
        <Save className="mr-2 h-4 w-4" />
        Save War Room &amp; recalculate
      </Button>
    </div>
  );
}
