/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { AddressLink } from "@/components/AddressLink";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { SiteCamGallery } from "@/components/sitecam/SiteCamGallery";
import { EditJobModal } from "@/components/jobs/EditJobModal";
import { ProductionSection } from "@/components/production/ProductionSection";
import { DualWorkflowStatusBar } from "@/components/job/DualWorkflowStatusBar";
import MilestonesMainTab from "@/components/job/MilestonesMainTab";
import MilestonesSubTab from "@/components/job/MilestonesSubTab";
import {
  useAppointments,
  useCreateJobAssignment,
  useDeleteJobAssignment,
  useJob,
  useJobAssignments,
  useSoftDeleteJob,
  useSubJobs,
  useUpdateJob,
} from "@/hooks/useJobs";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useTradeTypes } from "@/hooks/useProduction";
import { useStatusBranches } from "@/hooks/useStatusBranches";
import { useJobStatuses } from "@/hooks/useCustomizations";
import { useUserRoles } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseErr } from "@/hooks/useDocuments";
import type { Qualification } from "@/hooks/useJobProduction";
import { JobAppointmentsBlock } from "@/components/appointments/JobAppointmentsBlock";
import {
  ArrowLeft,
  Camera,
  DollarSign,
  Hammer,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { resolveJobsBackPath, type JobNavigationState } from "@/lib/jobNavigation";

const ASSIGNMENT_ROLES = [
  { value: "primary_rep", label: "Primary Rep" },
  { value: "assistant_rep", label: "Assistant Rep" },
  { value: "manager_override", label: "Manager Override" },
  { value: "field_tech", label: "Field Tech" },
];

const FLOW_STAGES = ["lead", "inspected", "approved", "scheduled", "completed", "closed"];

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);

/** Matches AddressLink: maps link only renders when street or city is non-empty. */
function addressHasStreetOrCity(addr: unknown): boolean {
  if (!addr || typeof addr !== "object") return false;
  const a = addr as Record<string, unknown>;
  const street = String(a.street ?? "").trim();
  const city = String(a.city ?? "").trim();
  return Boolean(street || city);
}

