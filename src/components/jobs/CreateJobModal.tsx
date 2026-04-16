import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useCreateJob, useMainJobs } from "@/hooks/useJobs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useJobStatuses } from "@/hooks/useCustomizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BattleTooltip } from "@/components/BattleTooltip";

const TRADE_OPTIONS = ["Roof", "Gutters", "Siding", "Windows", "Paint", "Interior"];

const claimSchema = z.string()
  .min(5, "Claim# must be at least 5 characters")
  .max(20, "Claim# must be at most 20 characters")
  .regex(/^[A-Za-z0-9_.\-]+$/, "Claim# can only contain letters, numbers, dashes, underscores, and periods");

const jobSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  trade_types: z.array(z.string()).min(1, "Select at least one trade type"),
  job_type: z.enum(["insurance", "cash"]).default("insurance"),
  estimate_amount: z.coerce.number().min(0).default(0),
  status: z.string().default("lead"),
  notes: z.string().max(2000).optional(),
  claim_number: z.string().optional(),
  is_sub_job: z.boolean().default(false),
  parent_job_id: z.string().optional(),
  jobsite_same_as_customer: z.boolean().default(true),
  site_street: z.string().optional(),
  site_city: z.string().optional(),
  site_state: z.string().optional(),
  site_zip: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.is_sub_job && data.job_type === "insurance" && data.claim_number && data.claim_number.trim() !== "") {
    const result = claimSchema.safeParse(data.claim_number.trim());
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ["claim_number"] });
      });
    }
  }
});

type JobFormValues = z.infer<typeof jobSchema>;

