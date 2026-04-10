import { useProductionMilestones } from "@/hooks/useCustomizations";
import { useJob } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isValid, parseISO } from "date-fns";

function formatMilestoneDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const d = parseISO(String(raw));
    return isValid(d) ? format(d, "MMM d, yyyy") : null;
  } catch {
    return null;
  }
}

export default function MilestonesSubTab({ jobId }: { jobId: string }) {
  const { data: job } = useJob(jobId);
  const { data: milestoneDefs = [] } = useProductionMilestones(true);
  const milestones = (job?.production_milestones as Record<string, string | null> | null | undefined) ?? {};

  const filledCount = milestoneDefs.filter((m) => !!milestones[m.name]).length;
  const total = milestoneDefs.length;

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>Milestone Progress</span>
            <span className="text-sm font-normal text-muted-foreground">
              {total > 0 ? `${filledCount}/${total}` : "—"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {milestoneDefs.map(({ name, display_name }) => {
              const formatted = formatMilestoneDate(milestones[name]);
              return (
                <Card key={name} className="border shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{display_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">
                      {formatted ?? "Not Set"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
