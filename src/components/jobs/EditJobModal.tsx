import { useEffect, useState } from "react";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Parses money from input; empty or invalid → 0 so $0 cash jobs save correctly (not confused with NaN). */
function parseMoneyInput(raw: string): number {
  const t = String(raw).trim();
  if (t === "" || t === "-" || t === ".") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function mergeJsonObject(base: unknown): Record<string, unknown> {
  if (typeof base === "object" && base !== null && !Array.isArray(base)) {
    return { ...(base as Record<string, unknown>) };
  }
  return {};
}

type TradeTypeOption = {
  id: string;
  name: string;
};

type EditJobModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  tradeTypes: TradeTypeOption[];
  onSave: (updates: TablesUpdate<"jobs"> & { id: string }) => Promise<void>;
  isSaving?: boolean;
};

export function EditJobModal({ open, onOpenChange, job, tradeTypes, onSave, isSaving = false }: EditJobModalProps) {
  const [claimNumber, setClaimNumber] = useState("");
  const [jobType, setJobType] = useState<"insurance" | "cash">("insurance");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [acv, setAcv] = useState("");
  const [rcv, setRcv] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [jobsiteSameAsCustomer, setJobsiteSameAsCustomer] = useState(false);

  const customerAddress = (job?.customers?.main_address ?? {}) as any;

  useEffect(() => {
    if (!job || !open) return;
    const financials = (job.financials ?? {}) as any;
    const siteAddress = (job.site_address ?? {}) as any;
    setClaimNumber((job.claim_number as string) ?? "");
    setJobType(((job.job_type as "insurance" | "cash") ?? "insurance"));
    setEstimateAmount(String((job.estimate_amount as number) ?? financials.acv ?? 0));
    setNotes((job.notes as string) ?? "");
    setStreet((siteAddress.street as string) ?? "");
    setCity((siteAddress.city as string) ?? "");
    setState((siteAddress.state as string) ?? "");
    setZip((siteAddress.zip as string) ?? "");
    setAcv(String(financials.acv ?? 0));
    setRcv(String(financials.rcv ?? 0));
    setSelectedTrades((job.trade_types as string[]) ?? []);
    const sameAddress =
      String(siteAddress.street ?? "").trim() === String(customerAddress.street ?? "").trim() &&
      String(siteAddress.city ?? "").trim() === String(customerAddress.city ?? "").trim() &&
      String(siteAddress.state ?? "").trim() === String(customerAddress.state ?? "").trim() &&
      String(siteAddress.zip ?? "").trim() === String(customerAddress.zip ?? "").trim();
    setJobsiteSameAsCustomer(sameAddress);
  }, [customerAddress.city, customerAddress.state, customerAddress.street, customerAddress.zip, job, open]);

  const handleJobTypeChange = (next: "insurance" | "cash") => {
    if (next === "cash" && jobType === "insurance") {
      setEstimateAmount(String(parseMoneyInput(acv)));
    }
    if (next === "insurance" && jobType === "cash") {
      setAcv(String(parseMoneyInput(estimateAmount)));
    }
    setJobType(next);
  };

  const toggleTrade = (tradeName: string, checked: boolean) => {
    setSelectedTrades((prev) => (checked ? [...prev, tradeName] : prev.filter((name) => name !== tradeName)));
  };

  const handleSave = async () => {
    if (!job?.id) return;
    const cashEstimate = parseMoneyInput(estimateAmount);
    const insuranceAcv = parseMoneyInput(acv);
    const rcvVal = parseMoneyInput(rcv);

    const financials = {
      ...mergeJsonObject(job.financials),
      acv: jobType === "cash" ? cashEstimate : insuranceAcv,
      rcv: rcvVal,
    } as any;

    const siteCore = {
      street: String(jobsiteSameAsCustomer ? customerAddress.street ?? "" : street).trim(),
      city: String(jobsiteSameAsCustomer ? customerAddress.city ?? "" : city).trim(),
      state: String(jobsiteSameAsCustomer ? customerAddress.state ?? "" : state).trim(),
      zip: String(jobsiteSameAsCustomer ? customerAddress.zip ?? "" : zip).trim(),
    };
    const site_address = { ...mergeJsonObject(job.site_address), ...siteCore } as any;

    const base: TablesUpdate<"jobs"> & { id: string } = {
      id: job.id,
      job_type: jobType,
      estimate_amount: jobType === "cash" ? cashEstimate : 0,
      notes,
      trade_types: selectedTrades,
      financials,
      site_address,
    };

    if (jobType === "cash") {
      const resolved =
        claimNumber.trim() || (job.claim_number != null && job.claim_number !== "" ? String(job.claim_number) : "");
      if (resolved) {
        (base as any).claim_number = resolved;
      }
    } else {
      base.claim_number = claimNumber.trim() || null;
    }

    await onSave(base);
  };

  const handleSameAsCustomerChange = (checked: boolean) => {
    setJobsiteSameAsCustomer(checked);
    if (!checked) return;
    setStreet(String(customerAddress.street ?? ""));
    setCity(String(customerAddress.city ?? ""));
    setState(String(customerAddress.state ?? ""));
    setZip(String(customerAddress.zip ?? ""));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-2 pt-6 text-left">
          <DialogTitle>Edit Job {job?.job_id ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 py-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-job-type">Job type</Label>
                <Select value={jobType} onValueChange={(v) => handleJobTypeChange(v as "insurance" | "cash")}>
                  <SelectTrigger id="edit-job-type" className="w-full">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance">Insurance job</SelectItem>
                    <SelectItem value="cash">Cash job (retail / scheme)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {jobType === "cash"
                    ? "No carrier claim# — retail or scheme work. Estimate can be $0 now; add or change anytime."
                    : "Insurance / carrier claim workflow."}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-job-id">Job ID</Label>
                <Input id="edit-job-id" value={job?.job_id ?? ""} disabled />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-claim-number">{jobType === "cash" ? "Cash ref" : "Claim number"}</Label>
                <Input
                  id="edit-claim-number"
                  value={jobType === "cash" ? (claimNumber || "—") : claimNumber}
                  onChange={(e) => setClaimNumber(e.target.value)}
                  disabled={jobType === "cash"}
                  placeholder={jobType === "insurance" ? "Claim #" : undefined}
                />
                {jobType === "cash" && (
                  <p className="text-xs text-muted-foreground">
                    Reference is fixed to your job ID segment (e.g. CSH-####). Edit job type to insurance if you need a carrier claim#.
                  </p>
                )}
              </div>
              {jobType === "cash" ? (
                <div className="space-y-1">
                  <Label htmlFor="edit-estimate-amount">Estimate amount</Label>
                  <Input
                    id="edit-estimate-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={estimateAmount}
                    onChange={(e) => setEstimateAmount(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">$0 is OK — mirrors ACV for reports; update whenever you have a number.</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea id="edit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {jobType === "insurance" ? (
                <div className="space-y-1">
                  <Label htmlFor="edit-acv">ACV</Label>
                  <Input id="edit-acv" type="number" min={0} step="0.01" inputMode="decimal" value={acv} onChange={(e) => setAcv(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-1 rounded-md border border-dashed bg-muted/30 p-3 sm:col-span-1">
                  <p className="text-xs font-medium text-foreground">ACV for this cash job</p>
                  <p className="text-sm text-muted-foreground">
                    Same as estimate above (${parseMoneyInput(estimateAmount).toLocaleString()}). Edit the estimate field to change it.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="edit-rcv">RCV</Label>
                <Input id="edit-rcv" type="number" min={0} step="0.01" inputMode="decimal" value={rcv} onChange={(e) => setRcv(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label>Jobsite Address</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={jobsiteSameAsCustomer} onCheckedChange={(checked) => handleSameAsCustomerChange(!!checked)} />
                <span>Same as Customer Address</span>
              </label>
              {jobsiteSameAsCustomer ? (
                <p className="text-xs text-muted-foreground">
                  {customerAddress?.street
                    ? `${customerAddress.street}, ${customerAddress.city || ""} ${customerAddress.state || ""} ${customerAddress.zip || ""}`.trim()
                    : "Customer address will be used when available."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="edit-street">Street</Label>
                    <Input id="edit-street" value={street} onChange={(e) => setStreet(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-city">City</Label>
                    <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-state">State</Label>
                    <Input id="edit-state" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-zip">ZIP</Label>
                    <Input id="edit-zip" value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Trades</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded border p-2">
                {tradeTypes.map((tradeType) => (
                  <label key={tradeType.id} className="flex items-center gap-2 py-1 text-sm">
                    <Checkbox
                      checked={selectedTrades.includes(tradeType.name)}
                      onCheckedChange={(checked) => toggleTrade(tradeType.name, !!checked)}
                    />
                    <span>{tradeType.name}</span>
                  </label>
                ))}
                {tradeTypes.length === 0 && <p className="text-xs text-muted-foreground">No trade types configured.</p>}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
