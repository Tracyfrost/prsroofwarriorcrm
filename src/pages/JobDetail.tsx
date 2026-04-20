import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useJob, useUpdateJob, useAppointments, useJobAssignments, useCreateJobAssignment, useDeleteJobAssignment, useSubJobs, useSoftDeleteJob, useSetJobArchived } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { useCreateCommission } from "@/hooks/useCommissions";
import { useAllProfiles } from "@/hooks/useHierarchy";
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
import { ArrowLeft, DollarSign, MapPin, Phone, Mail, Save, Plus, Brain, Loader2, Hammer, Users, X, ChevronDown, ChevronUp, Camera, Archive } from "lucide-react";
import { AddressLink } from "@/components/AddressLink";
import { BattleTooltip } from "@/components/BattleTooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { JobAppointmentsBlock } from "@/components/appointments/JobAppointmentsBlock";
import { ProductionSection } from "@/components/production/ProductionSection";
import { DualWorkflowStatusBar } from "@/components/job/DualWorkflowStatusBar";
import { useStatusBranches } from "@/hooks/useStatusBranches";
import type { Qualification } from "@/hooks/useJobProduction";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useJobStatuses } from "@/hooks/useCustomizations";
import { formatSupabaseErr } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { EditJobModal } from "@/components/jobs/EditJobModal";
import { JobHeaderActionsMenu } from "@/components/jobs/JobHeaderActionsMenu";
import { resolveJobsBackPath, type JobNavigationState } from "@/lib/jobNavigation";
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabTriggerClassName,
  jobPageHorizontalPrimaryTabsListClassName,
  jobPageHorizontalPrimaryTabsTriggerClassName,
} from "@/components/layout/contextualTabNav";

// Status labels/list from flow_stages (job_status flow)

const ASSIGNMENT_ROLES = [
  { value: "primary_rep", label: "Primary Rep" },
  { value: "assistant_rep", label: "Assistant Rep" },
  { value: "manager_override", label: "Manager Override" },
  { value: "field_tech", label: "Field Tech" },
];

