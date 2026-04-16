import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSavedReports, useSaveReport, type SavedReportConfig } from "@/hooks/useSavedReports";
import { useReportJobs, useReportAssignments, useReportProfilesMap, runCustomReport, type CustomReportRow } from "@/hooks/useReportData";
import { useToast } from "@/hooks/use-toast";
import { Play, Save, Loader2 } from "lucide-react";

const GROUP_OPTIONS = [
  { value: "rep", label: "Sales Rep" },
  { value: "status", label: "Job Status" },
  { value: "month", label: "Month (created)" },
] as const;

const METRIC_OPTIONS = [
  { value: "squares_installed", label: "Squares Installed" },
  { value: "rcv", label: "RCV" },
  { value: "acv", label: "ACV" },
  { value: "job_count", label: "Job Count" },
] as const;

export function CustomReportRunner() {
  const { toast } = useToast();
  const { data: savedList = [] } = useSavedReports();
  const saveReport = useSaveReport();
  const { data: jobs = [] } = useReportJobs();
  const { data: assignmentsByJob = new Map() } = useReportAssignments();
  const { data: profileMap = new Map() } = useReportProfilesMap();

  const [selectedSavedId, setSelectedSavedId] = useState<string>("");
  const [groupBy, setGroupBy] = useState<"rep" | "status" | "month">("rep");
  const [metrics, setMetrics] = useState<("squares_installed" | "rcv" | "acv" | "job_count")[]>(["squares_installed", "rcv", "job_count"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportName, setReportName] = useState("");
  const [result, setResult] = useState<CustomReportRow[] | null>(null);

  const selectedSaved = useMemo(() => savedList.find((s) => s.id === selectedSavedId), [savedList, selectedSavedId]);

  const loadSaved = (id: string) => {
    const s = savedList.find((x) => x.id === id);
    if (s?.config_json) {
      setGroupBy((s.config_json.groupBy as any) ?? "rep");
      setMetrics((s.config_json.metrics as any) ?? ["squares_installed", "rcv", "job_count"]);
      setDateFrom(s.config_json.date_from ?? "");
      setDateTo(s.config_json.date_to ?? "");
    }
    setSelectedSavedId(id);
  };

  const config: SavedReportConfig = {
    groupBy,
    metrics,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    statuses: null,
  };

  const handleRun = () => {
    const rows = runCustomReport(jobs, assignmentsByJob, profileMap, config);
    setResult(rows);
  };

  const handleSave = async () => {
    const name = reportName.trim() || `Custom ${new Date().toLocaleDateString()}`;
    try {
      await saveReport.mutateAsync({ name, config_json: config });
      toast({ title: "Report saved" });
      setReportName(name);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const columns = result?.length
    ? (Object.keys(result[0]) as (keyof CustomReportRow)[])
    : [];

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 space-y-1.5 basis-[min(100%,14rem)] sm:flex-none sm:basis-auto">
          <Label className="text-xs">Saved report</Label>
          <Select value={selectedSavedId || "none"} onValueChange={(v) => (v === "none" ? setSelectedSavedId("") : loadSaved(v))}>
            <SelectTrigger className="min-w-0 w-full sm:w-[200px]">
              <SelectValue placeholder="Select saved…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {savedList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs">Group by</Label>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="min-w-0 w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs">Date from</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-w-0 w-full sm:w-[140px]" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs">Date to</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-w-0 w-full sm:w-[140px]" />
        </div>
        <Button onClick={handleRun}>
          <Play className="mr-2 h-3 w-3" /> Run
        </Button>
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            placeholder="Report name to save"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="min-w-0 flex-1 sm:w-[180px] sm:flex-none"
          />
          <Button variant="outline" onClick={handleSave} disabled={saveReport.isPending}>
            {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Metrics</Label>
        <div className="flex flex-wrap gap-4">
          {METRIC_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={metrics.includes(o.value as any)}
                onCheckedChange={(checked) =>
                  setMetrics((prev) =>
                    checked ? [...prev, o.value as any] : prev.filter((m) => m !== o.value))
                  }
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      {result && (
        <div
          className={cn(
            "mt-4 w-full min-w-0 rounded-md border border-border",
            columns.length > 8 ? "overflow-x-auto" : "overflow-x-hidden",
          )}
        >
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="min-w-0 break-words px-2 py-2 text-left text-xs font-semibold capitalize sm:px-3 sm:text-sm"
                  >
                    {String(col).replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                <tr key={i} className="border-b border-border/70">
                  {columns.map((col) => (
                    <td key={col} className="min-w-0 break-words px-2 py-2 text-xs sm:px-3 sm:text-sm">
                      {typeof row[col] === "number"
                        ? col === "rcv" || col === "acv"
                          ? `$${Number(row[col]).toLocaleString()}`
                          : Number(row[col]).toLocaleString()
                        : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