export default function Operations() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: job, isLoading } = useJob(id);
  const { data: assignments = [] } = useJobAssignments(id);
  const { data: allProfiles = [] } = useAllProfiles();
  const { data: appointments = [] } = useAppointments(id);
  const { data: jobStatuses = [] } = useJobStatuses();
  const { data: branches = [] } = useStatusBranches();
  const { data: tradeTypes = [] } = useTradeTypes();
  const updateJob = useUpdateJob();
  const createAssignment = useCreateJobAssignment();
  const deleteAssignment = useDeleteJobAssignment();
  const softDeleteJob = useSoftDeleteJob();
  const { data: myRoles = [] } = useUserRoles();

  const canDelete = myRoles.some((r) => ["owner", "manager", "office_admin"].includes(r));
  const [activeTab, setActiveTab] = useState("overview");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("primary_rep");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [tradesModalOpen, setTradesModalOpen] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const isSubJob = !!job && !!(job as any).parent_job_id;
  const isMainJob = !!job && !isSubJob;
  const { data: subJobsList = [] } = useSubJobs(isMainJob ? job?.id : undefined);

  const navState = (location.state as JobNavigationState | null) ?? null;
  const backToJobsPath = resolveJobsBackPath(navState);

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
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(backToJobsPath)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </AppLayout>
    );
  }

  const customer = (job.customers ?? {}) as any;
  const financials = (job.financials ?? {}) as any;
  const jobType = ((job as any).job_type ?? "insurance") as "insurance" | "cash";
  const estimateAmount = Number((job as any).estimate_amount ?? financials?.acv ?? 0);
  const siteAddress = (job.site_address ?? {}) as any;
  const customerMainAddress = (customer?.main_address ?? {}) as any;
  const displayJobSiteAddress = addressHasStreetOrCity(siteAddress)
    ? siteAddress
    : addressHasStreetOrCity(customerMainAddress)
      ? customerMainAddress
      : null;

  const profileMap = new Map(allProfiles.map((p) => [p.user_id, p]));

  const ownAcv = Number(financials?.acv ?? 0);
  const ownRcv = Number(financials?.rcv ?? 0);
  const subsAcv = subJobsList.reduce((sum: number, sub: any) => sum + Number((sub.financials as any)?.acv ?? 0), 0);
  const subsRcv = subJobsList.reduce((sum: number, sub: any) => sum + Number((sub.financials as any)?.rcv ?? 0), 0);
  const totalAcv = ownAcv + subsAcv;
  const totalRcv = ownRcv + subsRcv;
  const checksReceived = Number((job as any)?.aggregated_financials?.checks_received ?? 0);
  const variance = totalRcv - checksReceived;

  const stageIndex = FLOW_STAGES.findIndex((stage) => stage === String(job.status || "").toLowerCase());
  const effectiveStage = stageIndex < 0 ? 0 : stageIndex;
  const progressPct = Math.round(((effectiveStage + 1) / FLOW_STAGES.length) * 100);

  const assignedUserIds = new Set(assignments.map((a) => a.user_id));
  const availableProfiles = allProfiles.filter((p) => !assignedUserIds.has(p.user_id));

  const handleMainStatusChange = async (status: string) => {
    try {
      await updateJob.mutateAsync({ id: job.id, status: status as any });
      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSupplementStatusChange = async (status: string) => {
    try {
      await updateJob.mutateAsync({ id: job.id, supplement_status: status } as any);
      toast({ title: "Supplement status updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleSupplement = async (enabled: boolean) => {
    try {
      await updateJob.mutateAsync({ id: job.id, has_supplement: enabled } as any);
      toast({ title: enabled ? "Supplement enabled" : "Supplement disabled" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment.mutateAsync({ id: assignmentId, jobId: job.id });
      toast({ title: "Assignment removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (notesDraft === null) return;
    try {
      await updateJob.mutateAsync({ id: job.id, notes: notesDraft });
      setNotesDraft(null);
      toast({ title: "Notes saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-10">
        <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate(backToJobsPath)}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to Jobs
                </Button>
                {isSubJob && (job as any).parent_job_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => navigate(`/operations/${(job as any).parent_job_id}`, { state: navState })}
                  >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to Main Job
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{job.job_id}</h1>
                  {isSubJob && <Badge variant="secondary">Sub Job</Badge>}
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  <Link to={`/customers/${job.customer_id}`} className="font-medium text-foreground hover:underline">
                    {customer?.name ?? "Unknown Customer"}
                  </Link>
                  {(job as any).claim_number ? ` • ${jobType === "cash" ? "Cash Ref" : "Claim #"}${(job as any).claim_number}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="outline" className="min-h-[44px]" onClick={() => setEditJobOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Job
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => {
                    setTradesModalOpen(true);
                    setSelectedTrades(job.trade_types ?? []);
                  }}
                >
                  <Hammer className="mr-2 h-4 w-4" />
                  Forge Trades
                </Button>
                <CreateJobModal
                  defaultCustomerId={job.customer_id}
                  defaultParentJobId={job.id}
                  trigger={
                    <Button className="min-h-[44px]">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sub Job
                    </Button>
                  }
                />
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="min-h-[44px]">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {job.job_id}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This soft-deletes this job and hides it from listings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            try {
                              await softDeleteJob.mutateAsync(job.id);
                              navigate("/jobs");
                              toast({ title: "Job deleted" });
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
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

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Main Flow</span>
                <span>{FLOW_STAGES[effectiveStage] ?? "lead"} {progressPct}%</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {FLOW_STAGES.map((stage, idx) => (
                  <div key={stage} className={`h-2 rounded-full ${idx <= effectiveStage ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6">
          <DualWorkflowStatusBar
            allStatuses={jobStatuses}
            branches={branches}
            mainStatus={job.status}
            supplementStatus={(job as any).supplement_status}
            hasSupplement={(job as any).has_supplement ?? false}
            onMainStatusChange={handleMainStatusChange}
            onSupplementStatusChange={handleSupplementStatusChange}
            onToggleSupplement={handleToggleSupplement}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5">
              <TabsTrigger value="overview" className="min-h-[44px]">Main Overview</TabsTrigger>
              <TabsTrigger value="items" className="min-h-[44px]">War Room</TabsTrigger>
              <TabsTrigger value="milestones" className="min-h-[44px]">Milestones</TabsTrigger>
              <TabsTrigger value="financials" className="min-h-[44px]">Financials</TabsTrigger>
              <TabsTrigger value="sitecam" className="min-h-[44px]">SiteCam</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-7">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer & Site</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                        <p className="font-medium">{customer?.name ?? "Unknown Customer"}</p>
                        {(customer?.contact_info as any)?.phones?.[0]?.number && (
                          <p className="text-sm text-muted-foreground">{(customer.contact_info as any).phones[0].number}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Job Site</p>
                        {displayJobSiteAddress ? (
                          <AddressLink address={displayJobSiteAddress} />
                        ) : (
                          <p className="text-sm text-muted-foreground">No site address set</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200/60 bg-green-50/50 dark:border-green-800/40 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Aggregated Financials
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <MetricCard label={jobType === "cash" ? "Total Estimate/ACV" : "Total ACV"} value={currency(totalAcv)} accent />
                      <MetricCard label="Total RCV" value={currency(totalRcv)} accent />
                      <MetricCard label="Checks Received" value={currency(checksReceived)} />
                      <MetricCard label="Variance" value={currency(variance)} warning />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6 lg:col-span-5">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Team
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No team assigned yet.</p>}
                        {assignments.map((assignment: any) => {
                          const profile = profileMap.get(assignment.user_id);
                          const roleLabel =
                            ASSIGNMENT_ROLES.find((role) => role.value === assignment.assignment_role)?.label ??
                            assignment.assignment_role;
                          return (
                            <Badge key={assignment.id} variant="secondary" className="gap-1 px-3 py-1">
                              {profile?.name || "Unknown"} • {roleLabel}
                              <button
                                className="ml-1 rounded p-0.5 hover:bg-muted"
                                onClick={() => handleRemoveAssignment(assignment.id)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <Select value={assignUserId} onValueChange={setAssignUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProfiles.map((profile) => (
                              <SelectItem key={profile.user_id} value={profile.user_id}>
                                {profile.name || profile.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={assignRole} onValueChange={setAssignRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNMENT_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button className="w-full min-h-[44px]" variant="outline" onClick={handleAddAssignment}>
                          + Manage Assignments
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <JobAppointmentsBlock layout="sidebar" jobId={job.id} appointments={appointments} />

                  <Card>
                    <CardHeader>
                      <CardTitle>SiteCam</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button className="min-h-[44px]" onClick={() => setActiveTab("sitecam")}>
                          <Camera className="mr-2 h-4 w-4" />
                          Capture Photo
                        </Button>
                        <Button variant="outline" className="min-h-[44px]" onClick={() => setActiveTab("sitecam")}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                      <p className="text-center text-xs text-muted-foreground">Use SiteCam to document roof conditions fast.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sub Jobs ({subJobsList.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {subJobsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sub jobs yet.</p>
                  ) : (
                    subJobsList.map((sub: any) => (
                      <button
                        key={sub.id}
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/40"
                        onClick={() => navigate(`/operations/${sub.id}`, { state: navState })}
                      >
                        <div>
                          <p className="font-medium">{sub.job_id}</p>
                          <p className="text-xs text-muted-foreground">{(sub.trade_types ?? []).join(", ") || "No trade set"}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="capitalize">
                            {sub.status}
                          </Badge>
                          <p className="mt-1 text-sm font-semibold">{currency(Number((sub.financials as any)?.acv ?? 0))}</p>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones" className="mt-6 space-y-6">
              <div className="space-y-8">
                <MilestonesMainTab jobId={job.id} />
                <MilestonesSubTab jobId={job.id} />
              </div>

              <JobAppointmentsBlock jobId={job.id} appointments={appointments} />

              <Card>
                <CardHeader>
                  <CardTitle>Job Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notesDraft === null ? (
                    <>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.notes || "No notes yet."}</p>
                      <Button variant="outline" className="min-h-[44px]" onClick={() => setNotesDraft(job.notes ?? "")}>
                        Edit Notes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={5} maxLength={2000} />
                      <div className="flex gap-2">
                        <Button className="min-h-[44px]" onClick={handleSaveNotes}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button variant="outline" className="min-h-[44px]" onClick={() => setNotesDraft(null)}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="mt-6">
              <ProductionSection
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
                subNavGreenGlow={activeTab === "items"}
              />
            </TabsContent>

            <TabsContent value="financials" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label={jobType === "cash" ? "Own Estimate/ACV" : "Own ACV"} value={currency(jobType === "cash" ? estimateAmount : ownAcv)} />
                  <MetricCard label="Own RCV" value={currency(ownRcv)} />
                  <MetricCard label="Sub Jobs ACV" value={currency(subsAcv)} />
                  <MetricCard label="Sub Jobs RCV" value={currency(subsRcv)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sitecam" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>SiteCam Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <SiteCamGallery jobId={job.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ResponsiveModal open={tradesModalOpen} onOpenChange={setTradesModalOpen} title={`Edit Trades - ${job.job_id}`} className="max-w-sm">
        <div className="max-h-72 space-y-2 overflow-y-auto py-2">
          {tradeTypes.map((tradeType) => (
            <label
              key={tradeType.id}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted/50"
            >
              <Checkbox
                checked={selectedTrades.includes(tradeType.name)}
                onCheckedChange={(checked) => {
                  setSelectedTrades((prev) =>
                    checked ? [...prev, tradeType.name] : prev.filter((name) => name !== tradeType.name),
                  );
                }}
              />
              <span className="text-sm">{tradeType.name}</span>
            </label>
          ))}
        </div>
        <Button
          className="mt-2 w-full min-h-[44px]"
          onClick={async () => {
            try {
              await updateJob.mutateAsync({ id: job.id, trade_types: selectedTrades });
              setTradesModalOpen(false);
              toast({ title: "Trades updated" });
            } catch (error: any) {
              toast({ title: "Error", description: error.message, variant: "destructive" });
            }
          }}
        >
          Save Trades
        </Button>
      </ResponsiveModal>
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
          } catch (error: unknown) {
            toast({ title: "Error", description: formatSupabaseErr(error), variant: "destructive" });
          }
        }}
      />
    </AppLayout>
  );
}

function MetricCard({ label, value, accent, warning }: { label: string; value: string; accent?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-green-600" : warning ? "text-amber-600" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
