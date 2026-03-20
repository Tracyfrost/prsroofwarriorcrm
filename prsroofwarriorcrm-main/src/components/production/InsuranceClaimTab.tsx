import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import {
  useInsuranceClaim, useUpsertInsuranceClaim, CLAIM_STATUSES,
  type InsuranceClaim, type AdjusterContact, type ClaimStatus,
} from "@/hooks/useInsuranceClaim";
import { useGlobalSettings } from "@/hooks/useCustomizations";
import { useToast } from "@/hooks/use-toast";
import { Shield, Phone, Mail, Plus, X, Save, User, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  jobId: string;
  isMainJob: boolean;
  parentClaimNumber?: string | null;
  carrierFromCustomer?: string | null;
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  Pending: "bg-warning/20 text-warning-foreground border-warning/30",
  Approved: "bg-success/20 text-success-foreground border-success/30",
  Denied: "bg-destructive/20 text-destructive-foreground border-destructive/30",
  Settled: "bg-primary/20 text-primary-foreground border-primary/30",
};

function getCompletionPercent(claim: Partial<InsuranceClaim> | null, carrier: string, claimNumber: string, adjuster: AdjusterContact): number {
  let filled = 0;
  let total = 6;
  if (carrier) filled++;
  if (claimNumber) filled++;
  if (adjuster.name) filled++;
  if (adjuster.phones.length > 0 && adjuster.phones.some(p => p)) filled++;
  if (adjuster.emails.length > 0 && adjuster.emails.some(e => e)) filled++;
  if (claim?.filed_date) filled++;
  return Math.round((filled / total) * 100);
}

