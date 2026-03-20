import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Clock, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateMilestones, useMilestoneHistory } from "@/hooks/useJobProduction";
import { useProductionMilestones } from "@/hooks/useCustomizations";
import { format, differenceInDays, isPast, parseISO } from "date-fns";

interface Props {
  jobId: string;
  milestones: Record<string, string | null>;
}

export function MilestonesTab({ jobId, milestones }: Props) {
  const { data: milestoneConfig = [] } = useProductionMilestones(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const updateMilestones = useUpdateMilestones();
  const { data: history = [] } = useMilestoneHistory(jobId);
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const init: Record<string, string> = {};
    milestoneConfig.forEach(({ name }) => {
      const val = milestones?.[name];
      init[name] = val ? val.substring(0, 10) : "";
    });
    setDraft(init);
  }, [milestones, milestoneConfig]);

  const handleSave = async () => {
    const payload: Record<string, string | null> = {};
    milestoneConfig.forEach(({ name }) => {
      payload[name] = draft[name] ? new Date(draft[name]).toISOString() : null;
    });
    try {
      await updateMilestones.mutateAsync({ id: jobId, milestones: payload });
      toast({ title: "Milestones saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filledMilestones = milestoneConfig.filter(({ name }) => draft[name]);
  const totalMilestones = milestoneConfig.length;
  const progress = totalMilestones > 0 ? (filledMilestones.length / totalMilestones) * 100 : 0;

  // Check for delays between scheduled and actual install
  const installScheduledKey = milestoneConfig.find(m => m.name === "date_to_install");
  const installActualKey = milestoneConfig.find(m => m.name === "date_of_install");
  const installScheduled = installScheduledKey && draft[installScheduledKey.name] ? parseISO(draft[installScheduledKey.name]) : null;
  const installActual = installActualKey && draft[installActualKey.name] ? parseISO(draft[installActualKey.name]) : null;
  const installDelay = installScheduled && installActual
    ? differenceInDays(installActual, installScheduled)
    : installScheduled && !installActual && isPast(installScheduled)
      ? differenceInDays(new Date(), installScheduled)
      : 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Milestone Progress</p>
            <span className="text-xs text-muted-foreground">{filledMilestones.length}/{totalMilestones}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          {installDelay > 0 && (
            <Badge variant="destructive" className="mt-2 text-xs">
              ⚠ Install delayed by {installDelay} day{installDelay > 1 ? "s" : ""}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Milestone Dates
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-1 h-3 w-3" /> History
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMilestones.isPending}>
              <Save className="mr-1 h-3 w-3" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {milestoneConfig.map(({ name, display_name }, idx) => {
              const isCompleted = !!draft[name];
              const prevKey = idx > 0 ? milestoneConfig[idx - 1].name : null;
              const isNext = !isCompleted && (!prevKey || !!draft[prevKey]);
              return (
                <div key={name} className={`space-y-1.5 rounded-lg border p-3 ${isNext ? "border-primary bg-primary/5" : isCompleted ? "border-success/30 bg-success/5" : ""}`}>
                  <Label className="text-xs font-medium">{display_name}</Label>
                  <Input
                    type="date"
                    value={draft[name] || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  {isCompleted && <Badge variant="outline" className="text-[9px]">✓ Set</Badge>}
                  {isNext && <Badge className="text-[9px] bg-primary/20 text-primary-foreground">Next</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showHistory && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Change History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No changes recorded yet</TableCell></TableRow>
                ) : history.map((h) => {
                  const milestoneLabel = milestoneConfig.find(m => m.name === h.milestone_type)?.display_name || h.milestone_type;
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm font-medium">{milestoneLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.old_value ? format(new Date(h.old_value), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {h.new_value ? format(new Date(h.new_value), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(h.changed_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
