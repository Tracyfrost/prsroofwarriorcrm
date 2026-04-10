import { useUpdateMilestones } from "@/hooks/useJobProduction";
import { useProductionMilestones } from "@/hooks/useCustomizations";
import { useJob } from "@/hooks/useJobs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MilestonesMainTab({ jobId }: { jobId: string }) {
  const { data: job } = useJob(jobId);
  const { data: milestoneDefs = [] } = useProductionMilestones(true);
  const updateMilestones = useUpdateMilestones();
  const { toast } = useToast();

  const milestones = (job?.production_milestones as Record<string, string | null> | null | undefined) ?? {};

  const handleDateChange = async (key: string, date: string) => {
    const updatedMilestones: Record<string, string | null> = {
      ...milestones,
      [key]: date ? new Date(date).toISOString() : null,
    };
    try {
      await updateMilestones.mutateAsync({ id: jobId, milestones: updatedMilestones });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update milestone";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Milestone Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {milestoneDefs.map((m) => (
          <div
            key={m.name}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <Label className="shrink-0 font-medium sm:w-40">{m.display_name}</Label>
            <Input
              type="date"
              value={milestones[m.name] ? String(milestones[m.name]).slice(0, 10) : ""}
              onChange={(e) => handleDateChange(m.name, e.target.value)}
              disabled={updateMilestones.isPending}
              className="w-full sm:max-w-xs"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
