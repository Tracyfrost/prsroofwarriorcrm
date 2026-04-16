import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useCreateAppointment, useJobs } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomer";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { AppointmentOutcomeFields } from "@/components/appointments/AppointmentOutcomeFields";
import { AppointmentTitleCombobox } from "@/components/appointments/AppointmentTitleCombobox";
import {
  buildAppointmentOutcomePayload,
  type OutcomeRating,
} from "@/components/appointments/appointmentOutcomeModel";
import {
  defaultNotificationSettings,
  newReminderRow,
  toNotificationSettingsJson,
  type AppointmentNotificationSettingsV1,
  type AppointmentReminderRule,
} from "@/components/appointments/notificationSettingsModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type LinkMode = "job" | "customer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  defaultTime: string;
  defaultJobId?: string;
};

function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NewAppointmentDialog({ open, onOpenChange, defaultDate, defaultTime, defaultJobId }: Props) {
  const { toast } = useToast();
  const { can } = usePermissions();
  const canAddAppointment = can("add_appointment");

  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: profiles = [] } = useAllProfiles();
  const createAppointment = useCreateAppointment();

  const [linkMode, setLinkMode] = useState<LinkMode>("job");
  const [addJobId, setAddJobId] = useState("");
  const [addCustomerId, setAddCustomerId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDate, setAddDate] = useState(defaultDate);
  const [addTime, setAddTime] = useState(defaultTime);
  const [addDuration, setAddDuration] = useState("60");
  const [addOutcomeRating, setAddOutcomeRating] = useState<OutcomeRating>("");
  const [addNotes, setAddNotes] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notif, setNotif] = useState<AppointmentNotificationSettingsV1>(() => defaultNotificationSettings());
  const [extraEmailsRaw, setExtraEmailsRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    setAddDate(defaultDate);
    setAddTime(defaultTime);
    if (defaultJobId) {
      setLinkMode("job");
      setAddJobId(defaultJobId);
    }
  }, [open, defaultDate, defaultTime, defaultJobId]);

  useEffect(() => {
    if (open) return;
    setLinkMode("job");
    setAddJobId("");
    setAddCustomerId("");
    setAddTitle("");
    setAddDuration("60");
    setAddOutcomeRating("");
    setAddNotes("");
    setNotif(defaultNotificationSettings());
    setExtraEmailsRaw("");
    setNotifOpen(false);
  }, [open]);

  const activeProfiles = profiles.filter((p) => p.active && !(p as { deleted_at?: string | null }).deleted_at);

  const toggleAdditionalUser = (userId: string) => {
    setNotif((prev) => {
      const set = new Set(prev.additionalUserIds);
      if (set.has(userId)) set.delete(userId);
      else set.add(userId);
      return { ...prev, additionalUserIds: [...set] };
    });
  };

  const updateReminder = (id: string, patch: Partial<AppointmentReminderRule>) => {
    setNotif((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeReminder = (id: string) => {
    setNotif((prev) => ({ ...prev, reminders: prev.reminders.filter((r) => r.id !== id) }));
  };

  const addReminder = () => {
    setNotif((prev) => ({ ...prev, reminders: [...prev.reminders, newReminderRow()] }));
  };

  const handleCreate = async () => {
    const jobOk = linkMode === "job" && !!addJobId;
    const custOk = linkMode === "customer" && !!addCustomerId;
    if (!jobOk && !custOk) return;
    if (!addDate) return;

    const dateTime = new Date(`${addDate}T${addTime}`);
    const { outcome, notes } = buildAppointmentOutcomePayload(addOutcomeRating, addNotes);
    const additionalEmails = parseEmailList(extraEmailsRaw);
    const payloadNotif: AppointmentNotificationSettingsV1 = {
      ...notif,
      additionalEmails,
    };

    try {
      await createAppointment.mutateAsync({
        date_time: dateTime.toISOString(),
        title: addTitle || undefined,
        duration_minutes: parseInt(addDuration, 10) || 60,
        outcome: outcome || undefined,
        notes: notes || undefined,
        notification_settings: toNotificationSettingsJson(payloadNotif),
        ...(linkMode === "job" ? { job_id: addJobId } : { customer_id: addCustomerId }),
      });
      toast({ title: "Appointment created" });
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const canSubmit =
    canAddAppointment &&
    !!addDate &&
    (linkMode === "job" ? !!addJobId : !!addCustomerId) &&
    !createAppointment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <AppointmentTitleCombobox value={addTitle} onValueChange={setAddTitle} disabled={!canAddAppointment} />
          </div>

          <div className="space-y-2">
            <Label>Link to</Label>
            <Tabs value={linkMode} onValueChange={(v) => setLinkMode(v as LinkMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="job">Job</TabsTrigger>
                <TabsTrigger value="customer">Customer</TabsTrigger>
              </TabsList>
              <TabsContent value="job" className="mt-3 space-y-2">
                <Label>Job *</Label>
                <Select value={addJobId} onValueChange={setAddJobId} disabled={!canAddAppointment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.job_id} — {j.customers?.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="customer" className="mt-3 space-y-2">
                <Label>Customer *</Label>
                <Select value={addCustomerId} onValueChange={setAddCustomerId} disabled={!canAddAppointment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Saved on the customer only (no job). Assignee comes from the customer&apos;s assigned rep when set.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} disabled={!canAddAppointment} />
            </div>
            <div className="space-y-2">
              <Label>Time *</Label>
              <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} disabled={!canAddAppointment} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={addDuration} onValueChange={setAddDuration} disabled={!canAddAppointment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["15", "30", "45", "60", "90", "120"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AppointmentOutcomeFields
            idPrefix="add-appt"
            outcomeRating={addOutcomeRating}
            notes={addNotes}
            onOutcomeRatingChange={setAddOutcomeRating}
            onNotesChange={setAddNotes}
          />

          <Collapsible open={notifOpen} onOpenChange={setNotifOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="flex h-auto w-full justify-start gap-2 px-0 py-2 font-medium">
                {notifOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Reminders &amp; notifications
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 border-l-2 border-muted pl-3">
              <p className="text-xs text-muted-foreground">
                Preferences are stored on the appointment. Push, email, and calendar delivery will run when those integrations
                are connected.
              </p>

              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Google Calendar</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable when your org uses{" "}
                    <Link to="/settings" className="text-primary underline underline-offset-2" onClick={() => onOpenChange(false)}>
                      Settings → Integrations
                    </Link>
                    .
                  </p>
                </div>
                <Switch
                  checked={notif.integrations.googleCalendar === "desired"}
                  onCheckedChange={(checked) =>
                    setNotif((p) => ({
                      ...p,
                      integrations: { googleCalendar: checked ? "desired" : "off" },
                    }))
                  }
                  disabled={!canAddAppointment}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="notif-assigned"
                  checked={notif.notifyAssignedReps}
                  onCheckedChange={(c) => setNotif((p) => ({ ...p, notifyAssignedReps: c === true }))}
                  disabled={!canAddAppointment}
                />
                <Label htmlFor="notif-assigned" className="text-sm font-normal leading-none">
                  Include reps assigned to this customer / job
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Also notify (team)</Label>
                <ScrollArea className="h-36 rounded-md border p-2">
                  <div className="flex flex-col gap-2 pr-2">
                    {activeProfiles.map((p) => (
                      <label key={p.user_id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={notif.additionalUserIds.includes(p.user_id)}
                          onCheckedChange={() => toggleAdditionalUser(p.user_id)}
                          disabled={!canAddAppointment}
                        />
                        <span className="truncate">{p.name || p.email}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra-emails" className="text-sm">
                  Additional email addresses
                </Label>
                <Input
                  id="extra-emails"
                  placeholder="one@example.com, two@example.com"
                  value={extraEmailsRaw}
                  onChange={(e) => setExtraEmailsRaw(e.target.value)}
                  disabled={!canAddAppointment}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Timed reminders (before start)</Label>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addReminder} disabled={!canAddAppointment}>
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
                {notif.reminders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No layered reminders yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {notif.reminders.map((r) => (
                      <li key={r.id} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="flex flex-1 flex-wrap items-end gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <Input
                              type="number"
                              min={0}
                              className="h-9 w-20"
                              value={r.offsetValue}
                              onChange={(e) =>
                                updateReminder(r.id, { offsetValue: Math.max(0, parseInt(e.target.value, 10) || 0) })
                              }
                              disabled={!canAddAppointment}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Unit</span>
                            <Select
                              value={r.offsetUnit}
                              onValueChange={(u) =>
                                updateReminder(r.id, { offsetUnit: u as AppointmentReminderRule["offsetUnit"] })
                              }
                              disabled={!canAddAppointment}
                            >
                              <SelectTrigger className="h-9 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={r.channels.push}
                              onCheckedChange={(c) => updateReminder(r.id, { channels: { ...r.channels, push: c === true } })}
                              disabled={!canAddAppointment}
                            />
                            Push
                          </label>
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={r.channels.email}
                              onCheckedChange={(c) => updateReminder(r.id, { channels: { ...r.channels, email: c === true } })}
                              disabled={!canAddAppointment}
                            />
                            Email
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
                            aria-label="Remove reminder"
                            onClick={() => removeReminder(r.id)}
                            disabled={!canAddAppointment}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleCreate} className={cn("w-full")} disabled={!canSubmit}>
            {createAppointment.isPending ? "Creating…" : "Create Appointment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
