import { useMemo, useState, useCallback } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAllAppointments, useUpdateAppointment, useCreateAppointment } from "@/hooks/useJobs";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("09:00");
  const [addTitle, setAddTitle] = useState("");
  const [addJobId, setAddJobId] = useState("");
  const [addDuration, setAddDuration] = useState("60");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: appointments = [], isLoading } = useAllAppointments();
  const { data: jobs = [] } = useJobs();
  const updateAppointment = useUpdateAppointment();
  const createAppointment = useCreateAppointment();
  const navigate = useNavigate();
  const { toast } = useToast();

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((a: any) => {
      const start = new Date(a.date_time);
      const duration = a.duration_minutes || 60;
      const end = addHours(start, duration / 60);
      const customerName = a.jobs?.customers?.name ?? a.jobs?.job_id ?? "Appointment";
      const title = a.title || customerName;
      return {
        id: a.id,
        title,
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

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      setAddDate(format(start, "yyyy-MM-dd"));
      setAddTime(format(start, "HH:mm"));
      setShowAdd(true);
    },
    []
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      setSelectedEvent(event);
    },
    []
  );

  const handleCreateAppointment = async () => {
    if (!addJobId) return;
    const dateTime = new Date(`${addDate}T${addTime}`);
    try {
      await createAppointment.mutateAsync({
        job_id: addJobId,
        date_time: dateTime.toISOString(),
        title: addTitle,
        duration_minutes: parseInt(addDuration) || 60,
      });
      toast({ title: "Appointment created" });
      setShowAdd(false);
      setAddTitle("");
      setAddJobId("");
      setAddDuration("60");
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

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Strategic Deployments</h1>
            <p className="text-muted-foreground text-sm">Drag & drop to reposition · Click a slot to deploy forces</p>
          </div>
          <Button size="sm" onClick={() => { setAddDate(format(new Date(), "yyyy-MM-dd")); setShowAdd(true); }}>
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

        {/* Create Appointment Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Site Inspection" />
              </div>
              <div className="space-y-2">
                <Label>Job *</Label>
                <Select value={addJobId} onValueChange={setAddJobId}>
                  <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.job_id} — {j.customers?.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select value={addDuration} onValueChange={setAddDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["15", "30", "45", "60", "90", "120"].map((d) => (
                      <SelectItem key={d} value={d}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateAppointment} className="w-full" disabled={!addJobId || !addDate || createAppointment.isPending}>
                {createAppointment.isPending ? "Creating..." : "Create Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
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
                {selectedEvent.resource?.jobs?.job_id && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Job:</span>{" "}
                    <button
                      className="text-primary hover:underline font-medium"
                      onClick={() => { setSelectedEvent(null); navigate(`/jobs/${selectedEvent.resource.job_id}`); }}
                    >
                      {selectedEvent.resource.jobs.job_id}
                    </button>
                  </div>
                )}
                {selectedEvent.resource?.outcome && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Outcome:</span> {selectedEvent.resource.outcome}
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => { setSelectedEvent(null); navigate(`/jobs/${selectedEvent.resource.job_id}`); }}>
                  View Job Details
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </AppLayout>
  );
}
