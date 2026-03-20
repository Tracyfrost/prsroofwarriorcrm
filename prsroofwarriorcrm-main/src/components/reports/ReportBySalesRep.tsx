import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBySalesRepReport } from "@/hooks/useReportData";
import { Users, Loader2 } from "lucide-react";

export function ReportBySalesRep() {
  const { data, isLoading, error } = useBySalesRepReport();

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
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
          <Users className="h-4 w-4" /> By Sales Rep
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total Squares Installed uses squares_actual_installed (fallback: squares_final, then number_of_squares). Rep = primary_rep from job_assignments else job sales_rep_id; sub-jobs inherit main job rep unless overridden.
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No jobs with rep attribution yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold">Rep Name</th>
                  <th className="text-right py-2 font-semibold">Total Squares Installed</th>
                  <th className="text-right py-2 font-semibold">Total RCV</th>
                  <th className="text-right py-2 font-semibold">Total ACV</th>
                  <th className="text-right py-2 font-semibold">Job Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.rep_id} className="border-b border-border/70">
                    <td className="py-2">{row.rep_name}</td>
                    <td className="text-right py-2 font-mono">{row.squares_installed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right py-2 font-mono">${row.rcv_total.toLocaleString()}</td>
                    <td className="text-right py-2 font-mono">${row.acv_total.toLocaleString()}</td>
                    <td className="text-right py-2">{row.job_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
