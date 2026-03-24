// MOBILE-PORT-READY – maps 1:1 to React Native
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export type MasterLeadStatus = "new" | "called" | "bad" | "follow_up" | "appointment_set" | "converted" | "dead";

export type CallOutcome = "NA" | "HU" | "NI" | "DNC" | "DISC" | "Set";

export const CALL_OUTCOMES: { value: CallOutcome; label: string; description: string }[] = [
  { value: "NA", label: "NA", description: "No Answer" },
  { value: "HU", label: "HU", description: "Hung Up" },
  { value: "NI", label: "NI", description: "Not Interested" },
  { value: "DNC", label: "DNC", description: "Do Not Call" },
  { value: "DISC", label: "DISC", description: "Disconnected" },
  { value: "Set", label: "Set", description: "Set Appointment" },
];

export interface MasterLead {
  id: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  lead_source_id: string | null;
  status: MasterLeadStatus;
  homeowner_present: boolean;
  has_insurance: boolean;
  allows_inspection: boolean;
  is_qualified: boolean;
  do_not_call: boolean;
  wireless: boolean;
  dwelling_type: string;
  dwelling_type_desc: string;
  homeowner_indicator_desc: string;
  assigned_setter_id: string | null;
  assigned_date: string | null;
  appointment_date: string | null;
  appointment_time: string;
  notes: string;
  customer_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CallLog {
  id: string;
  master_lead_id: string;
  setter_id: string;
  call_time: string;
  outcome: string;
  notes: string;
  created_at: string;
}

export interface LeadSegment {
  id: string;
  name: string;
  filter_type: string;
  filter_value: string;
  created_by: string | null;
  created_at: string;
}

export interface SetterAssignment {
  id: string;
  segment_id: string | null;
  setter_user_id: string;
  assigned_date: string;
  active: boolean;
}

// ── Master Leads ──
export function useMasterLeads(onlyMine = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["master-leads", onlyMine, user?.id],
    queryFn: async () => {
      let q = supabase.from("master_leads" as any).select("*").order("created_at", { ascending: false });
      if (onlyMine && user?.id) q = q.eq("assigned_setter_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MasterLead[];
    },
    enabled: !!user,
  });
}

export function useUpdateMasterLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MasterLead> & { id: string }) => {
      const { error } = await supabase.from("master_leads" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-leads"] }),
  });
}

export function useCreateMasterLead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lead: Partial<MasterLead>) => {
      const { error } = await supabase.from("master_leads" as any).insert({ ...lead, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-leads"] });
      toast({ title: "Lead Forged", description: "New lead added to the arsenal." });
    },
  });
}

export function useBulkAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadIds, setterId }: { leadIds: string[]; setterId: string }) => {
      const { error } = await supabase
        .from("master_leads" as any)
        .update({ assigned_setter_id: setterId, assigned_date: new Date().toISOString().split("T")[0] } as any)
        .in("id", leadIds);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["master-leads"] });
      toast({ title: "Leads Deployed", description: `${v.leadIds.length} leads assigned to setter.` });
    },
  });
}

// ── Call Logs ──
export function useCallLogs(leadId?: string) {
  return useQuery({
    queryKey: ["call-logs", leadId],
    queryFn: async () => {
      let q = supabase.from("call_logs" as any).select("*").order("call_time", { ascending: false });
      if (leadId) q = q.eq("master_lead_id", leadId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CallLog[];
    },
    enabled: true,
  });
}

export function useCreateCallLog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (log: Partial<CallLog>) => {
      const { error } = await supabase.from("call_logs" as any).insert({ ...log, setter_id: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-logs"] }),
  });
}

// ── Segments ──
export function useLeadSegments() {
  return useQuery({
    queryKey: ["lead-segments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_segments" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadSegment[];
    },
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (seg: Partial<LeadSegment>) => {
      const { error } = await supabase.from("lead_segments" as any).insert({ ...seg, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-segments"] });
      toast({ title: "Segment Forged", description: "New segment created." });
    },
  });
}

// ── Setter Assignments ──
export function useSetterAssignments() {
  return useQuery({
    queryKey: ["setter-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setter_assignments" as any).select("*").order("assigned_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SetterAssignment[];
    },
  });
}

export function useCreateSetterAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Partial<SetterAssignment>) => {
      const { error } = await supabase.from("setter_assignments" as any).insert(a as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setter-assignments"] });
      toast({ title: "Setter Deployed", description: "Assignment created." });
    },
  });
}
