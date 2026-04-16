import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageWrapper } from "@/components/PageWrapper";
import { useCustomers, useCustomerJobs } from "@/hooks/useCustomer";
import { useJobs, type Job } from "@/hooks/useJobs";
import { useUploadSiteCamMedia } from "@/hooks/useSiteCam";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatSupabaseErr, useUploadDocument } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SiteCamCapture } from "@/components/sitecam/SiteCamCapture";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Camera, Loader2, Search, User } from "lucide-react";
import type { CustomerJob } from "@/hooks/useCustomer";

type JobPick = { id: string; job_id: string; customerLabel: string };

function jobToPick(j: Job): JobPick {
  return {
    id: j.id,
    job_id: j.job_id,
    customerLabel: j.customers?.name ?? "—",
  };
}

function customerJobToPick(j: CustomerJob, customerName: string): JobPick {
  return {
    id: j.id,
    job_id: j.job_id,
    customerLabel: customerName || "—",
  };
}

export default function SiteCamCreatePhoto() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  usePageTitle("Create SiteCam photo");

  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { data: customerJobs = [], isLoading: customerJobsLoading } = useCustomerJobs(customerId ?? undefined);
  const { data: allJobs = [], isLoading: allJobsLoading } = useJobs();
  const uploadMedia = useUploadSiteCamMedia();
  const uploadDocument = useUploadDocument();

  const [customerQuery, setCustomerQuery] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPick | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alsoUploadToJobFiles, setAlsoUploadToJobFiles] = useState(true);

  const selectedCustomer = useMemo(
    () => (customerId ? customers.find((c) => c.id === customerId) : null),
    [customers, customerId],
  );

  const jobRows: JobPick[] = useMemo(() => {
    if (customerId) {
      const name = selectedCustomer?.name?.trim() || "Customer";
      return customerJobs.map((j) => customerJobToPick(j, name));
    }
    return allJobs.map(jobToPick);
  }, [customerId, customerJobs, allJobs, selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      return name.includes(q) || c.id.toLowerCase().includes(q);
    });
  }, [customers, customerQuery]);

  const filteredJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase();
    if (!q) return jobRows;
    return jobRows.filter(
      (row) =>
        row.job_id.toLowerCase().includes(q) ||
        row.customerLabel.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q),
    );
  }, [jobRows, jobQuery]);

  useEffect(() => {
    if (!selectedJob) return;
    if (!jobRows.some((j) => j.id === selectedJob.id)) {
      setSelectedJob(null);
    }
  }, [jobRows, selectedJob]);

  const jobsLoading = customerId ? customerJobsLoading : allJobsLoading;

  const handleCapturedPhoto = async (blob: Blob) => {
    if (!selectedJob) return;
    setCaptureOpen(false);
    setUploading(true);
    try {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      const result = await uploadMedia.mutateAsync({
        jobId: selectedJob.id,
        file,
        type: "photo",
        folderId: null,
        alsoUploadToJobFiles,
        copyToJobFiles: ({
          jobId: targetJobId,
          file: uploadFile,
          uploadedBy,
          sitecamMediaId,
          displayFileName,
        }) =>
          uploadDocument.mutateAsync({
            file: uploadFile,
            jobId: targetJobId,
            type: "photo",
            uploadedBy,
            sitecamMediaId,
            displayFileName,
          }),
      });
      if (result.jobFilesCopyError) {
        toast({
          title: "Photo uploaded to SiteCam",
          description: "Job Files copy failed for this photo.",
          variant: "destructive",
        });
      } else if (alsoUploadToJobFiles) {
        toast({ title: "Photo captured and uploaded", description: "Also copied to Job Files." });
      } else {
        toast({ title: "Photo captured and uploaded" });
      }
      navigate(`/operations/${selectedJob.id}`);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: formatSupabaseErr(e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!can("view_sitecam")) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4 gap-1 px-0" asChild>
            <Link to="/sitecam">
              <ArrowLeft className="h-4 w-4" />
              Back to SiteCam feed
            </Link>
          </Button>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Create photo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Optionally filter by customer, choose a job, then take a photo. It is saved to that job&apos;s SiteCam gallery.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer (optional)
              </CardTitle>
              <CardDescription>Narrow the job list. Leave unset to search all jobs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search customers…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  disabled={customersLoading}
                />
              </div>
              <ScrollArea className="h-48 rounded-md border">
                {customersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ul className="p-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId(null);
                          setJobQuery("");
                        }}
                        className={
                          "w-full rounded-md px-2 py-2 text-left text-sm " +
                          (!customerId ? "bg-accent text-accent-foreground" : "hover:bg-muted/80")
                        }
                      >
                        Any customer
                      </button>
                    </li>
                    {filteredCustomers.map((c) => {
                      const active = customerId === c.id;
                      const label = c.name || c.id.slice(0, 8);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerId(c.id);
                              setJobQuery("");
                            }}
                            className={
                              "w-full rounded-md px-2 py-2 text-left text-sm " +
                              (active ? "bg-accent text-accent-foreground" : "hover:bg-muted/80")
                            }
                          >
                            {label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Job (required)</CardTitle>
              <CardDescription>Select where this photo will be stored.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by job code, customer, id…"
                  value={jobQuery}
                  onChange={(e) => setJobQuery(e.target.value)}
                  disabled={jobsLoading}
                />
              </div>
              <ScrollArea className="h-48 rounded-md border">
                {jobsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No jobs match.</p>
                ) : (
                  <ul className="p-1">
                    {filteredJobs.map((row) => {
                      const active = selectedJob?.id === row.id;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedJob(row)}
                            className={
                              "w-full rounded-md px-2 py-2 text-left text-sm " +
                              (active ? "bg-accent text-accent-foreground" : "hover:bg-muted/80")
                            }
                          >
                            <span className="font-mono text-xs">{row.job_id}</span>
                            <span className="mt-0.5 block text-muted-foreground">{row.customerLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Switch id="capture-copy-job-files" checked={alsoUploadToJobFiles} onCheckedChange={setAlsoUploadToJobFiles} />
            <Label htmlFor="capture-copy-job-files" className="text-sm">
              Also upload to Job Files (Photos)
            </Label>
          </div>
          <Label className="sr-only" htmlFor="take-photo-trigger">
            Open camera
          </Label>
          <Button
            id="take-photo-trigger"
            type="button"
            size="lg"
            disabled={!selectedJob || uploading}
            onClick={() => setCaptureOpen(true)}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            Take photo
          </Button>
          {selectedJob && (
            <p className="text-sm text-muted-foreground">
              Target: <span className="font-mono">{selectedJob.job_id}</span> — {selectedJob.customerLabel}
            </p>
          )}
        </div>

        <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <SiteCamCapture
              onCapture={(blob) => void handleCapturedPhoto(blob)}
              onClose={() => setCaptureOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </AppLayout>
  );
}
