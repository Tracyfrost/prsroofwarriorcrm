import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ARCHIVE_PHRASE = "ARCHIVE";
const DELETE_PHRASE = "DELETE";

export function CustomerLifecycleTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOwnerOrAdmin } = usePermissions();
  const [customerId, setCustomerId] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "lifecycle-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, customer_number, created_at")
        .is("archived_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const { data: dependencyCounts } = useQuery({
    queryKey: ["customer-delete-dependencies", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const [jobs, appointments, assignments, leads] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("customer_id", customerId).is("deleted_at", null),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
        supabase.from("lead_assignments").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
        supabase.from("master_leads").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
      ]);
      if (jobs.error) throw jobs.error;
      if (appointments.error) throw appointments.error;
      if (assignments.error) throw assignments.error;
      if (leads.error) throw leads.error;
      return {
        jobs: jobs.count ?? 0,
        appointments: appointments.count ?? 0,
        leadAssignments: assignments.count ?? 0,
        masterLeads: leads.count ?? 0,
      };
    },
  });

  const canHardDelete = !!dependencyCounts && Object.values(dependencyCounts).every((n) => n === 0);

  const archiveCustomer = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Select a customer first.");
      const { error } = await supabase
        .from("customers")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user?.id ?? null,
          archive_reason: archiveReason.trim() || null,
        })
        .eq("id", customerId)
        .is("archived_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setArchiveConfirm("");
      setArchiveReason("");
      setCustomerId("");
      toast({ title: "Customer archived", description: "Customer moved to archive records." });
    },
    onError: (e: Error) => toast({ title: "Archive failed", description: e.message, variant: "destructive" }),
  });

  const hardDelete = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Select a customer first.");
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDeleteConfirm("");
      setCustomerId("");
      toast({ title: "Customer deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete blocked", description: e.message, variant: "destructive" }),
  });

  const downloadBackup = async () => {
    if (!customerId || !selectedCustomer) return;
    const [customerRes, jobsRes, appointmentsRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
      supabase.from("jobs").select("id, job_id, status, claim_number, created_at").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("appointments").select("id, date_time, appointment_status, job_id, title").eq("customer_id", customerId).order("date_time", { ascending: false }),
    ]);
    if (customerRes.error) throw customerRes.error;
    if (jobsRes.error) throw jobsRes.error;
    if (appointmentsRes.error) throw appointmentsRes.error;

    const backup = {
      exported_at: new Date().toISOString(),
      customer: customerRes.data,
      jobs: jobsRes.data ?? [],
      appointments: appointmentsRes.data ?? [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-backup-${selectedCustomer.customer_number || selectedCustomer.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded" });
  };

  return (
    <div className="space-y-6 mt-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Customer Data Lifecycle</CardTitle>
          <CardDescription>Safely back up, archive, and (admins only) hard delete customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select active customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.customer_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!customerId} onClick={() => void downloadBackup()}>
              Download Backup
            </Button>
            <Button variant="outline" onClick={() => navigate("/customers/archived")}>
              View Archived Customers
            </Button>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Archive Customer</p>
            <div className="space-y-2">
              <Label>Archive reason (optional)</Label>
              <Input value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} placeholder="Moved, duplicate, inactive account..." />
            </div>
            <div className="space-y-2">
              <Label>Type "{ARCHIVE_PHRASE}" to confirm</Label>
              <Input value={archiveConfirm} onChange={(e) => setArchiveConfirm(e.target.value)} />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!customerId || archiveConfirm.trim().toUpperCase() !== ARCHIVE_PHRASE || archiveCustomer.isPending}>
                  {archiveCustomer.isPending ? "Archiving..." : "Archive Customer"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Customer will be removed from normal CRM operations and available under Archived Customers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => archiveCustomer.mutate()}>Confirm Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isOwnerOrAdmin && (
            <div className="rounded-md border border-destructive/30 p-3 space-y-3">
              <p className="text-sm font-medium text-destructive">Hard Delete (Admin/Owner)</p>
              <p className="text-xs text-muted-foreground">
                Delete is allowed only when there are no dependent records.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Jobs: {dependencyCounts?.jobs ?? 0}</div>
                <div>Appointments: {dependencyCounts?.appointments ?? 0}</div>
                <div>Lead Assignments: {dependencyCounts?.leadAssignments ?? 0}</div>
                <div>Master Leads: {dependencyCounts?.masterLeads ?? 0}</div>
              </div>
              <div className="space-y-2">
                <Label>Type "{DELETE_PHRASE}" to confirm</Label>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!customerId || !canHardDelete || deleteConfirm.trim().toUpperCase() !== DELETE_PHRASE || hardDelete.isPending}
                  >
                    {hardDelete.isPending ? "Deleting..." : "Delete Customer Permanently"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete customer?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => hardDelete.mutate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
