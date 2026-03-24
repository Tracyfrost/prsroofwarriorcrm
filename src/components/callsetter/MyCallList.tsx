// MOBILE-PORT-READY – maps 1:1 to React Native
import { useState, useCallback, useRef, useEffect } from "react";
import { useMasterLeads, useUpdateMasterLead, useCreateCallLog, MasterLead, MasterLeadStatus, CallOutcome, CALL_OUTCOMES } from "@/hooks/useCallSetter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, CalendarIcon, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const STATUS_OPTIONS: { value: MasterLeadStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400" },
  { value: "called", label: "Called", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "bad", label: "Bad", color: "bg-red-500/20 text-red-400" },
  { value: "follow_up", label: "Follow-Up", color: "bg-orange-500/20 text-orange-400" },
  { value: "appointment_set", label: "Appt Set", color: "bg-green-500/20 text-green-400" },
  { value: "converted", label: "Converted", color: "bg-primary/20 text-primary" },
  { value: "dead", label: "Dead", color: "bg-muted text-muted-foreground" },
];

export function MyCallList() {
  const { user } = useAuth();
  const { data: leads = [], isLoading } = useMasterLeads(true);
  const updateLead = useUpdateMasterLead();
  const createLog = useCreateCallLog();
  const isMobile = useIsMobile();
  const [activeRow, setActiveRow] = useState<number>(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setActiveRow((prev) => Math.min(prev + 1, leads.length - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [leads.length]);

  useEffect(() => {
    rowRefs.current[activeRow]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeRow]);

  const handleToggle = useCallback(
    (lead: MasterLead, field: "homeowner_present" | "has_insurance" | "allows_inspection") => {
      const newVal = !lead[field];
      updateLead.mutate({ id: lead.id, [field]: newVal });
      createLog.mutate({ master_lead_id: lead.id, outcome: `${field} → ${newVal}`, notes: "" });
      const updated = { ...lead, [field]: newVal };
      if (updated.homeowner_present && updated.has_insurance && updated.allows_inspection) {
        toast({ title: "🟢 Lead Qualified!", description: "Inspection Ready – Schedule Appointment!" });
      }
    },
    [updateLead, createLog]
  );

  const handleCallOutcome = useCallback(
    (lead: MasterLead, outcome: CallOutcome) => {
      createLog.mutate({ master_lead_id: lead.id, outcome, notes: "" });
      if (outcome === "DNC") {
        updateLead.mutate({ id: lead.id, do_not_call: true, status: "dead" as MasterLeadStatus });
      } else if (outcome === "Set") {
        updateLead.mutate({ id: lead.id, status: "appointment_set" as MasterLeadStatus });
        toast({ title: "⚔️ Lead Conquered!", description: "Appointment Forged – Schedule the inspection!" });
      } else if (outcome === "DISC") {
        updateLead.mutate({ id: lead.id, status: "dead" as MasterLeadStatus });
      } else {
        updateLead.mutate({ id: lead.id, status: "called" as MasterLeadStatus });
      }
    },
    [updateLead, createLog]
  );

  const handleStatusChange = useCallback(
    (lead: MasterLead, status: MasterLeadStatus) => {
      updateLead.mutate({ id: lead.id, status });
      createLog.mutate({ master_lead_id: lead.id, outcome: `Status → ${status}`, notes: "" });
    },
    [updateLead, createLog]
  );

  const handleApptDate = useCallback(
    (lead: MasterLead, date: Date | undefined) => {
      if (!date) return;
      updateLead.mutate({ id: lead.id, appointment_date: date.toISOString(), status: "appointment_set" });
      createLog.mutate({ master_lead_id: lead.id, outcome: `Appointment set: ${format(date, "PPP")}`, notes: "" });
      toast({ title: "⚔️ Lead Conquered!", description: "Appointment Forged!" });
    },
    [updateLead, createLog]
  );

  const handleApptTime = useCallback(
    (lead: MasterLead, time: string) => {
      updateLead.mutate({ id: lead.id, appointment_time: time });
    },
    [updateLead]
  );

  const handleNotesBlur = useCallback(
    (lead: MasterLead, notes: string) => {
      if (notes !== lead.notes) {
        updateLead.mutate({ id: lead.id, notes });
      }
    },
    [updateLead]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Phone className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-muted-foreground">Arsenal Empty</p>
          <p className="text-sm text-muted-foreground/70">Request a new segment from your commander.</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {leads.map((lead, i) => (
          <Card
            key={lead.id}
            className={cn(
              "border transition-colors",
              lead.do_not_call && "opacity-50",
              lead.is_qualified && "border-green-500/50 bg-green-500/5"
            )}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{lead.first_name} {lead.last_name}</p>
                  <p className="text-xs text-muted-foreground">{lead.street}, {lead.city} {lead.state} {lead.zip}</p>
                  {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                </div>
                <div className="flex gap-1">
                  {lead.do_not_call && <Badge variant="destructive" className="text-[10px]">DNC</Badge>}
                  {lead.wireless && <Badge variant="outline" className="text-[10px]">📱</Badge>}
                  {lead.is_qualified && <Badge className="bg-green-600 text-white text-xs">⚔️ Qualified</Badge>}
                </div>
              </div>
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-primary min-h-[44px]">
                <Phone className="h-4 w-4" /> {lead.phone}
              </a>
              {/* Qualification toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 min-h-[48px]">
                  <Checkbox checked={lead.homeowner_present} onCheckedChange={() => handleToggle(lead, "homeowner_present")} />
                  <span className="text-xs">H</span>
                </label>
                <label className="flex items-center gap-2 min-h-[48px]">
                  <Checkbox checked={lead.has_insurance} onCheckedChange={() => handleToggle(lead, "has_insurance")} />
                  <span className="text-xs">I</span>
                </label>
                <label className="flex items-center gap-2 min-h-[48px]">
                  <Checkbox checked={lead.allows_inspection} onCheckedChange={() => handleToggle(lead, "allows_inspection")} />
                  <span className="text-xs">A</span>
                </label>
              </div>
              {/* Call Outcome Buttons */}
              <div className="flex gap-1 flex-wrap">
                {CALL_OUTCOMES.map((o) => (
                  <Button
                    key={o.value}
                    variant={o.value === "Set" ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px] text-xs"
                    onClick={() => handleCallOutcome(lead, o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              {/* Appt Date + Time */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="min-h-[44px]">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {lead.appointment_date ? format(new Date(lead.appointment_date), "MM/dd") : "Appt"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lead.appointment_date ? new Date(lead.appointment_date) : undefined}
                      onSelect={(d) => handleApptDate(lead, d)}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  defaultValue={lead.appointment_time}
                  className="w-[110px] min-h-[44px]"
                  onBlur={(e) => handleApptTime(lead, e.target.value)}
                />
              </div>
              <Input
                defaultValue={lead.notes}
                placeholder="Notes..."
                className="min-h-[44px]"
                onBlur={(e) => handleNotesBlur(lead, e.target.value)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center w-10">H</TableHead>
            <TableHead className="text-center w-10">I</TableHead>
            <TableHead className="text-center w-10">A</TableHead>
            <TableHead>Call</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Appt Date</TableHead>
            <TableHead>Appt Time</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead, i) => (
            <TableRow
              key={lead.id}
              ref={(el) => { rowRefs.current[i] = el; }}
              className={cn(
                "cursor-pointer transition-colors",
                i === activeRow && "bg-accent/50",
                lead.do_not_call && "opacity-50",
                lead.is_qualified && "bg-green-500/10"
              )}
              onClick={() => setActiveRow(i)}
            >
              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
              <TableCell className="font-medium whitespace-nowrap">
                {lead.first_name} {lead.last_name}
                {lead.do_not_call && <Badge variant="destructive" className="ml-1 text-[10px]">DNC</Badge>}
                {lead.wireless && <Badge variant="outline" className="ml-1 text-[10px]">📱</Badge>}
                {lead.is_qualified && <Badge className="ml-1 bg-green-600 text-white text-[10px]">⚔️</Badge>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {lead.street}, {lead.city} {lead.state} {lead.zip}
              </TableCell>
              <TableCell>
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline text-sm">{lead.phone}</a>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
              <TableCell className="text-center">
                <Checkbox checked={lead.homeowner_present} onCheckedChange={() => handleToggle(lead, "homeowner_present")} />
              </TableCell>
              <TableCell className="text-center">
                <Checkbox checked={lead.has_insurance} onCheckedChange={() => handleToggle(lead, "has_insurance")} />
              </TableCell>
              <TableCell className="text-center">
                <Checkbox checked={lead.allows_inspection} onCheckedChange={() => handleToggle(lead, "allows_inspection")} />
              </TableCell>
              {/* Call Outcome */}
              <TableCell>
                <Select onValueChange={(v) => handleCallOutcome(lead, v as CallOutcome)}>
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue placeholder="Log" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="font-mono">{o.label}</span>
                        <span className="text-muted-foreground ml-1 text-[10px]">({o.description})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {/* Status */}
              <TableCell>
                <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead, v as MasterLeadStatus)}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <Badge variant="outline" className={cn("text-[10px]", s.color)}>{s.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {/* Appt Date */}
              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {lead.appointment_date ? format(new Date(lead.appointment_date), "MM/dd") : "—"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lead.appointment_date ? new Date(lead.appointment_date) : undefined}
                      onSelect={(d) => handleApptDate(lead, d)}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
              {/* Appt Time */}
              <TableCell>
                <Input
                  type="time"
                  defaultValue={lead.appointment_time}
                  className="h-8 text-xs w-[100px]"
                  onBlur={(e) => handleApptTime(lead, e.target.value)}
                />
              </TableCell>
              {/* Notes */}
              <TableCell>
                <Input
                  defaultValue={lead.notes}
                  className="h-8 text-xs w-[150px]"
                  placeholder="Notes..."
                  onBlur={(e) => handleNotesBlur(lead, e.target.value)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