interface CreateJobModalProps {
  defaultCustomerId?: string;
  defaultParentJobId?: string;
  trigger?: React.ReactNode;
  /** When both are set, dialog is controlled by the parent (no `DialogTrigger` is rendered). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateJobModal({
  defaultCustomerId,
  defaultParentJobId,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: CreateJobModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined && onOpenChangeProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChangeProp(next);
    else setUncontrolledOpen(next);
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createJob = useCreateJob();
  const subJobModeAvailable = !!defaultParentJobId;

  const { data: jobStatuses = [] } = useJobStatuses(true);
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name, main_address").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: mainJobs = [] } = useMainJobs();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customer_id: defaultCustomerId ?? "",
      trade_types: [],
      job_type: "insurance",
      estimate_amount: 0,
      status: "lead",
      notes: "",
      claim_number: "",
      is_sub_job: subJobModeAvailable,
      parent_job_id: defaultParentJobId ?? "",
      jobsite_same_as_customer: true,
      site_street: "",
      site_city: "",
      site_state: "",
      site_zip: "",
    },
  });

  const watchTrades = form.watch("trade_types");
  const isSubJob = subJobModeAvailable;
  const selectedCustomerId = form.watch("customer_id");
  const jobsiteSameAsCustomer = form.watch("jobsite_same_as_customer");
  const jobType = form.watch("job_type");
  const claimNumber = form.watch("claim_number");
  const parentJobId = form.watch("parent_job_id");
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId) as any;

  // Filter main jobs by selected customer
  const customerMainJobs = mainJobs.filter((j) => j.customer_id === selectedCustomerId);

  // Preview generated job ID
  const selectedParent = mainJobs.find((j) => j.id === parentJobId);
  const previewJobId = isSubJob && selectedParent
    ? `PRS-${(selectedParent as any).claim_number}-?`
    : jobType === "cash"
      ? "PRS-CSH-[auto]"
      : claimNumber
      ? `PRS-${claimNumber}`
      : "PRS-[auto]";

  useEffect(() => {
    if (!jobsiteSameAsCustomer) return;
    const addr = (selectedCustomer?.main_address ?? {}) as any;
    form.setValue("site_street", addr?.street ?? "");
    form.setValue("site_city", addr?.city ?? "");
    form.setValue("site_state", addr?.state ?? "");
    form.setValue("site_zip", addr?.zip ?? "");
  }, [form, jobsiteSameAsCustomer, selectedCustomer]);

  const toggleTrade = (trade: string) => {
    const lower = trade.toLowerCase();
    const current = form.getValues("trade_types");
    const next = current.includes(lower)
      ? current.filter((t) => t !== lower)
      : [...current, lower];
    form.setValue("trade_types", next, { shouldValidate: true });
  };

  const onSubmit = async (values: JobFormValues) => {
    try {
      const creatingSubJob = subJobModeAvailable && !!values.parent_job_id;
      const jobPayload: any = {
        customer_id: values.customer_id,
        trade_types: values.trade_types,
        job_type: values.job_type,
        estimate_amount: values.job_type === "cash" ? values.estimate_amount : 0,
        status: values.status as any,
        notes: values.notes || "",
        sales_rep_id: user?.id,
        assigned_user_id: user?.id,
        site_address: values.jobsite_same_as_customer
          ? ((selectedCustomer?.main_address ?? {}) as any)
          : {
              street: values.site_street?.trim() ?? "",
              city: values.site_city?.trim() ?? "",
              state: values.site_state?.trim() ?? "",
              zip: values.site_zip?.trim() ?? "",
            },
      };

      if (creatingSubJob) {
        jobPayload.parent_job_id = values.parent_job_id;
        // customer_id will be inherited by trigger
      } else if (values.job_type === "insurance" && values.claim_number?.trim()) {
        jobPayload.claim_number = values.claim_number.trim();
        jobPayload.parent_job_id = null;
      } else {
        jobPayload.parent_job_id = null;
      }

      const result = await createJob.mutateAsync(jobPayload);
      toast({ title: creatingSubJob ? "Sub Job created" : "Job created successfully" });
      setOpen(false);
      form.reset();
      navigate(`/operations/${result.id}`);
    } catch (e: any) {
      toast({
        title: "Failed to create job",
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDialogOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      form.reset({
        customer_id: defaultCustomerId ?? "",
        trade_types: [],
        job_type: "insurance",
        estimate_amount: 0,
        status: "lead",
        notes: "",
        claim_number: "",
        is_sub_job: subJobModeAvailable,
        parent_job_id: defaultParentJobId ?? "",
        jobsite_same_as_customer: true,
        site_street: "",
        site_city: "",
        site_state: "",
        site_zip: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {!isControlled ? (
        <DialogTrigger asChild>
          {trigger ?? <Button><Plus className="mr-2 h-4 w-4" /> Add Job</Button>}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isSubJob ? "Create Sub Job" : "Create Job"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Sub Job Context */}
            {subJobModeAvailable && (
              <BattleTooltip
                phraseKey="add_sub_job_btn"
                fallback="This sub job will be linked to the selected parent job."
              >
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Creating sub job (supplement/trade/phase) under this main job.
                </div>
              </BattleTooltip>
            )}

            {/* Job ID Preview */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Job ID Preview</p>
              <p className="font-mono text-sm font-medium text-foreground">{previewJobId}</p>
            </div>

            {!isSubJob ? (
              <>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="claim_number"
                  render={({ field }) => (
                    <BattleTooltip phraseKey="claim_number_field">
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <FormControl>
                          <Select value={jobType} onValueChange={(v) => form.setValue("job_type", v as "insurance" | "cash")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="insurance">Insurance job</SelectItem>
                              <SelectItem value="cash">Cash job (retail / scheme)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </BattleTooltip>
                  )}
                />

                <FormField
                  control={form.control}
                  name="claim_number"
                  render={({ field }) => (
                    <BattleTooltip phraseKey="claim_number_field">
                      <FormItem>
                        <FormLabel>{jobType === "cash" ? "Cash Ref" : "Claim # (optional)"}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={jobType === "cash" ? "Auto-generated (CSH-####)" : "e.g. 12T45 (5-20 chars, A-Z 0-9 - _ .)"}
                            maxLength={20}
                            disabled={jobType === "cash"}
                            value={jobType === "cash" ? "CSH-[auto]" : field.value}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {jobType === "cash"
                            ? "Cash jobs get an auto-generated CSH reference."
                            : "Insurance claim number. 5-20 alphanumeric chars. Leave blank to auto-generate."}
                        </p>
                        <FormMessage />
                      </FormItem>
                    </BattleTooltip>
                  )}
                />

                {jobType === "cash" && (
                  <FormField
                    control={form.control}
                    name="estimate_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimate Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">For cash jobs this mirrors ACV automatically.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("parent_job_id", ""); }}>
                          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_job_id"
                  render={({ field }) => (
                    <BattleTooltip
                      phraseKey="parent_job_select"
                      fallback="Pick which main job this sub job should roll up under."
                    >
                      <FormItem>
                        <FormLabel>Parent Main Job *</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger><SelectValue placeholder="Select main job" /></SelectTrigger>
                            <SelectContent>
                              {customerMainJobs.length === 0 ? (
                                <SelectItem value="__none" disabled>No main jobs for this customer</SelectItem>
                              ) : (
                                customerMainJobs.map((j) => (
                                  <SelectItem key={j.id} value={j.id}>
                                    {j.job_id} — {(j as any).claim_number || "no claim#"}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </BattleTooltip>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="trade_types"
              render={() => (
                <BattleTooltip
                  phraseKey="trade_types"
                  fallback="Select all trades that apply to this job."
                >
                  <FormItem>
                    <FormLabel>Trade Types *</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {TRADE_OPTIONS.map((t) => (
                        <Badge
                          key={t}
                          variant={watchTrades.includes(t.toLowerCase()) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTrade(t)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                </BattleTooltip>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <BattleTooltip phraseKey="initial_status">
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {jobStatuses.map((s) => (
                            <SelectItem key={s.name} value={s.name}>{s.display_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </BattleTooltip>
              )}
            />

            <div className="space-y-3 rounded-md border p-3">
              <FormLabel>Jobsite Address</FormLabel>
              <FormField
                control={form.control}
                name="jobsite_same_as_customer"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(!!checked)} />
                    </FormControl>
                    <FormLabel className="font-normal">Same as Customer Address</FormLabel>
                  </FormItem>
                )}
              />
              {jobsiteSameAsCustomer ? (
                <p className="text-xs text-muted-foreground">
                  {selectedCustomer?.main_address?.street
                    ? `${selectedCustomer.main_address.street}, ${selectedCustomer.main_address.city || ""} ${selectedCustomer.main_address.state || ""} ${selectedCustomer.main_address.zip || ""}`.trim()
                    : "Customer address will be used when available."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="site_street"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Street" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="site_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="site_state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="site_zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ZIP" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <BattleTooltip phraseKey="notes_field">
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional notes..." maxLength={2000} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </BattleTooltip>
              )}
            />

            <BattleTooltip phraseKey="create_job">
              <Button type="submit" className="w-full" disabled={createJob.isPending}>
                {createJob.isPending ? "Creating..." : isSubJob ? "Create Sub Job" : "Create Job"}
              </Button>
            </BattleTooltip>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
