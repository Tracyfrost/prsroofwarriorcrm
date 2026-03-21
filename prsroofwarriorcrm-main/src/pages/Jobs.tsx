import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { useJobs, useUpdateJob, type Job } from "@/hooks/useJobs";
import { AppLayout } from "@/components/AppLayout";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, GripVertical, LayoutGrid, List, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useIsMobile } from "@/hooks/use-mobile";
import { BattleTooltip } from "@/components/BattleTooltip";

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  inspected: "Inspected",
  approved: "Approved",
  scheduled: "Scheduled",
  completed: "Completed",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  inspected: "bg-accent/20 text-accent-foreground",
  approved: "bg-success/20 text-success-foreground",
  scheduled: "bg-primary/20 text-primary-foreground",
  completed: "bg-success/30 text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};

const STATUSES = Constants.public.Enums.job_status;

export default function Jobs() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: jobs = [], isLoading } = useJobs();
  const updateJob = useUpdateJob();
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageTitle("Jobs");

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJob.mutateAsync({ id: jobId, status: newStatus as any });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filtered = jobs.filter((j) => {
    const matchSearch =
      j.job_id.toLowerCase().includes(search.toLowerCase()) ||
      j.customers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Battlefield Operations</h1>
            <p className="text-muted-foreground text-sm">{jobs.length} missions forged · Mission Control</p>
          </div>
          <CreateJobModal
            trigger={
              <Button><Plus className="mr-2 h-4 w-4" /> Add Job</Button>
            }
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden">
            <BattleTooltip phraseKey="view_board">
              <button
                onClick={() => setView("board")}
                className={`px-3 py-2 text-sm ${view === "board" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </BattleTooltip>
            <BattleTooltip phraseKey="view_table">
              <button
                onClick={() => setView("table")}
                className={`px-3 py-2 text-sm ${view === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </BattleTooltip>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading jobs...</p>
        ) : view === "board" ? (
          <KanbanBoard jobs={filtered} onStatusChange={handleStatusChange} onJobClick={(id) => navigate(`/jobs/${id}`)} />
        ) : isMobile ? (
          <JobCardList jobs={filtered} onJobClick={(id) => navigate(`/jobs/${id}`)} />
        ) : (
          <JobTable jobs={filtered} onJobClick={(id) => navigate(`/jobs/${id}`)} />
        )}
      </PageWrapper>
    </AppLayout>
  );
}

function KanbanBoard({ jobs, onStatusChange, onJobClick }: {
  jobs: Job[];
  onStatusChange: (id: string, status: string) => void;
  onJobClick: (id: string) => void;
}) {
  const columns = STATUSES.filter((s) => s !== "closed");

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const colJobs = jobs.filter((j) => j.status === status);
        return (
          <div key={status} className="min-w-[260px] flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
              <span className="text-xs text-muted-foreground">{colJobs.length}</span>
            </div>
            <div className="space-y-2">
              {colJobs.map((job) => (
                <Card
                  key={job.id}
                  className="cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
                  onClick={() => onJobClick(job.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">
                          {job.job_id}
                          {(job as any).parent_job_id && <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Sub</Badge>}
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1">{job.customers?.name ?? "Unknown"}</p>
                      </div>
                      <Select
                        value={job.status}
                        onValueChange={(v) => onStatusChange(job.id, v)}
                      >
                        <SelectTrigger className="h-6 w-6 p-0 border-0 [&>svg]:hidden" onClick={(e) => e.stopPropagation()}>
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {job.trade_types?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.trade_types.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {(job.financials as any)?.acv > 0 && (
                      <p className="mt-2 text-xs font-medium text-foreground">
                        ACV: ${((job.financials as any).acv).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {colJobs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No jobs</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobCardList({ jobs, onJobClick }: { jobs: Job[]; onJobClick: (id: string) => void }) {
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">No jobs found</div>
    );
  }
  return (
    <div className="space-y-2">
      {jobs.map((j) => (
        <Card
          key={j.id}
          className="cursor-pointer shadow-card hover:shadow-card-hover active:scale-[0.99] transition-all min-h-[48px] flex items-center"
          onClick={() => onJobClick(j.id)}
        >
          <CardContent className="p-4 w-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">
                    {j.job_id}
                    {(j as any).parent_job_id && <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Sub</Badge>}
                  </span>
                  <Badge className={STATUS_COLORS[j.status]}>{STATUS_LABELS[j.status]}</Badge>
                </div>
                <p className="font-medium text-foreground mt-1 truncate">{j.customers?.name ?? "Unknown"}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {j.trade_types?.length ? <span>{j.trade_types.join(", ")}</span> : null}
                  {(j.financials as any)?.acv > 0 && (
                    <span className="font-medium text-foreground">ACV: ${((j.financials as any).acv).toLocaleString()}</span>
                  )}
                  <span>{new Date(j.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function JobTable({ jobs, onJobClick }: { jobs: Job[]; onJobClick: (id: string) => void }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trades</TableHead>
              <TableHead>ACV</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No jobs found</TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => (
                <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onJobClick(j.id)}>
                  <TableCell className="font-mono text-sm">
                    {j.job_id}
                    {(j as any).parent_job_id && <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Sub</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{j.customers?.name ?? "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[j.status]}>{STATUS_LABELS[j.status]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.trade_types?.join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">{(j.financials as any)?.acv > 0 ? `$${(j.financials as any).acv.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
