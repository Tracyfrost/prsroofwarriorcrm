import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { AppointmentOutcomeFields } from "./AppointmentOutcomeFields";
import { NewAppointmentDialog } from "./NewAppointmentDialog";
import {
  buildAppointmentOutcomePayload,
  parseStoredAppointment,
  type OutcomeRating,
} from "./appointmentOutcomeModel";
import { outcomeRatingBadgeClass } from "./AppointmentOutcomeSummary";

export function JobAppointmentsBlock({
  jobId,
  appointments,
  layout = "default",
  addMode = "inline",
}: {
  jobId: string;
  appointments: any[];
  layout?: "default" | "sidebar";
  addMode?: "inline" | "dialog";
}) {
  const sidebar = layout === "sidebar";
  const { toast } = useToast();
  const { can } = usePermissions();
  const canEditRows = can("edit_appointment");
  const canAdd = can("add_appointment");
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();

  const [apptDate, setApptDate] = useState("");
  const [showDialogAdd, setShowDialogAdd] = useState(false);
  const [dialogDate, setDialogDate] = useState("");
  const [dialogTime, setDialogTime] = useState("09:00");
  const [addRating, setAddRating] = useState<OutcomeRating>("");
  const [addNotes, setAddNotes] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editDateLocal, setEditDateLocal] = useState("");
  const [editRating, setEditRating] = useState<OutcomeRating>("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (a: any) => {
    setEditing(a);
    setEditDateLocal(format(new Date(a.date_time), "yyyy-MM-dd'T'HH:mm"));
    const p = parseStoredAppointment(a);
    setEditRating(p.rating);
    setEditNotes(p.notes);
  };

  const closeEdit = () => setEditing(null);

  const handleAdd = async () => {
    if (!apptDate) return;
    const { outcome, notes } = buildAppointmentOutcomePayload(addRating, addNotes);
    try {
      await createAppointment.mutateAsync({
        job_id: jobId,
        date_time: new Date(apptDate).toISOString(),
        outcome: outcome || undefined,
        notes: notes || undefined,
      });
      setApptDate("");
      setAddRating("");
      setAddNotes("");
      toast({ title: "Appointment added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const { outcome, notes } = buildAppointmentOutcomePayload(editRating, editNotes);
    try {
      await updateAppointment.mutateAsync({
        id: editing.id,
        date_time: new Date(editDateLocal).toISOString(),
        outcome,
        notes,
      });
      toast({ title: "Appointment updated" });
      closeEdit();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className={sidebar ? "py-3" : undefined}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className={sidebar ? "space-y-3 px-4 pb-4 pt-0" : "space-y-4"}>
          <div className={sidebar ? "max-h-44 space-y-2 overflow-y-auto pr-0.5" : "space-y-2"}>
            {appointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments yet.</p>}
            {appointments.map((appointment: any) => {
              const { rating, notes: n, legacyOutcomeLine } = parseStoredAppointment(appointment);
              return (
                <div
                  key={appointment.id}
                  className={`flex flex-wrap items-start justify-between gap-2 rounded-lg border ${sidebar ? "p-2" : "p-3"}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-sm">
                      {format(new Date(appointment.date_time), "MMM d, yyyy h:mm a")}
                    </p>
                    {legacyOutcomeLine ? (
                      <p className="text-xs text-muted-foreground">{legacyOutcomeLine}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {rating ? (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold", outcomeRatingBadgeClass(rating))}
                        >
                          {rating}
                        </Badge>
                      ) : null}
                      {n ? <span>{n}</span> : null}
                    </div>
                  </div>
                  {canEditRows ? (
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => openEdit(appointment)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
          {canAdd ? (
            <div className={`border-t ${sidebar ? "space-y-2 pt-3" : "space-y-3 pt-4"}`}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add appointment</p>
              {addMode === "dialog" ? (
                <Button
                  className="min-h-[44px] w-full"
                  onClick={() => {
                    const now = new Date();
                    setDialogDate(format(now, "yyyy-MM-dd"));
                    setDialogTime(format(now, "HH:mm"));
                    setShowDialogAdd(true);
                  }}
                >
                  Add appointment
                </Button>
              ) : (
                <>
                  <Input type="datetime-local" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
                  <AppointmentOutcomeFields
                    idPrefix={`job-appt-${jobId}`}
                    outcomeRating={addRating}
                    notes={addNotes}
                    onOutcomeRatingChange={setAddRating}
                    onNotesChange={setAddNotes}
                    notesRows={sidebar ? 2 : 3}
                  />
                  <Button className="min-h-[44px] w-full" onClick={handleAdd} disabled={!apptDate || createAppointment.isPending}>
                    {createAppointment.isPending ? "Adding…" : "Add appointment"}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit appointment</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`edit-appt-dt-${jobId}`}>Date & time</Label>
                <Input
                  id={`edit-appt-dt-${jobId}`}
                  type="datetime-local"
                  value={editDateLocal}
                  onChange={(e) => setEditDateLocal(e.target.value)}
                />
              </div>
              <AppointmentOutcomeFields
                idPrefix={`edit-appt-${editing.id}`}
                outcomeRating={editRating}
                notes={editNotes}
                onOutcomeRatingChange={setEditRating}
                onNotesChange={setEditNotes}
                legacyOutcomeLine={parseStoredAppointment(editing).legacyOutcomeLine}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveEdit} disabled={updateAppointment.isPending}>
                  {updateAppointment.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <NewAppointmentDialog
        open={showDialogAdd}
        onOpenChange={setShowDialogAdd}
        defaultDate={dialogDate}
        defaultTime={dialogTime}
        defaultJobId={jobId}
      />
    </>
  );
}
