import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useJob, useUpdateJob, useAppointments, useCreateAppointment, useJobAssignments, useCreateJobAssignment, useDeleteJobAssignment, useSubJobs, useSoftDeleteJob } from "@/hooks/useJobs";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { useCreateCommission } from "@/hooks/useCommissions";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { SiteCamGallery } from "@/components/sitecam/SiteCamGallery";
import { TradesBadges } from "@/components/job/TradesBadges";
import { useTradeTypes } from "@/hooks/useProduction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, DollarSign, FileText, MapPin, Phone, Mail, Save, Plus, Brain, Loader2, Hammer, Users, X, Trash2, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { AddressLink } from "@/components/AddressLink";
import { BattleTooltip } from "@/components/BattleTooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserRoles } from "@/hooks/useProfile";
import { ProductionSection } from "@/components/production/ProductionSection";
import { DualWorkflowStatusBar } from "@/components/job/DualWorkflowStatusBar";
import { useStatusBranches } from "@/hooks/useStatusBranches";
import type { Qualification } from "@/hooks/useJobProduction";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useJobStatuses } from "@/hooks/useCustomizations";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getSquaresReported } from "@/lib/reports/repResolution";

// Status labels/list now driven by job_statuses table

const ASSIGNMENT_ROLES = [
  { value: "primary_rep", label: "Primary Rep" },
  { value: "assistant_rep", label: "Assistant Rep" },
  { value: "manager_override", label: "Manager Override" },
  { value: "field_tech", label: "Field Tech" },
];

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const { data: appointments = [] } = useAppointments(id);
  const { data: assignments = [] } = useJobAssignments(id);
  const { data: allProfiles = [] } = useAllProfiles();
  const { data: jobStatuses = [] } = useJobStatuses();
  const { data: branches = [] } = useStatusBranches();
  const { data: tradeTypes = [] } = useTradeTypes();
  const statusLabels: Record<string, string> = Object.fromEntries(jobStatuses.map(s => [s.name, s.display_name]));
  const updateJob = useUpdateJob();
  const createAppointment = useCreateAppointment();
  const createAssignment = useCreateJobAssignment();
  const deleteAssignment = useDeleteJobAssignment();
  const createCommission = useCreateCommission();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: myRoles = [] } = useUserRoles();
  const softDeleteJob = useSoftDeleteJob();
  const canDelete = myRoles.some((r) => ["owner"].includes(r)) || myRoles.some((r) => ["manager", "office_admin"].includes(r));

  usePageTitle(job ? `Job ${job.job_id}` : "Jobs");

  const [editNotes, setEditNotes] = useState<string | null>(null);
  const [editAcv, setEditAcv] = useState<string>("");
  const [editRcv, setEditRcv] = useState<string>("");
  const [showFinEdit, setShowFinEdit] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptOutcome, setApptOutcome] = useState("");
  const [commAmount, setCommAmount] = useState("");
  const [commNotes, setCommNotes] = useState("");
  const [showCommForm, setShowCommForm] = useState(false);
  const [editClaimNumber, setEditClaimNumber] = useState<string | null>(null);
  const [claimSaving, setClaimSaving] = useState(false);

  // Site address edit
  const [editSiteAddr, setEditSiteAddr] = useState(false);
  const [siteStreet, setSiteStreet] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteState, setSiteState] = useState("");
  const [siteZip, setSiteZip] = useState("");

  // Assignment form
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("primary_rep");

  // Trade editing
  const [tradesModalOpen, setTradesModalOpen] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // AI claim prediction
  const [aiPrediction, setAiPrediction] = useState<{ prediction: string; confidence: string; estimated_days: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Must call all hooks before any conditional returns
  const isSubJob = !!job && !!(job as any).parent_job_id;
  const isMainJob = !!job && !isSubJob;
  const { data: subJobsList = [] } = useSubJobs(isMainJob ? job?.id : undefined);

  const handleAiPredict = useCallback(async () => {
    if (!job) return;
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-claim-predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jobData: {
            status: job.status,
            trade_types: job.trade_types,
            financials: job.financials,
            dates: job.dates,
          },
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Prediction failed");
      }
      const data = await resp.json();
      setAiPrediction(data);
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }, [job, toast]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="ghost" onClick={() => navigate("/jobs")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Button>
        </div>
      </AppLayout>
    );
  }

  const customer = job.customers as any;
  const financials = job.financials as any;
  const dates = job.dates as any;
  const siteAddress = job.site_address as any;

  const handleStatusChange = async (status: string) => {
    try {
      await updateJob.mutateAsync({ id: job.id, status: status as any });
      toast({ title: "Status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSupplementStatusChange = async (status: string) => {
    try {
      await updateJob.mutateAsync({ id: job.id, supplement_status: status } as any);
      toast({ title: "Supplement status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleSupplement = async (enabled: boolean) => {
    try {
      const updates: any = { id: job.id, has_supplement: enabled };
      if (enabled && !(job as any).supplement_status) {
        updates.supplement_status = "supplement";
      }
      await updateJob.mutateAsync(updates);
      toast({ title: enabled ? "Supplement flow enabled" : "Supplement flow disabled" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (editNotes === null) return;
    try {
      await updateJob.mutateAsync({ id: job.id, notes: editNotes });
      setEditNotes(null);
      toast({ title: "Notes saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveFinancials = async () => {
    try {
      await updateJob.mutateAsync({
        id: job.id,
        financials: { acv: parseFloat(editAcv) || 0, rcv: parseFloat(editRcv) || 0 },
      });
      setShowFinEdit(false);
      toast({ title: "Financials saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveSiteAddress = async () => {
    try {
      await updateJob.mutateAsync({
        id: job.id,
        site_address: { street: siteStreet, city: siteCity, state: siteState, zip: siteZip },
      });
      setEditSiteAddr(false);
      toast({ title: "Site address saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCopyCustomerAddress = () => {
    const addr = customer?.main_address as any;
    if (addr) {
      setSiteStreet(addr.street || "");
      setSiteCity(addr.city || "");
      setSiteState(addr.state || "");
      setSiteZip(addr.zip || "");
    }
  };

  const handleAddAppointment = async () => {
    if (!apptDate) return;
    try {
      await createAppointment.mutateAsync({
        job_id: job.id,
        date_time: new Date(apptDate).toISOString(),
        outcome: apptOutcome,
      });
      setApptDate("");
      setApptOutcome("");
      toast({ title: "Appointment added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddAssignment = async () => {
    if (!assignUserId) return;
    try {
      await createAssignment.mutateAsync({
        job_id: job.id,
        user_id: assignUserId,
        assignment_role: assignRole,
      });
      setAssignUserId("");
      toast({ title: "Assignment added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment.mutateAsync({ id: assignmentId, jobId: job.id });
      toast({ title: "Assignment removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Find primary rep for commissions
  const primaryRep = assignments.find(a => a.assignment_role === "primary_rep");
  const commRepId = primaryRep?.user_id || job.sales_rep_id;

  const handleAddCommission = async () => {
    if (!commAmount || !commRepId) return;
    try {
      await createCommission.mutateAsync({
        rep_id: commRepId,
        job_id: job.id,
        amount: parseFloat(commAmount),
        notes: commNotes,
      });
      setCommAmount("");
      setCommNotes("");
      setShowCommForm(false);
      toast({ title: "Commission added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const profileMap = new Map(allProfiles.map(p => [p.user_id, p]));

  const parentJobId = (job as any).parent_job_id;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Back + Header */}
        <div className="mb-6">
          <BattleTooltip phraseKey="back_to_jobs">
            <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
            </Button>
          </BattleTooltip>
          {isSubJob && parentJobId && (
            <BattleTooltip phraseKey="back_to_main_job">
              <div className="mb-2">
                <Link to={`/jobs/${parentJobId}`} className="text-xs text-accent hover:underline">
                  ← Back to Main Job
                </Link>
              </div>
            </BattleTooltip>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
             <div>
               <div className="flex items-center gap-3">
                 <h1 className="text-2xl font-bold tracking-tight text-foreground">{job.job_id}</h1>
                 {isSubJob && <Badge variant="secondary" className="text-xs">Sub Job</Badge>}
                 {isMainJob && subJobsList.length > 0 && <Badge variant="outline" className="text-xs">{subJobsList.length} sub{subJobsList.length !== 1 ? "s" : ""}</Badge>}
               </div>
              {isMainJob && subJobsList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <BattleTooltip phraseKey="main_job_chip">
                    <Button
                      variant="default"
                      size="xs"
                      className="h-7 px-2 text-[11px] font-mono"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      Main · {job.job_id}
                    </Button>
                  </BattleTooltip>
                  {subJobsList.map((sub: any) => (
                    <BattleTooltip key={sub.id} phraseKey="sub_job_chip">
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] font-mono"
                        onClick={() => navigate(`/jobs/${sub.id}`)}
                      >
                        Sub · {sub.job_id}
                      </Button>
                    </BattleTooltip>
                  ))}
                </div>
              )}
               <p className="text-muted-foreground text-sm mt-1">
                 <Link to={`/customers/${job.customer_id}`} className="hover:underline text-foreground font-medium">
                   {customer?.name ?? "Unknown Customer"}
                 </Link>
                 {(job as any).claim_number && (
                   <span className="ml-2">
                     {isMainJob && editClaimNumber === null ? (
                       <button
                         className="text-xs text-muted-foreground hover:text-foreground font-mono bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                         onClick={() => setEditClaimNumber((job as any).claim_number || "")}
                         title="Click to edit Claim#"
                       >
                         Claim# {(job as any).claim_number}
                       </button>
                     ) : isMainJob && editClaimNumber !== null ? (
                       <span className="inline-flex items-center gap-1">
                         <Input
                           value={editClaimNumber}
                           onChange={(e) => setEditClaimNumber(e.target.value)}
                           className="h-6 w-32 text-xs font-mono"
                           maxLength={20}
                           placeholder="5-20 chars"
                         />
                         <Button
                           variant="ghost" size="sm" className="h-6 px-2 text-xs"
                           disabled={claimSaving}
                           onClick={async () => {
                             const val = editClaimNumber.trim();
                             if (!val || val.length < 5 || val.length > 20 || !/^[A-Za-z0-9_.\-]+$/.test(val)) {
                               toast({ title: "Invalid Claim#", description: "Must be 5-20 chars: A-Z, 0-9, -, _, .", variant: "destructive" });
                               return;
                             }
                             if (!confirm("Updating Claim# will regenerate all Sub Job IDs. Proceed?")) return;
                             setClaimSaving(true);
                             try {
                               await updateJob.mutateAsync({ id: job.id, claim_number: val } as any);
                               setEditClaimNumber(null);
                               toast({ title: "Claim# updated with cascade" });
                             } catch (e: any) {
                               toast({ title: "Error", description: e.message, variant: "destructive" });
                             } finally {
                               setClaimSaving(false);
                             }
                           }}
                         >
                           {claimSaving ? "..." : "Save"}
                         </Button>
                         <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditClaimNumber(null)}>✕</Button>
                       </span>
                     ) : (
                       <span className="text-xs text-muted-foreground font-mono">Claim# {(job as any).claim_number}</span>
                     )}
                   </span>
                 )}
                 {customer?.insurance_carrier && (
                   <span className="ml-2 text-xs text-muted-foreground">• Insurance: {customer.insurance_carrier}</span>
                 )}
               </p>
             </div>
             <div className="flex gap-1.5 items-center flex-wrap">
                <TradesBadges trades={job.trade_types ?? []} size="sm" />
                <BattleTooltip phraseKey="forge_trades">
                  <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0 h-7 px-2 text-xs" onClick={() => { setTradesModalOpen(true); setSelectedTrades(job.trade_types ?? []); }}>
                    <Hammer className="mr-1 h-3 w-3" /> Forge Trades
                  </Button>
                </BattleTooltip>
                <ResponsiveModal open={tradesModalOpen} onOpenChange={setTradesModalOpen} title={`Edit Trades — ${job.job_id}`} className="max-w-sm">
                  <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
                    {tradeTypes.map(tt => (
                      <label key={tt.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer min-h-[44px]">
                        <Checkbox
                          checked={selectedTrades.includes(tt.name)}
                          onCheckedChange={(checked) => {
                            setSelectedTrades(prev =>
                              checked ? [...prev, tt.name] : prev.filter(t => t !== tt.name)
                            );
                          }}
                        />
                        <span className="text-sm">{tt.name}</span>
                      </label>
                    ))}
                    {tradeTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No trade types configured</p>}
                  </div>
                  <Button
                    size="sm"
                    className="w-full min-h-[44px] sm:min-h-0 mt-2"
                    onClick={async () => {
                      try {
                        await updateJob.mutateAsync({ id: job.id, trade_types: selectedTrades });
                        setTradesModalOpen(false);
                        toast({ title: "Trades Forged — Ledger Updated!" });
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message, variant: "destructive" });
                      }
                    }}
                  >
                    <Save className="mr-1 h-3 w-3" /> Save Trades
                  </Button>
                </ResponsiveModal>
               {isMainJob && (
                 <CreateJobModal
                   defaultCustomerId={job.customer_id}
                   defaultParentJobId={job.id}
                   trigger={
                     <BattleTooltip phraseKey="add_sub_job_btn">
                       <Button variant="outline" size="sm"><Plus className="mr-1 h-3 w-3" /> Add Sub Job</Button>
                     </BattleTooltip>
                   }
                 />
               )}
               {canDelete && (
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <BattleTooltip phraseKey="delete_job">
                       <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                     </BattleTooltip>
                   </AlertDialogTrigger>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Delete Job {job.job_id}?</AlertDialogTitle>
                       <AlertDialogDescription>
                         This will soft-delete this job{isMainJob && subJobsList.length > 0 ? ` and its ${subJobsList.length} sub-job(s)` : ""}. It will no longer appear in listings. This action cannot be easily undone.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                       <AlertDialogAction
                         className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         onClick={async () => {
                           try {
                             await softDeleteJob.mutateAsync(job.id);
                             toast({ title: "Job deleted" });
                             navigate("/jobs");
                           } catch (e: any) {
                             toast({ title: "Error", description: e.message, variant: "destructive" });
                           }
                         }}
                       >
                         Delete
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               )}
             </div>
           </div>

           {/* Dual Workflow Status Bar */}
           <div className="mt-4">
             <DualWorkflowStatusBar
               allStatuses={jobStatuses}
               branches={branches}
               mainStatus={job.status}
               supplementStatus={(job as any).supplement_status}
               hasSupplement={(job as any).has_supplement ?? false}
               onMainStatusChange={handleStatusChange}
               onSupplementStatusChange={handleSupplementStatusChange}
               onToggleSupplement={handleToggleSupplement}
             />
           </div>
         </div>

        {/* Tri-pane on desktop, tabs on mobile */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4">
            <CustomerInfoCard customer={customer} />
            <SiteAddressCard
              siteAddress={siteAddress}
              editing={editSiteAddr}
              street={siteStreet} city={siteCity} state={siteState} zip={siteZip}
              onToggleEdit={() => {
                setEditSiteAddr(!editSiteAddr);
                setSiteStreet(siteAddress?.street || "");
                setSiteCity(siteAddress?.city || "");
                setSiteState(siteAddress?.state || "");
                setSiteZip(siteAddress?.zip || "");
              }}
              onStreetChange={setSiteStreet} onCityChange={setSiteCity}
              onStateChange={setSiteState} onZipChange={setSiteZip}
              onSave={handleSaveSiteAddress}
              onCopyCustomer={handleCopyCustomerAddress}
            />
            <FinancialsCard
              financials={financials} showEdit={showFinEdit}
              editAcv={editAcv} editRcv={editRcv}
              onToggleEdit={() => { setShowFinEdit(!showFinEdit); setEditAcv(String(financials?.acv ?? 0)); setEditRcv(String(financials?.rcv ?? 0)); }}
              onAcvChange={setEditAcv} onRcvChange={setEditRcv} onSave={handleSaveFinancials}
            />
          </div>
          <div className="space-y-4">
            <AssignmentsCard
              assignments={assignments} profileMap={profileMap} allProfiles={allProfiles}
              assignUserId={assignUserId} assignRole={assignRole}
              onUserChange={setAssignUserId} onRoleChange={setAssignRole}
              onAdd={handleAddAssignment} onRemove={handleRemoveAssignment}
              isPending={createAssignment.isPending}
            />
            <NotesCard
              notes={job.notes ?? ""} editNotes={editNotes}
              onEdit={() => setEditNotes(job.notes ?? "")}
              onChange={setEditNotes} onSave={handleSaveNotes} onCancel={() => setEditNotes(null)}
            />
            <AppointmentsCard
              appointments={appointments} apptDate={apptDate} apptOutcome={apptOutcome}
              onDateChange={setApptDate} onOutcomeChange={setApptOutcome}
              onAdd={handleAddAppointment} isPending={createAppointment.isPending}
            />
          </div>
          <div className="space-y-4">
            <DocumentsPanel jobId={job.id} />
            <CommissionCard
              jobId={job.id} salesRepId={commRepId}
              showForm={showCommForm} amount={commAmount} notes={commNotes}
              onToggleForm={() => setShowCommForm(!showCommForm)}
              onAmountChange={setCommAmount} onNotesChange={setCommNotes}
              onAdd={handleAddCommission} isPending={createCommission.isPending}
            />
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Created: {format(new Date(job.created_at), "MMM d, yyyy h:mm a")}</p>
                  <p>Updated: {format(new Date(job.updated_at), "MMM d, yyyy h:mm a")}</p>
                  {dates?.inspection && <p>Inspection: {format(new Date(dates.inspection), "MMM d, yyyy")}</p>}
                  {dates?.start && <p>Start: {format(new Date(dates.start), "MMM d, yyyy")}</p>}
                  {dates?.end && <p>End: {format(new Date(dates.end), "MMM d, yyyy")}</p>}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> AI Claim Prediction</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleAiPredict} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Predict"}
                </Button>
              </CardHeader>
              <CardContent>
                {aiPrediction ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-foreground">{aiPrediction.prediction}</p>
                    <div className="flex gap-3">
                      <Badge variant="outline">Confidence: {aiPrediction.confidence}</Badge>
                      <Badge variant="outline">~{aiPrediction.estimated_days} days</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Click "Predict" to get an AI-powered claim prediction.</p>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Sub Jobs Section for Main Jobs */}
          {isMainJob && subJobsList.length > 0 && (
            <div className="lg:col-span-3">
              <Card className="shadow-card bg-blue-100 dark:bg-blue-900/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Hammer className="h-4 w-4" /> Sub Jobs ({subJobsList.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Job ID</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Trades</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">ACV</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">RCV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subJobsList.map((sub: any) => (
                          <tr key={sub.id} className="border-b cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/jobs/${sub.id}`)}>
                            <td className="px-4 py-2 font-mono font-medium text-foreground">{sub.job_id}</td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">{sub.trade_types?.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
                            </td>
                            <td className="px-4 py-2"><Badge variant="outline" className="text-xs capitalize">{sub.status}</Badge></td>
                            <td className="px-4 py-2 text-right font-mono">${((sub.financials as any)?.acv ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-mono">${((sub.financials as any)?.rcv ?? 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Aggregated Financials for Main Jobs with Subs */}
          {isMainJob && subJobsList.length > 0 && (
            <div className="lg:col-span-3">
              <Card className="shadow-card bg-green-100 dark:bg-green-900/30">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Aggregated Financials</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Own ACV</p>
                      <p className="text-lg font-bold">${(financials?.acv ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subs ACV</p>
                      <p className="text-lg font-bold">${subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.acv ?? 0), 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total ACV</p>
                      <p className="text-lg font-bold text-accent">${((financials?.acv ?? 0) + subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.acv ?? 0), 0)).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total RCV</p>
                      <p className="text-lg font-bold text-accent">${((financials?.rcv ?? 0) + subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.rcv ?? 0), 0)).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="lg:col-span-3">
            <ProductionSection
              jobId={job.id}
              milestones={(job as any).production_milestones ?? {}}
              qualification={((job as any).qualification ?? {}) as Qualification}
              numberOfSquares={getSquaresReported(job as any)}
              squaresEstimated={(job as any).squares_estimated ?? null}
              squaresActualInstalled={(job as any).squares_actual_installed ?? null}
              squaresFinal={(job as any).squares_final ?? null}
              assignments={assignments}
              profileMap={profileMap}
              tracking={(job as any).tracking ?? {}}
              isMainJob={isMainJob}
              parentClaimNumber={isSubJob ? (job as any).claim_number : null}
              carrierFromCustomer={customer?.insurance_carrier ?? null}
            />
          </div>

          {/* SiteCam */}
          <div className="lg:col-span-3">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                  <Camera className="h-4 w-4" /> SiteCam
                </h3>
                <SiteCamGallery jobId={job.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="info">
            <TabsList className="w-full flex-wrap h-auto gap-1 p-1 overflow-x-auto bg-[var(--wc-surface-1)] border-b border-[var(--wc-border)] rounded-none">
              <TabsTrigger
                value="info"
                className="flex-1 min-h-[48px] text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase rounded-md text-[var(--wc-muted)] data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)] hover:text-[var(--wc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
              >
                Info
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="flex-1 min-h-[48px] text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase rounded-md text-[var(--wc-muted)] data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)] hover:text-[var(--wc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
              >
                Team
              </TabsTrigger>
              <TabsTrigger
                value="docs"
                className="flex-1 min-h-[48px] text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase rounded-md text-[var(--wc-muted)] data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)] hover:text-[var(--wc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
              >
                Docs
              </TabsTrigger>
              <TabsTrigger
                value="production"
                className="flex-1 min-h-[48px] text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase rounded-md text-[var(--wc-muted)] data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)] hover:text-[var(--wc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
              >
                Production
              </TabsTrigger>
              <TabsTrigger
                value="sitecam"
                className="flex-1 min-h-[48px] text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase rounded-md text-[var(--wc-muted)] data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)] hover:text-[var(--wc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
              >
                SiteCam
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-4 mt-4">
              <CustomerInfoCard customer={customer} />
              <SiteAddressCard
                siteAddress={siteAddress} editing={editSiteAddr}
                street={siteStreet} city={siteCity} state={siteState} zip={siteZip}
                onToggleEdit={() => { setEditSiteAddr(!editSiteAddr); setSiteStreet(siteAddress?.street || ""); setSiteCity(siteAddress?.city || ""); setSiteState(siteAddress?.state || ""); setSiteZip(siteAddress?.zip || ""); }}
                onStreetChange={setSiteStreet} onCityChange={setSiteCity}
                onStateChange={setSiteState} onZipChange={setSiteZip}
                onSave={handleSaveSiteAddress} onCopyCustomer={handleCopyCustomerAddress}
              />
              <FinancialsCard
                financials={financials} showEdit={showFinEdit}
                editAcv={editAcv} editRcv={editRcv}
                onToggleEdit={() => { setShowFinEdit(!showFinEdit); setEditAcv(String(financials?.acv ?? 0)); setEditRcv(String(financials?.rcv ?? 0)); }}
                onAcvChange={setEditAcv} onRcvChange={setEditRcv} onSave={handleSaveFinancials}
              />
              <NotesCard
                notes={job.notes ?? ""} editNotes={editNotes}
                onEdit={() => setEditNotes(job.notes ?? "")}
                onChange={setEditNotes} onSave={handleSaveNotes} onCancel={() => setEditNotes(null)}
              />
              <AppointmentsCard
                appointments={appointments} apptDate={apptDate} apptOutcome={apptOutcome}
                onDateChange={setApptDate} onOutcomeChange={setApptOutcome}
                onAdd={handleAddAppointment} isPending={createAppointment.isPending}
              />
            </TabsContent>
            <TabsContent value="team" className="space-y-4 mt-4">
              <AssignmentsCard
                assignments={assignments} profileMap={profileMap} allProfiles={allProfiles}
                assignUserId={assignUserId} assignRole={assignRole}
                onUserChange={setAssignUserId} onRoleChange={setAssignRole}
                onAdd={handleAddAssignment} onRemove={handleRemoveAssignment}
                isPending={createAssignment.isPending}
              />
              <CommissionCard
                jobId={job.id} salesRepId={commRepId}
                showForm={showCommForm} amount={commAmount} notes={commNotes}
                onToggleForm={() => setShowCommForm(!showCommForm)}
                onAmountChange={setCommAmount} onNotesChange={setCommNotes}
                onAdd={handleAddCommission} isPending={createCommission.isPending}
              />
            </TabsContent>
            <TabsContent value="docs" className="mt-4 space-y-4">
              <DocumentsPanel jobId={job.id} />
            </TabsContent>
            <TabsContent value="production" className="mt-4">
               <ProductionSection
                jobId={job.id}
                milestones={(job as any).production_milestones ?? {}}
                qualification={((job as any).qualification ?? {}) as Qualification}
                numberOfSquares={getSquaresReported(job as any)}
                squaresEstimated={(job as any).squares_estimated ?? null}
                squaresActualInstalled={(job as any).squares_actual_installed ?? null}
                squaresFinal={(job as any).squares_final ?? null}
                assignments={assignments}
                profileMap={profileMap}
                tracking={(job as any).tracking ?? {}}
                isMainJob={isMainJob}
                parentClaimNumber={isSubJob ? (job as any).claim_number : null}
                carrierFromCustomer={customer?.insurance_carrier ?? null}
              />
            </TabsContent>
            <TabsContent value="sitecam" className="mt-4">
              <SiteCamGallery jobId={job.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

function CustomerInfoCard({ customer }: { customer: any }) {
  const addr = customer?.main_address as any;
  const contactInfo = customer?.contact_info as any;
  const phones = (contactInfo?.phones ?? []) as Array<{ type: string; number: string }>;
  const emails = (contactInfo?.emails ?? []) as Array<{ type: string; address: string }>;

  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium text-foreground">{customer?.name ?? "Unknown"}</p>
        {customer?.customer_number && <p className="font-mono text-xs text-muted-foreground">{customer.customer_number}</p>}
        {phones.map((p, i) => (
          <p key={i} className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" />{p.number}
            {phones.length > 1 && <Badge variant="outline" className="text-[9px] px-1 py-0">{p.type}</Badge>}
          </p>
        ))}
        {emails.map((e, i) => (
          <p key={i} className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" />{e.address}
            {emails.length > 1 && <Badge variant="outline" className="text-[9px] px-1 py-0">{e.type}</Badge>}
          </p>
        ))}
        {addr?.street && (
          <AddressLink address={addr} />
        )}
        {customer?.insurance_carrier && (
          <p className="text-xs text-muted-foreground">Insurance: {customer.insurance_carrier}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SiteAddressCard({ siteAddress, editing, street, city, state, zip, onToggleEdit, onStreetChange, onCityChange, onStateChange, onZipChange, onSave, onCopyCustomer }: {
  siteAddress: any; editing: boolean;
  street: string; city: string; state: string; zip: string;
  onToggleEdit: () => void; onStreetChange: (v: string) => void; onCityChange: (v: string) => void;
  onStateChange: (v: string) => void; onZipChange: (v: string) => void;
  onSave: () => void; onCopyCustomer: () => void;
}) {
  const hasAddr = siteAddress?.street || siteAddress?.city;
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Job Site Address</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggleEdit}>{editing ? "Cancel" : "Edit"}</Button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={onCopyCustomer} className="w-full text-xs">
              Copy from Customer Address
            </Button>
            <Input placeholder="Street" value={street} onChange={(e) => onStreetChange(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City" value={city} onChange={(e) => onCityChange(e.target.value)} />
              <Input placeholder="State" value={state} onChange={(e) => onStateChange(e.target.value)} />
              <Input placeholder="ZIP" value={zip} onChange={(e) => onZipChange(e.target.value)} />
            </div>
            <Button size="sm" onClick={onSave} className="w-full"><Save className="mr-2 h-3 w-3" /> Save</Button>
          </div>
        ) : hasAddr ? (
          <AddressLink address={siteAddress} />
        ) : (
          <p className="text-xs text-muted-foreground">No site address set. Click Edit to add one.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentsCard({ assignments, profileMap, allProfiles, assignUserId, assignRole, onUserChange, onRoleChange, onAdd, onRemove, isPending }: {
  assignments: any[]; profileMap: Map<string, any>; allProfiles: any[];
  assignUserId: string; assignRole: string;
  onUserChange: (v: string) => void; onRoleChange: (v: string) => void;
  onAdd: () => void; onRemove: (id: string) => void; isPending: boolean;
}) {
  const assignedUserIds = new Set(assignments.map(a => a.user_id));
  const availableProfiles = allProfiles.filter(p => !assignedUserIds.has(p.user_id));

  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Assignments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {assignments.length === 0 && (
          <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {assignments.map((a: any) => {
            const profile = profileMap.get(a.user_id);
            const roleLabel = ASSIGNMENT_ROLES.find(r => r.value === a.assignment_role)?.label ?? a.assignment_role;
            return (
              <div key={a.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 bg-muted/50">
                <span className="text-sm font-medium">{profile?.name || "Unknown"}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{roleLabel}</Badge>
                <button onClick={() => onRemove(a.id)} className="text-muted-foreground hover:text-destructive ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t pt-3 space-y-2">
          <Select value={assignUserId} onValueChange={onUserChange}>
            <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
            <SelectContent>
              {availableProfiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignRole} onValueChange={onRoleChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onAdd} disabled={isPending || !assignUserId} className="w-full">
            <Plus className="mr-1 h-3 w-3" /> Add Assignment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialsCard({ financials, showEdit, editAcv, editRcv, onToggleEdit, onAcvChange, onRcvChange, onSave }: {
  financials: any; showEdit: boolean; editAcv: string; editRcv: string;
  onToggleEdit: () => void; onAcvChange: (v: string) => void; onRcvChange: (v: string) => void; onSave: () => void;
}) {
  return (
    <Card className="shadow-card bg-green-100 dark:bg-green-900/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financials</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggleEdit}>{showEdit ? "Cancel" : "Edit"}</Button>
      </CardHeader>
      <CardContent>
        {showEdit ? (
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">ACV</Label><Input type="number" value={editAcv} onChange={(e) => onAcvChange(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">RCV</Label><Input type="number" value={editRcv} onChange={(e) => onRcvChange(e.target.value)} /></div>
            <Button size="sm" onClick={onSave} className="w-full"><Save className="mr-2 h-3 w-3" /> Save</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">ACV</p><p className="text-lg font-bold text-foreground">${(financials?.acv ?? 0).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">RCV</p><p className="text-lg font-bold text-foreground">${(financials?.rcv ?? 0).toLocaleString()}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotesCard({ notes, editNotes, onEdit, onChange, onSave, onCancel }: {
  notes: string; editNotes: string | null;
  onEdit: () => void; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Notes</CardTitle>
        {editNotes === null ? (
          <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editNotes !== null ? (
          <Textarea value={editNotes} onChange={(e) => onChange(e.target.value)} rows={5} maxLength={2000} />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes || "No notes yet."}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentsCard({ appointments, apptDate, apptOutcome, onDateChange, onOutcomeChange, onAdd, isPending }: {
  appointments: any[]; apptDate: string; apptOutcome: string;
  onDateChange: (v: string) => void; onOutcomeChange: (v: string) => void; onAdd: () => void; isPending: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Appointments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((a: any) => (
          <div key={a.id} className="rounded-lg border p-2.5 text-sm">
            <p className="font-medium text-foreground">{format(new Date(a.date_time), "MMM d, yyyy h:mm a")}</p>
            {a.outcome && <p className="text-xs text-muted-foreground mt-1">{a.outcome}</p>}
          </div>
        ))}
        <div className="border-t pt-3 space-y-2">
          <Input type="datetime-local" value={apptDate} onChange={(e) => onDateChange(e.target.value)} />
          <Input placeholder="Outcome/notes" value={apptOutcome} onChange={(e) => onOutcomeChange(e.target.value)} maxLength={500} />
          <Button size="sm" onClick={onAdd} disabled={isPending || !apptDate} className="w-full">Add Appointment</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CommissionCard({ jobId, salesRepId, showForm, amount, notes, onToggleForm, onAmountChange, onNotesChange, onAdd, isPending }: {
  jobId: string; salesRepId: string | null; showForm: boolean; amount: string; notes: string;
  onToggleForm: () => void; onAmountChange: (v: string) => void; onNotesChange: (v: string) => void;
  onAdd: () => void; isPending: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Commission</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggleForm}>
          {showForm ? "Cancel" : <><Plus className="mr-1 h-3 w-3" /> Add</>}
        </Button>
      </CardHeader>
      <CardContent>
        {!salesRepId ? (
          <p className="text-xs text-muted-foreground">No primary rep assigned to this job</p>
        ) : showForm ? (
          <div className="space-y-2">
            <div className="space-y-1"><Label className="text-xs">Amount ($)</Label><Input type="number" value={amount} onChange={(e) => onAmountChange(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="Optional notes" maxLength={500} /></div>
            <Button size="sm" onClick={onAdd} disabled={isPending || !amount} className="w-full">Add Commission</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Add commissions for this job's primary rep</p>
        )}
      </CardContent>
    </Card>
  );
}