export function InsuranceClaimTab({ jobId, isMainJob, parentClaimNumber, carrierFromCustomer }: Props) {
  const { toast } = useToast();
  const { data: claim, isLoading } = useInsuranceClaim(jobId);
  const { data: globalSettings = [] } = useGlobalSettings();
  const upsert = useUpsertInsuranceClaim();

  const autoPropagateEnabled = globalSettings.find(s => s.key === "auto_propagate_claim_to_subs")?.value !== false &&
    globalSettings.find(s => s.key === "auto_propagate_claim_to_subs")?.value !== "false";
  const requireAdjuster = globalSettings.find(s => s.key === "require_adjuster_contact")?.value === true ||
    globalSettings.find(s => s.key === "require_adjuster_contact")?.value === "true";

  const [carrier, setCarrier] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("Pending");
  const [filedDate, setFiledDate] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [closedDate, setClosedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isOutOfScope, setIsOutOfScope] = useState(false);
  const [adjuster, setAdjuster] = useState<AdjusterContact>({ name: "", phones: [], emails: [] });

  useEffect(() => {
    if (claim) {
      setCarrier(claim.carrier || "");
      setClaimNumber(claim.claim_number || "");
      setPolicyNumber(claim.policy_number || "");
      setStatus(claim.status);
      setFiledDate(claim.filed_date ? claim.filed_date.split("T")[0] : "");
      setApprovedDate(claim.approved_date ? claim.approved_date.split("T")[0] : "");
      setClosedDate(claim.closed_date ? claim.closed_date.split("T")[0] : "");
      setNotes(claim.notes || "");
      setIsOutOfScope(claim.is_out_of_scope);
      const adj = claim.adjuster_contact as AdjusterContact;
      setAdjuster({
        name: adj?.name || "",
        phones: adj?.phones || [],
        emails: adj?.emails || [],
      });
    } else if (!claim && !isLoading) {
      if (carrierFromCustomer) setCarrier(carrierFromCustomer);
      if (!isMainJob && parentClaimNumber && autoPropagateEnabled) setClaimNumber(parentClaimNumber);
    }
  }, [claim, isLoading, carrierFromCustomer, parentClaimNumber, isMainJob, autoPropagateEnabled]);

  const completion = getCompletionPercent(claim, carrier, claimNumber, adjuster);

  const handleSave = async () => {
    if (requireAdjuster && !adjuster.name.trim()) {
      toast({ title: "Adjuster Required", description: "Global settings require adjuster contact info.", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        job_id: jobId,
        carrier,
        claim_number: claimNumber || null,
        policy_number: policyNumber || null,
        status,
        filed_date: filedDate ? new Date(filedDate).toISOString() : null,
        approved_date: approvedDate ? new Date(approvedDate).toISOString() : null,
        closed_date: closedDate ? new Date(closedDate).toISOString() : null,
        notes: notes || null,
        is_out_of_scope: isOutOfScope,
        adjuster_contact: adjuster as any,
      });
      toast({ title: "⚔ Claim intel secured!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const addPhone = () => setAdjuster(prev => ({ ...prev, phones: [...prev.phones, ""] }));
  const addEmail = () => setAdjuster(prev => ({ ...prev, emails: [...prev.emails, ""] }));
  const removePhone = (i: number) => setAdjuster(prev => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== i) }));
  const removeEmail = (i: number) => setAdjuster(prev => ({ ...prev, emails: prev.emails.filter((_, idx) => idx !== i) }));
  const updatePhone = (i: number, val: string) => setAdjuster(prev => ({ ...prev, phones: prev.phones.map((p, idx) => idx === i ? val : p) }));
  const updateEmail = (i: number, val: string) => setAdjuster(prev => ({ ...prev, emails: prev.emails.map((e, idx) => idx === i ? val : e) }));

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  // Out of Scope for sub jobs
  if (!isMainJob && isOutOfScope) {
    return (
      <div className="space-y-4">
        <Card className="shadow-card border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Out of Scope — Separate Assault</p>
              <p className="text-xs text-muted-foreground">This sub-job is not linked to the main claim. It will be invoiced separately and excluded from main claim aggregates.</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsOutOfScope(false)}>
              Re-link to Main Claim
            </Button>
          </CardContent>
        </Card>
        <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
          <Save className="mr-2 h-4 w-4" /> Secure Scope
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Completion Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Claim Conquest Progress</span>
            <span className="text-xs font-mono text-muted-foreground">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>
        {completion === 100 && (
          <Badge className="bg-success/20 text-success-foreground border-success/30 border">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
          </Badge>
        )}
      </div>

      {/* Status Badge Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={`${STATUS_COLORS[status]} text-sm px-3 py-1 border`}>
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          {status}
        </Badge>
        {claim && (
          <span className="text-xs text-muted-foreground">
            Last updated: {new Date(claim.updated_at).toLocaleDateString()}
          </span>
        )}
        {!isMainJob && (
          <div className="flex items-center gap-2 ml-auto">
            <Label className="text-xs text-destructive">Out of Scope</Label>
            <Switch checked={isOutOfScope} onCheckedChange={setIsOutOfScope} />
          </div>
        )}
        {!isMainJob && autoPropagateEnabled && parentClaimNumber && !isOutOfScope && (
          <Badge variant="outline" className="text-[10px]">
            Auto-linked to Main Claim
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Carrier & Claim Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Claim Intel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Insurance Carrier</Label>
              <Input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. State Farm, Allstate" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Claim Number</Label>
              <Input
                value={claimNumber}
                onChange={e => setClaimNumber(e.target.value)}
                placeholder="Claim #"
                disabled={!isMainJob && !!parentClaimNumber && !isOutOfScope && autoPropagateEnabled}
              />
              {!isMainJob && parentClaimNumber && !isOutOfScope && autoPropagateEnabled && (
                <p className="text-[10px] text-muted-foreground">Inherited from main job (auto-propagation enabled)</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Policy Number</Label>
              <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Policy #" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ClaimStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLAIM_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Adjuster Contact */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Adjuster Contact {requireAdjuster && <span className="text-destructive text-xs">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Input value={adjuster.name} onChange={e => setAdjuster(prev => ({ ...prev, name: e.target.value }))} placeholder="Adjuster name" />
                </HoverCardTrigger>
                {adjuster.name && (
                  <HoverCardContent className="w-64 border-primary/20">
                    <div className="space-y-1">
                      <p className="text-sm font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> {adjuster.name}</p>
                      {adjuster.phones.filter(Boolean).map((p, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {p}</p>
                      ))}
                      {adjuster.emails.filter(Boolean).map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {e}</p>
                      ))}
                    </div>
                  </HoverCardContent>
                )}
              </HoverCard>
            </div>

            {/* Phones */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Phone Numbers</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addPhone} className="h-6 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {adjuster.phones.map((p, i) => (
                <div key={i} className="flex gap-1">
                  <Input value={p} onChange={e => updatePhone(i, e.target.value)} placeholder="Phone" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removePhone(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Emails */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Emails</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addEmail} className="h-6 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {adjuster.emails.map((e, i) => (
                <div key={i} className="flex gap-1">
                  <Input type="email" value={e} onChange={ev => updateEmail(i, ev.target.value)} placeholder="Email" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeEmail(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Claim Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Date Filed</Label>
              <Input type="date" value={filedDate} onChange={e => setFiledDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date Approved</Label>
              <Input type="date" value={approvedDate} onChange={e => setApprovedDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date Closed</Label>
              <Input type="date" value={closedDate} onChange={e => setClosedDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Claim Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes about this claim..." rows={6} />
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
        <Save className="mr-2 h-4 w-4" /> {upsert.isPending ? "Securing..." : "Secure Claim"}
      </Button>
    </div>
  );
}
