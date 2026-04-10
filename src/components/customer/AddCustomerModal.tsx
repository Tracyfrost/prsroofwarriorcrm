import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Plus, X, AlertCircle, Users, Package } from "lucide-react";
import { BattleTooltip } from "@/components/BattleTooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeadSources } from "@/hooks/useCustomizations";
import { normalizeLeadSourceKey } from "@/lib/intake/normalizeLeadSourceKey";
import { useAllProfiles, type ProfileWithHierarchy } from "@/hooks/useHierarchy";
import type { Database, Json } from "@/integrations/supabase/types";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type LeadAssignmentInsert = Database["public"]["Tables"]["lead_assignments"]["Insert"];

const ASSIGNED_UNASSIGNED = "unassigned";

interface ContactEntry { type: string; value: string }

interface CustomerForm {
  firstName: string;
  lastName: string;
  hasSpouse: boolean;
  spouseFirst: string;
  spouseLast: string;
  phones: ContactEntry[];
  emails: ContactEntry[];
  street: string;
  city: string;
  state: string;
  zip: string;
  insurance_carrier: string;
  notes: string;
  lead_source: string;
  assigned_rep_id: string;
}

const emptyForm: CustomerForm = {
  firstName: "", lastName: "",
  hasSpouse: false, spouseFirst: "", spouseLast: "",
  phones: [{ type: "primary", value: "" }],
  emails: [{ type: "primary", value: "" }],
  street: "", city: "", state: "", zip: "",
  insurance_carrier: "", notes: "", lead_source: "",
  assigned_rep_id: ASSIGNED_UNASSIGNED,
};

function resolveAssignedRepId(raw: string): string | null {
  if (!raw || raw === ASSIGNED_UNASSIGNED) return null;
  return raw;
}

