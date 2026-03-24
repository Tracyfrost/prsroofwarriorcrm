import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSquaresSummaryReport } from "@/hooks/useReportData";
import { Ruler, Loader2 } from "lucide-react";

export function ReportSquaresSummary() {
  const { data, isLoading, error } = useSquaresSummaryReport();

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="h-4 w-4" /> Squares Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Company-wide totals for estimated, actual installed, and final squares.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated</p>
            <p className="mt-1 text-2xl font-bold font-mono">{data.total_estimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actual Installed</p>
            <p className="mt-1 text-2xl font-bold font-mono">{data.total_actual_installed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Final</p>
            <p className="mt-1 text-2xl font-bold font-mono">{data.total_final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Variance (Actual − Estimated)</p>
            <p className={`mt-1 text-lg font-mono ${data.variance_estimated_vs_actual >= 0 ? "text-foreground" : "text-amber-600"}`}>
              {data.variance_estimated_vs_actual >= 0 ? "+" : ""}{data.variance_estimated_vs_actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Variance (Final − Actual Installed)</p>
            <p className={`mt-1 text-lg font-mono ${data.variance_actual_vs_final >= 0 ? "text-foreground" : "text-amber-600"}`}>
              {data.variance_actual_vs_final >= 0 ? "+" : ""}{data.variance_actual_vs_final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
