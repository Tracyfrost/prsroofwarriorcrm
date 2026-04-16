import { useMemo, useState, useCallback, useEffect } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAllAppointments, useUpdateAppointment } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/usePermissions";
import { AppointmentOutcomeFields } from "@/components/appointments/AppointmentOutcomeFields";
import { NewAppointmentDialog } from "@/components/appointments/NewAppointmentDialog";
import {
  buildAppointmentOutcomePayload,
  parseStoredAppointment,
  type OutcomeRating,
} from "@/components/appointments/appointmentOutcomeModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, AlertTriangle, Clock } from "lucide-react";
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addHours } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(BigCalendar as any);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
  conflict?: boolean;
}

function appointmentDisplayTitle(a: Record<string, unknown>): string {
  const title = a.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  const jobs = a.jobs as { customers?: { name?: string }; job_id?: string } | null | undefined;
  const customers = a.customers as { name?: string } | null | undefined;
  return jobs?.customers?.name ?? customers?.name ?? jobs?.job_id ?? "Appointment";
}

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("09:00");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailRating, setDetailRating] = useState<OutcomeRating>("");
  const [detailNotes, setDetailNotes] = useState("");

  const { can } = usePermissions();
  const canEditOutcome = can("edit_appointment");
  const canAddAppointment = can("add_appointment");

  const { data: appointments = [], isLoading } = useAllAppointments();
  const updateAppointment = useUpdateAppointment();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setAddDate(format(new Date(), "yyyy-MM-dd"));
    setAddTime(format(new Date(), "HH:mm"));
    setShowAdd(true);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedEvent?.resource) return;
    const p = parseStoredAppointment(selectedEvent.resource);
    setDetailRating(p.rating);
    setDetailNotes(p.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset form when user selects a different calendar event
  }, [selectedEvent?.id]);

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((a: any) => {
      const start = new Date(a.date_time);
      const duration = a.duration_minutes || 60;
      const end = addHours(start, duration / 60);
      return {
        id: a.id,
        title: appointmentDisplayTitle(a),
        start,
        end,
        resource: a,
        conflict: a.conflict_flag,
      };
    });
  }, [appointments]);

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: any; start: any }) => {
      const newDate = start instanceof Date ? start : new Date(start);
      try {
        await updateAppointment.mutateAsync({
          id: event.id,
          date_time: newDate.toISOString(),
        });
        toast({ title: "Appointment rescheduled", description: format(newDate, "MMM d, yyyy h:mm a") });
      } catch (e: any) {
        toast({ title: "Failed to reschedule", description: e.message, variant: "destructive" });
      }
    },
    [updateAppointment, toast]
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: any; start: any; end: any }) => {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      try {
        await updateAppointment.mutateAsync({
          id: event.id,
          date_time: startDate.toISOString(),
          duration_minutes: durationMinutes,
        });
        toast({ title: "Appointment updated" });
      } catch (e: any) {
        toast({ title: "Failed to update", description: e.message, variant: "destructive" });
      }
    },
    [updateAppointment, toast]
  );

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setAddDate(format(start, "yyyy-MM-dd"));
    setAddTime(format(start, "HH:mm"));
    setShowAdd(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleSaveEventOutcome = async () => {
    if (!selectedEvent) return;
    const { outcome, notes } = buildAppointmentOutcomePayload(detailRating, detailNotes);
    try {
      await updateAppointment.mutateAsync({
        id: selectedEvent.id,
        outcome,
        notes,
      });
      toast({ title: "Outcome saved" });
      setSelectedEvent(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: event.conflict ? "hsl(var(--destructive))" : "hsl(var(--primary))",
      borderRadius: "4px",
      opacity: 0.9,
      color: event.conflict ? "hsl(var(--destructive-foreground))" : "hsl(var(--primary-foreground))",
      border: "none",
      fontSize: "12px",
      padding: "2px 6px",
    };
    return { style };
  };

  const res = selectedEvent?.resource;
  const jobUuid = res?.job_id as string | null | undefined;
  const jobLabel = res?.jobs?.job_id as string | undefined;
  const customerUuid = res?.customer_id as string | null | undefined;
  const customerName = (res?.customers as { name?: string } | undefined)?.name;
  const jobCustomerId = res?.jobs?.customer_id as string | undefined;
  const jobCustomerName = (res?.jobs?.customers as { name?: string } | undefined)?.name;
  const detailCustomerId = customerUuid || jobCustomerId;
  const detailCustomerLabel = customerName || jobCustomerName;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Strategic Deployments</h1>
            <p className="text-muted-foreground text-sm">Drag & drop to reposition · Click a slot to deploy forces</p>
          </div>
          <Button
            size="sm"
            disabled={!canAddAppointment}
            onClick={() => {
              setAddDate(format(new Date(), "yyyy-MM-dd"));
              setAddTime(format(new Date(), "HH:mm"));
              setShowAdd(true);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Deploy Mission
          </Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-2 md:p-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : (
              <div style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
                <DnDCalendar
                  localizer={localizer}
                  events={events}
                  view={view}
                  onView={(v: View) => setView(v)}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  onEventDrop={handleEventDrop as any}
                  onEventResize={handleEventResize as any}
                  onSelectSlot={handleSelectSlot as any}
                  onSelectEvent={handleSelectEvent as any}
                  selectable
                  resizable
                  eventPropGetter={eventStyleGetter as any}
                  views={["month", "week", "day", "agenda"]}
                  step={30}
                  timeslots={2}
                  popup
                  style={{ height: "100%" }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <NewAppointmentDialog open={showAdd} onOpenChange={setShowAdd} defaultDate={addDate} defaultTime={addTime} />

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent?.conflict && <AlertTriangle className="h-4 w-4 text-destructive" />}
                {selectedEvent?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedEvent.start, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedEvent.start, "h:mm a")} – {format(selectedEvent.end, "h:mm a")}</span>
                </div>
                {selectedEvent.conflict && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Scheduling Conflict
                  </Badge>
                )}
                {jobUuid && jobLabel ? (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Job:</span>{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => {
                        setSelectedEvent(null);
                        navigate(`/operations/${jobUuid}`);
                      }}
                    >
                      {jobLabel}
                    </button>
                  </div>
                ) : null}
                {detailCustomerId ? (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Customer:</span>{" "}
                    <Link
                      to={`/customers/${detailCustomerId}`}
                      className="font-medium text-primary hover:underline"
                      onClick={() => setSelectedEvent(null)}
                    >
                      {detailCustomerLabel || "View customer"}
                    </Link>
                  </div>
                ) : null}
                <AppointmentOutcomeFields
                  idPrefix="cal-detail"
                  outcomeRating={detailRating}
                  notes={detailNotes}
                  onOutcomeRatingChange={setDetailRating}
                  onNotesChange={setDetailNotes}
                  legacyOutcomeLine={parseStoredAppointment(selectedEvent.resource).legacyOutcomeLine}
                  disabled={!canEditOutcome}
                />
                <div className="flex flex-col gap-2">
                  {canEditOutcome ? (
                    <Button
                      className="w-full"
                      onClick={handleSaveEventOutcome}
                      disabled={updateAppointment.isPending}
                    >
                      {updateAppointment.isPending ? "Saving…" : "Save outcome"}
                    </Button>
                  ) : null}
                  {jobUuid ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedEvent(null);
                          navigate(`/operations/${jobUuid}`);
                        }}
                      >
                        View job (operations)
                      </Button>
                      <Button variant="ghost" className="w-full" asChild>
                        <Link to={`/jobs/${jobUuid}`} onClick={() => setSelectedEvent(null)}>
                          Open job profile
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </AppLayout>
  );
}