function partitionAssignees(profiles: Array<ProfileWithHierarchy & { deleted_at?: string | null }>) {
  const active = profiles.filter((p) => p.active && !p.deleted_at);
  const sales: ProfileWithHierarchy[] = [];
  const managers: ProfileWithHierarchy[] = [];
  const other: ProfileWithHierarchy[] = [];
  for (const p of active) {
    const roles = p.roles ?? [];
    if (roles.includes("sales_rep")) sales.push(p);
    else if (roles.includes("manager") || roles.includes("owner")) managers.push(p);
    else other.push(p);
  }
  const byName = (a: ProfileWithHierarchy, b: ProfileWithHierarchy) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  sales.sort(byName);
  managers.sort(byName);
  other.sort(byName);
  return { sales, managers, other };
}

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerModal({ open, onOpenChange }: AddCustomerModalProps) {
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: leadSources = [] } = useLeadSources(true);
  const { data: allProfiles = [] } = useAllProfiles();

  const validLeadSources = useMemo(
    () => leadSources.filter((s) => s.name && String(s.name).trim() !== ""),
    [leadSources],
  );

  /** Radix Select must not use "" or unknown values — no matching SelectItem crashes the tree. */
  const leadSourceSelectValue = validLeadSources.some((s) => s.name === form.lead_source)
    ? form.lead_source
    : undefined;

  const { sales, managers, other } = useMemo(() => partitionAssignees(allProfiles), [allProfiles]);

  const normalizedLeadSource = normalizeLeadSourceKey(form.lead_source) ?? form.lead_source;

  const selectedSource = leadSources.find(s => s.name === normalizedLeadSource);
  const isPooledSource = selectedSource?.requires_pool ?? false;

  const { data: availablePackage } = useQuery({
    queryKey: ["available_package", selectedSource?.id],
    enabled: isPooledSource && !!selectedSource?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_packages")
        .select("id, package_size, leads_remaining, cost_per_lead")
        .eq("lead_source_id", selectedSource!.id)
        .gt("leads_remaining", 0)
        .order("purchase_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pooledSubmitBlocked =
    isPooledSource &&
    (!availablePackage || !resolveAssignedRepId(form.assigned_rep_id));

  const addCustomer = useMutation({
    mutationFn: async (f: CustomerForm) => {
      if (!f.firstName.trim() && !f.lastName.trim()) throw new Error("First or Last name is required");

      const normalizedInputLeadSource = normalizeLeadSourceKey(f.lead_source);

      if (normalizedInputLeadSource) {
        const sourceExists = leadSources.some(s => s.name === normalizedInputLeadSource);
        if (!sourceExists) throw new Error("Selected lead source is invalid");
      }

      const repId = resolveAssignedRepId(f.assigned_rep_id);

      const src = leadSources.find(s => s.name === normalizedInputLeadSource);
      if (src?.requires_pool) {
        if (!availablePackage) throw new Error("Arsenal Depleted – Forge New Package, Commander!");
        if (!repId) throw new Error("A rep must be assigned for pooled leads.");
      }

      const contactInfo = {
        phones: f.phones.filter(p => p.value.trim()).map(p => ({ type: p.type, number: p.value.trim() })),
        emails: f.emails.filter(e => e.value.trim()).map(e => ({ type: e.type, address: e.value.trim() })),
      };

      const nameJson: Json = {
        primary: { first: f.firstName.trim(), last: f.lastName.trim() },
        spouse: f.hasSpouse ? { first: f.spouseFirst.trim(), last: f.spouseLast.trim() } : null,
      };

      const fullName = `${f.firstName.trim()} ${f.lastName.trim()}`.trim();

      const customerPayload: CustomerInsert = {
        name: fullName,
        name_json: nameJson,
        contact_info: contactInfo as Json,
        main_address: {
          street: f.street.trim(),
          city: f.city.trim(),
          state: f.state.trim(),
          zip: f.zip.trim(),
        } as Json,
        insurance_carrier: f.insurance_carrier.trim() || "",
        notes: f.notes.trim() || "",
        created_by: user?.id ?? null,
        customer_number: "auto",
        lead_source: normalizedInputLeadSource || null,
        assigned_rep_id: repId,
      };

      const { data: customer, error } = await supabase.from("customers").insert(customerPayload).select("id").single();

      if (error) {
        console.error("Insert Error:", error);
        throw error;
      }

      if (src?.requires_pool && availablePackage && customer && repId) {
        const assignmentPayload: LeadAssignmentInsert = {
          customer_id: customer.id,
          lead_source_id: src.id,
          package_id: availablePackage.id,
          assigned_rep_id: repId,
        };
        const { error: assignErr } = await supabase.from("lead_assignments").insert(assignmentPayload);
        if (assignErr) console.error("Lead assignment error:", assignErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-count"] });
      qc.invalidateQueries({ queryKey: ["customer-job-counts"] });
      qc.invalidateQueries({ queryKey: ["lead_packages"] });
      qc.invalidateQueries({ queryKey: ["lead_assignments"] });
      setForm(emptyForm);
      setError("");
      onOpenChange(false);
      toast({ title: "⚔ Ally Recruited!", description: "New warrior added to the roster." });
    },
    onError: (e: Error) => {
      console.error("Recruit Error:", e);
      let errorMsg = e.message;
      if (errorMsg.includes("foreign key constraint")) {
        errorMsg = "Invalid lead source selected";
      }
      setError(errorMsg);
      toast({ title: "Recruit Failed", description: errorMsg, variant: "destructive" });
    },
  });

  const addPhone = () => setForm(prev => ({ ...prev, phones: [...prev.phones, { type: "other", value: "" }] }));
  const addEmail = () => setForm(prev => ({ ...prev, emails: [...prev.emails, { type: "other", value: "" }] }));
  const removePhone = (i: number) => setForm(prev => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== i) }));
  const removeEmail = (i: number) => setForm(prev => ({ ...prev, emails: prev.emails.filter((_, idx) => idx !== i) }));
  const setPhone = (i: number, val: string) => setForm(prev => ({ ...prev, phones: prev.phones.map((p, idx) => idx === i ? { ...p, value: val } : p) }));
  const setEmail = (i: number, val: string) => setForm(prev => ({ ...prev, emails: prev.emails.map((e, idx) => idx === i ? { ...e, value: val } : e) }));

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setError("");
        onOpenChange(isOpen);
      }}
      title="New Customer"
    >
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); addCustomer.mutate(form); }} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))} required maxLength={50} placeholder="First" />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))} required maxLength={50} placeholder="Last" />
            </div>
          </div>

          {/* Spouse Toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-muted/20">
            <Switch checked={form.hasSpouse} onCheckedChange={(v) => setForm(prev => ({ ...prev, hasSpouse: v }))} />
            <Label className="text-sm flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Add Spouse / 2nd Name
            </Label>
          </div>
          {form.hasSpouse && (
            <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label className="text-xs">Spouse First</Label>
                <Input value={form.spouseFirst} onChange={(e) => setForm(prev => ({ ...prev, spouseFirst: e.target.value }))} maxLength={50} placeholder="First" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Spouse Last</Label>
                <Input value={form.spouseLast} onChange={(e) => setForm(prev => ({ ...prev, spouseLast: e.target.value }))} maxLength={50} placeholder="Last" />
              </div>
            </div>
          )}

          {/* Multi-phone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Phone Numbers</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addPhone}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            {form.phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p.value} onChange={(e) => setPhone(i, e.target.value)} placeholder="Phone number" maxLength={20} className="flex-1" />
                <Badge variant="outline" className="shrink-0 self-center text-[10px]">{p.type}</Badge>
                {form.phones.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removePhone(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Multi-email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email Addresses</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addEmail}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            {form.emails.map((e, i) => (
              <div key={i} className="flex gap-2">
                <Input type="email" value={e.value} onChange={(ev) => setEmail(i, ev.target.value)} placeholder="Email" maxLength={255} className="flex-1" />
                <Badge variant="outline" className="shrink-0 self-center text-[10px]">{e.type}</Badge>
                {form.emails.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeEmail(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Lead Source */}
          <div className="space-y-2">
            <Label>Forge Lead Origin</Label>
            {validLeadSources.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                No lead origins configured. Add lead sources in Settings to tag new contacts.
              </p>
            ) : (
              <Select
                value={leadSourceSelectValue}
                onValueChange={(val) => setForm((prev) => ({ ...prev, lead_source: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin..." />
                </SelectTrigger>
                <SelectContent>
                  {validLeadSources.map((source) => (
                    <SelectItem key={source.id} value={source.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }} />
                        {source.display_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select
              value={form.assigned_rep_id}
              onValueChange={(val) => setForm(prev => ({ ...prev, assigned_rep_id: val }))}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select assignee..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASSIGNED_UNASSIGNED}>Unassigned pool</SelectItem>
                {sales.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Sales reps</SelectLabel>
                    {sales.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.name || p.user_id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {managers.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Managers</SelectLabel>
                    {managers.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.name || p.user_id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {other.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    {other.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.name || p.user_id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {isPooledSource ? (
              <p className="text-xs text-muted-foreground">
                Pooled sources require assigning to a person{!availablePackage ? " (and an available lead package)." : "."}
              </p>
            ) : null}
          </div>

          {/* Pooled Source: Package Preview */}
          {isPooledSource && (
            <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
                <Package className="h-4 w-4" /> Pooled Lead Source
              </div>
              {availablePackage ? (
                <p className="text-xs text-muted-foreground">
                  Taking from Package – <strong>{availablePackage.leads_remaining}</strong> remaining
                  (${Number(availablePackage.cost_per_lead).toFixed(2)}/lead)
                </p>
              ) : (
                <p className="text-xs text-destructive font-medium">
                  Arsenal Depleted – Forge New Package first!
                </p>
              )}
            </div>
          )}

          {/* Address */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Street</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
                placeholder="Street address"
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm(prev => ({ ...prev, zip: e.target.value }))} maxLength={10} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Insurance Carrier</Label>
              <Input value={form.insurance_carrier} onChange={(e) => setForm(prev => ({ ...prev, insurance_carrier: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add context for this lead..."
              rows={4}
              className="min-h-[100px] resize-y"
            />
          </div>

          <BattleTooltip phraseKey="submit">
            <Button type="submit" className="w-full min-h-[48px] sm:min-h-0" disabled={addCustomer.isPending || pooledSubmitBlocked}>
              {addCustomer.isPending ? "Recruiting..." : "⚔ Recruit Ally"}
            </Button>
          </BattleTooltip>
        </form>
    </ResponsiveModal>
  );
}
