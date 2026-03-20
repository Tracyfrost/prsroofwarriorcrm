import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { CustomReportRunner } from "./CustomReportRunner";

export function ReportCustom() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Custom Reports
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Run a saved report config or build one (group by rep, status, or month; metrics: squares installed, RCV, ACV, job count).
        </p>
      </CardHeader>
      <CardContent>
        <CustomReportRunner />
      </CardContent>
    </Card>
  );
}