const jobDetailKpiButtonClass =
  "w-full min-h-[44px] rounded-lg p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer sm:min-h-0";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: job, isLoading } = useJob(id);
  const { data: appointments = [] } = useAppointments(id);
  const { data: assignments = [] } = useJobAssignments(id);
  const { data: allProfiles = [] } = useAllProfiles();
  const { data: jobStatuses = [] } = useJobStatuses();
  const { data: branches = [] } = useStatusBranches();
  const { data: tradeTypes = [] } = useTradeTypes();
  const statusLabels: Record<string, string> = Object.fromEntries(jobStatuses.map(s => [s.name, s.display_name]));
  const updateJob = useUpdateJob();
  const createAssignment = useCreateJobAssignment();
  const deleteAssignment = useDeleteJobAssignment();
  const createCommission = useCreateCommission();
  const { user } = useAuth();
  const { toast } = useToast();
  const { can } = usePermissions();
  const softDeleteJob = useSoftDeleteJob();
  const setJobArchived = useSetJobArchived();
  const canDeleteJob = can("delete_job");
  const canEditJob = can("edit_job");

  usePageTitle(job ? `Job ${job.job_id}` : "Jobs");

  const [editNotes, setEditNotes] = useState<string | null>(null);
  const [editAcv, setEditAcv] = useState<string>("");
  const [editRcv, setEditRcv] = useState<string>("");
  const [showFinEdit, setShowFinEdit] = useState(false);
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
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [createSubJobOpen, setCreateSubJobOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobMainTab, setJobMainTab] = useState("info");
  const [productionSectionKey, setProductionSectionKey] = useState(0);
  const [productionInitialSubTab, setProductionInitialSubTab] = useState("overview");

  // AI claim prediction
  const [aiPrediction, setAiPrediction] = useState<{ prediction: string; confidence: string; estimated_days: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Must call all hooks before any conditional returns
  const isSubJob = !!job && !!(job as any).parent_job_id;
  const isMainJob = !!job && !isSubJob;
  const { data: subJobsList = [] } = useSubJobs(isMainJob ? job?.id : undefined);
  const navState = (location.state as JobNavigationState | null) ?? null;
  const backToJobsPath = resolveJobsBackPath(navState);

  const handleGoToWarRoom = useCallback(() => {
    if (!id) return;
    const state: JobNavigationState = { ...navState, openWarRoom: true };
    navigate(`/operations/${id}`, { state });
  }, [id, navigate, navState]);

  useEffect(() => {
    const s = location.state as JobNavigationState | null;
    if (!s?.openJobFiles || !id) return;
    setJobMainTab("production");
    setProductionInitialSubTab("job-files");
    setProductionSectionKey((k) => k + 1);
    const { openJobFiles: _removed, ...rest } = s;
    const nextState = Object.keys(rest).length > 0 ? (rest as JobNavigationState) : null;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: nextState },
    );
  }, [location.state, location.pathname, location.search, location.hash, id, navigate]);

  useEffect(() => {
    const s = location.state as JobNavigationState | null;
    if (!s?.openSiteCam || !id) return;
    setJobMainTab("sitecam");
    const { openSiteCam: _removed, ...rest } = s;
    const nextState = Object.keys(rest).length > 0 ? (rest as JobNavigationState) : null;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: nextState },
    );
  }, [location.state, location.pathname, location.search, location.hash, id, navigate]);

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
          <Button variant="ghost" onClick={() => navigate(backToJobsPath)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Button>
        </div>
      </AppLayout>
    );
  }

  const customer = job.customers as any;
  const financials = job.financials as any;
  const jobType = ((job as any).job_type ?? "insurance") as "insurance" | "cash";
  const estimateAmount = Number((job as any).estimate_amount ?? financials?.acv ?? 0);
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
        estimate_amount: jobType === "cash" ? parseFloat(editAcv) || 0 : (job as any).estimate_amount ?? 0,
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

  const isArchived = Boolean((job as any).archived_at);

  return (
    <AppLayout>
      <div className={`animate-fade-in ${isArchived ? "opacity-95" : ""}`}>
        {/* Back + Header */}
        <div className="mb-6">
          {isArchived && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              <Archive className="h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
              <div>
                <Badge variant="secondary" className="mb-1 text-[10px] uppercase tracking-wide">Archived</Badge>
                <p>This job is archived. It remains in the system with muted styling; use Unarchive to return it to active work.</p>
              </div>
            </div>
          )}
          <BattleTooltip phraseKey="back_to_jobs">
            <Button variant="ghost" size="sm" onClick={() => navigate(backToJobsPath)} className="mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
            </Button>
          </BattleTooltip>
          {isSubJob && parentJobId && (
            <BattleTooltip phraseKey="back_to_main_job">
              <div className="mb-2">
                <Link to={`/operations/${parentJobId}`} state={navState} className="text-xs text-accent hover:underline">
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
                      onClick={() => navigate(`/operations/${job.id}`, { state: navState })}
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
                        onClick={() => navigate(`/operations/${sub.id}`, { state: navState })}
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
                    {isMainJob && editClaimNumber === null && jobType === "insurance" ? (
                       <button
                         className="text-xs text-muted-foreground hover:text-foreground font-mono bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                         onClick={() => setEditClaimNumber((job as any).claim_number || "")}
                         title="Click to edit Claim#"
                       >
                         Claim# {(job as any).claim_number}
                       </button>
                    ) : isMainJob && editClaimNumber !== null && jobType === "insurance" ? (
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
                      <span className="text-xs text-muted-foreground font-mono">
                        {jobType === "cash" ? "Cash Ref" : "Claim#"} {(job as any).claim_number}
                      </span>
                     )}
                   </span>
                 )}
                 {customer?.insurance_carrier && (
                   <span className="ml-2 text-xs text-muted-foreground">• Insurance: {customer.insurance_carrier}</span>
                 )}
               </p>
             </div>
             <div className="w-full sm:w-auto sm:shrink-0">
               <JobHeaderActionsMenu
                 leading={
                   <div className="hidden md:flex md:flex-wrap md:items-center">
                     <TradesBadges trades={job.trade_types ?? []} size="sm" />
                   </div>
                 }
                 isMainJob={isMainJob}
                 isArchived={isArchived}
                 canEditJob={canEditJob}
                 canDeleteJob={canDeleteJob}
                 unarchivePending={setJobArchived.isPending}
                 onEditJob={() => setEditJobOpen(true)}
                 onForgeTrades={() => {
                   setTradesModalOpen(true);
                   setSelectedTrades(job.trade_types ?? []);
                 }}
                 onAddSubJob={() => setCreateSubJobOpen(true)}
                 onArchive={() => setArchiveDialogOpen(true)}
                 onUnarchive={async () => {
                   try {
                     await setJobArchived.mutateAsync({ jobId: job.id, archived: false });
                     toast({ title: "Job unarchived" });
                   } catch (e: any) {
                     toast({ title: "Error", description: e.message, variant: "destructive" });
                   }
                 }}
                 onDelete={() => setDeleteDialogOpen(true)}
               />
             </div>
           </div>

           <ResponsiveModal open={tradesModalOpen} onOpenChange={setTradesModalOpen} title={`Edit Trades — ${job.job_id}`} className="max-w-sm">
             <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
               {tradeTypes.map(tt => (
                 <label key={tt.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted/50 sm:min-h-0">
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
               {tradeTypes.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No trade types configured</p>}
             </div>
             <Button
               size="sm"
               className="mt-2 w-full min-h-[44px] sm:min-h-0"
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

           <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Archive {job.job_id}?</AlertDialogTitle>
                 <AlertDialogDescription>
                   This marks the job as archived{isMainJob && subJobsList.length > 0 ? ` (and its ${subJobsList.length} sub-job(s))` : ""}. It stays visible with muted styling and is excluded from aggregate reports. Owners and admins can still permanently delete if needed.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction
                   onClick={async () => {
                     try {
                       await setJobArchived.mutateAsync({ jobId: job.id, archived: true });
                       setArchiveDialogOpen(false);
                       toast({ title: "Job archived" });
                     } catch (e: any) {
                       toast({ title: "Error", description: e.message, variant: "destructive" });
                     }
                   }}
                 >
                   Archive
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>

           <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                       setDeleteDialogOpen(false);
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

           {/* Dual Workflow Status Bar */}
           <div className="mt-4 w-full min-w-0">
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

          {/* War Room shortcut — matches customer KPI card affordance */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <button
                  type="button"
                  className={jobDetailKpiButtonClass}
                  aria-label="Open War Room for this job in Operations"
                  onClick={handleGoToWarRoom}
                >
                  <p className="text-xs text-muted-foreground">War Room</p>
                  <p className="text-lg font-bold text-foreground">Open</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Production items & workbook</p>
                </button>
              </CardContent>
            </Card>
          </div>
         </div>

        {/* Job sections — primary tabs portaled under header on md+ */}
        <Tabs value={jobMainTab} onValueChange={setJobMainTab} className="w-full">
          <TabsList
            className={contextualTabListClassName(
              "md:hidden bg-[var(--wc-surface-1)] border-[var(--wc-border)] [&_[data-state=active]]:bg-[var(--wc-ink)] [&_[data-state=active]]:text-white",
            )}
          >
            <TabsTrigger value="info" className={contextualTabTriggerClassName()}>
              Info
            </TabsTrigger>
            <TabsTrigger value="team" className={contextualTabTriggerClassName()}>
              Team
            </TabsTrigger>
            <TabsTrigger value="production" className={contextualTabTriggerClassName()}>
              Production
            </TabsTrigger>
            <TabsTrigger value="sitecam" className={contextualTabTriggerClassName()}>
              SiteCam
            </TabsTrigger>
          </TabsList>

          <ContextualTabsPortal>
            <TabsList className={jobPageHorizontalPrimaryTabsListClassName()}>
              <TabsTrigger value="info" className={jobPageHorizontalPrimaryTabsTriggerClassName()}>
                Info
              </TabsTrigger>
              <TabsTrigger value="team" className={jobPageHorizontalPrimaryTabsTriggerClassName()}>
                Team
              </TabsTrigger>
              <TabsTrigger value="production" className={jobPageHorizontalPrimaryTabsTriggerClassName()}>
                Production
              </TabsTrigger>
              <TabsTrigger value="sitecam" className={jobPageHorizontalPrimaryTabsTriggerClassName()}>
                SiteCam
              </TabsTrigger>
            </TabsList>
          </ContextualTabsPortal>

          <div className="min-w-0 flex-1 mt-4 md:mt-6">
            <TabsContent value="info" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <div className="space-y-4">
                  <Card className="shadow-card">
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className={jobDetailKpiButtonClass}
                        aria-label="Open War Room for this job in Operations"
                        onClick={handleGoToWarRoom}
                      >
                        <p className="text-xs text-muted-foreground">War Room</p>
                        <p className="text-lg font-bold text-foreground">Open in Operations</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Production items, scope, and gates</p>
                      </button>
                    </CardContent>
                  </Card>
                  <CustomerInfoCard customer={customer} />
                  <SiteAddressCard
                    siteAddress={siteAddress}
                    editing={editSiteAddr}
                    street={siteStreet}
                    city={siteCity}
                    state={siteState}
                    zip={siteZip}
                    onToggleEdit={() => {
                      setEditSiteAddr(!editSiteAddr);
                      setSiteStreet(siteAddress?.street || "");
                      setSiteCity(siteAddress?.city || "");
                      setSiteState(siteAddress?.state || "");
                      setSiteZip(siteAddress?.zip || "");
                    }}
                    onStreetChange={setSiteStreet}
                    onCityChange={setSiteCity}
                    onStateChange={setSiteState}
                    onZipChange={setSiteZip}
                    onSave={handleSaveSiteAddress}
                    onCopyCustomer={handleCopyCustomerAddress}
                  />
                  <FinancialsCard
                    financials={financials}
                    showEdit={showFinEdit}
                    jobType={jobType}
                    estimateAmount={estimateAmount}
                    editAcv={editAcv}
                    editRcv={editRcv}
                    onToggleEdit={() => {
                      setShowFinEdit(!showFinEdit);
                      setEditAcv(String(financials?.acv ?? 0));
                      setEditRcv(String(financials?.rcv ?? 0));
                    }}
                    onAcvChange={setEditAcv}
                    onRcvChange={setEditRcv}
                    onSave={handleSaveFinancials}
                  />
                </div>
                <div className="space-y-4">
                  <NotesCard
                    notes={job.notes ?? ""}
                    editNotes={editNotes}
                    onEdit={() => setEditNotes(job.notes ?? "")}
                    onChange={setEditNotes}
                    onSave={handleSaveNotes}
                    onCancel={() => setEditNotes(null)}
                  />
                  <JobAppointmentsBlock jobId={job.id} appointments={appointments} />
                </div>
                <div className="space-y-4">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-sm">Timeline</CardTitle>
                    </CardHeader>
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
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Brain className="h-4 w-4" /> AI Claim Prediction
                      </CardTitle>
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
                        <p className="text-xs text-muted-foreground">Click &quot;Predict&quot; to get an AI-powered claim prediction.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              {isMainJob && subJobsList.length > 0 && (
                <Card className="shadow-card bg-blue-100 dark:bg-blue-900/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Hammer className="h-4 w-4" /> Sub Jobs ({subJobsList.length})
                    </CardTitle>
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
                            <tr
                              key={sub.id}
                              className="cursor-pointer border-b hover:bg-muted/40"
                              onClick={() => navigate(`/operations/${sub.id}`, { state: navState })}
                            >
                              <td className="px-4 py-2 font-mono font-medium text-foreground">{sub.job_id}</td>
                              <td className="px-4 py-2">
                                <div className="flex gap-1">
                                  {sub.trade_types?.map((t: string) => (
                                    <Badge key={t} variant="outline" className="text-[10px]">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {sub.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-right font-mono">${((sub.financials as any)?.acv ?? 0).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono">${((sub.financials as any)?.rcv ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
              {isMainJob && subJobsList.length > 0 && (
                <Card className="shadow-card bg-green-100 dark:bg-green-900/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" /> Aggregated Financials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Own ACV</p>
                        <p className="text-lg font-bold">${(financials?.acv ?? 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Subs ACV</p>
                        <p className="text-lg font-bold">
                          ${subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.acv ?? 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total ACV</p>
                        <p className="text-lg font-bold text-accent">
                          $
                          {(
                            (financials?.acv ?? 0) +
                            subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.acv ?? 0), 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total RCV</p>
                        <p className="text-lg font-bold text-accent">
                          $
                          {(
                            (financials?.rcv ?? 0) +
                            subJobsList.reduce((s: number, sub: any) => s + ((sub.financials as any)?.rcv ?? 0), 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="team" className="mt-0 space-y-4">
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
            <TabsContent value="production" className="mt-0">
              <ProductionSection
                key={productionSectionKey}
                jobId={job.id}
                jobDisplayId={(job as any).job_id}
                milestones={(job as any).production_milestones ?? {}}
                qualification={((job as any).qualification ?? {}) as Qualification}
                numberOfSquaresRaw={(job as any).number_of_squares ?? null}
                squaresEstimated={(job as any).squares_estimated ?? null}
                squaresActualInstalled={(job as any).squares_actual_installed ?? null}
                squaresFinal={(job as any).squares_final ?? null}
                assignments={assignments}
                profileMap={profileMap}
                tracking={(job as any).tracking ?? {}}
                isMainJob={isMainJob}
                parentClaimNumber={isSubJob ? (job as any).claim_number : null}
                carrierFromCustomer={customer?.insurance_carrier ?? null}
                initialSubTab={productionInitialSubTab}
                onGoToSiteCam={() => setJobMainTab("sitecam")}
              />
            </TabsContent>
            <TabsContent value="sitecam" className="mt-0">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Camera className="h-4 w-4" /> SiteCam
                  </h3>
                  <SiteCamGallery jobId={job.id} jobPageContext="job-detail" />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      {isMainJob && (
        <CreateJobModal
          defaultCustomerId={job.customer_id}
          defaultParentJobId={job.id}
          open={createSubJobOpen}
          onOpenChange={setCreateSubJobOpen}
        />
      )}
      <EditJobModal
        open={editJobOpen}
        onOpenChange={setEditJobOpen}
        job={job}
        tradeTypes={tradeTypes}
        isSaving={updateJob.isPending}
        onSave={async (updates) => {
          try {
            await updateJob.mutateAsync(updates as any);
            setEditJobOpen(false);
            toast({ title: "Job updated" });
          } catch (e: unknown) {
            toast({ title: "Error", description: formatSupabaseErr(e), variant: "destructive" });
          }
        }}
      />
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

function FinancialsCard({ financials, showEdit, jobType, estimateAmount, editAcv, editRcv, onToggleEdit, onAcvChange, onRcvChange, onSave }: {
  financials: any; showEdit: boolean; jobType: "insurance" | "cash"; estimateAmount: number; editAcv: string; editRcv: string;
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
            <div className="space-y-1"><Label className="text-xs">{jobType === "cash" ? "Estimate (mirrors ACV)" : "ACV"}</Label><Input type="number" value={editAcv} onChange={(e) => onAcvChange(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">RCV</Label><Input type="number" value={editRcv} onChange={(e) => onRcvChange(e.target.value)} /></div>
            <Button size="sm" onClick={onSave} className="w-full"><Save className="mr-2 h-3 w-3" /> Save</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">{jobType === "cash" ? "Estimate" : "ACV"}</p><p className="text-lg font-bold text-foreground">${(jobType === "cash" ? estimateAmount : (financials?.acv ?? 0)).toLocaleString()}</p></div>
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
