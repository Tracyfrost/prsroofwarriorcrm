import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useCustomer, useCustomerJobs, useCustomerAppointments, useCustomerDocuments } from "@/hooks/useCustomer";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useLeadSources, useJobStatuses } from "@/hooks/useCustomizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, Calendar, FileText, StickyNote, Save, Plus, Edit2, X, BarChart3, Building2, User } from "lucide-react";
import { AddressLink } from "@/components/AddressLink";
import { BattleTooltip } from "@/components/BattleTooltip";
import { CustomerAnalyticsTab } from "@/components/customer/CustomerAnalyticsTab";
import { MultiPhoneInput, MultiEmailInput } from "@/components/customer/MultiContactInput";
import type { PhoneEntry, EmailEntry } from "@/components/customer/MultiContactInput";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { getDocumentUrl } from "@/hooks/useDocuments";
import { openFileViaProxy } from "@/lib/fileProxy";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabListSidebarClassName,
  contextualTabTriggerClassName,
  contextualTabTriggerSidebarClassName,
} from "@/components/layout/contextualTabNav";
import { useUpdateAppointment } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentOutcomeFields } from "@/components/appointments/AppointmentOutcomeFields";
import { AppointmentOutcomeSummary } from "@/components/appointments/AppointmentOutcomeSummary";
import {
  buildAppointmentOutcomePayload,
  parseStoredAppointment,
  type OutcomeRating,
} from "@/components/appointments/appointmentOutcomeModel";
import { customerJobsState } from "@/lib/jobNavigation";

// Status labels/colors from flow_stages (job_status flow)

// Lead source labels now come from dynamic data via useLeadSources hook

interface AddressFields {
  street: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

const emptyAddress: AddressFields = { street: "", line2: "", city: "", state: "", zip: "" };

const CUSTOMER_TAB_VALUES = ["details", "jobs", "appointments", "documents", "analytics"] as const;
type CustomerTab = (typeof CUSTOMER_TAB_VALUES)[number];

function customerTabFromSearchParams(sp: URLSearchParams): CustomerTab {
  const t = sp.get("tab");
  if (t && (CUSTOMER_TAB_VALUES as readonly string[]).includes(t)) return t as CustomerTab;
  return "details";
}

function AddressForm({ value, onChange, label }: { value: AddressFields; onChange: (v: AddressFields) => void; label: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label>{label} Street</Label>
        <Input value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>Address Line 2</Label>
        <Input value={value.line2} onChange={(e) => onChange({ ...value, line2: e.target.value })} placeholder="Apt, Suite, etc." />
      </div>
      <div className="space-y-1">
        <Label>City</Label>
        <Input value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>State</Label>
          <Input value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value })} maxLength={2} />
        </div>
        <div className="space-y-1">
          <Label>ZIP</Label>
          <Input value={value.zip} onChange={(e) => onChange({ ...value, zip: e.target.value })} maxLength={10} />
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useCustomer(id);
  const { data: jobs = [] } = useCustomerJobs(id);
  const { data: appointments = [] } = useCustomerAppointments(id);
  const { data: documents = [] } = useCustomerDocuments(id);
  const { data: allProfiles = [] } = useAllProfiles();
  const updateAppointment = useUpdateAppointment();
  const { can } = usePermissions();
  const canEditAppointment = can("edit_appointment");
  const { data: leadSources = [] } = useLeadSources(true);
  const { data: jobStatuses = [] } = useJobStatuses(true);
  const leadSourceLabels: Record<string, string> = Object.fromEntries(leadSources.map(s => [s.name, s.display_name]));
  const statusLabels: Record<string, string> = Object.fromEntries(jobStatuses.map(s => [s.name, s.display_name]));
  const statusColors: Record<string, string> = Object.fromEntries(jobStatuses.map(s => [s.name, s.color]));

  const [activeTab, setActiveTab] = useState<CustomerTab>(() => customerTabFromSearchParams(searchParams));
  const [pendingFinancialsScroll, setPendingFinancialsScroll] = useState(false);
  const financialsTotalsRef = useRef<HTMLTableRowElement>(null);

  const setCustomerTab = (next: CustomerTab) => {
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === "details") p.delete("tab");
        else p.set("tab", next);
        return p;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    setActiveTab(customerTabFromSearchParams(searchParams));
  }, [id, searchParams]);

  useEffect(() => {
    if (activeTab !== "jobs" || !pendingFinancialsScroll) return;
    const timeoutId = window.setTimeout(() => {
      financialsTotalsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setPendingFinancialsScroll(false);
    }, 120);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, pendingFinancialsScroll, jobs.length]);

  usePageTitle(customer ? `${customer.name} – Customer` : "Customer Detail");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseFirst, setSpouseFirst] = useState("");
  const [spouseLast, setSpouseLast] = useState("");
  const [customerType, setCustomerType] = useState<string>("residential");
  const [companyName, setCompanyName] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [mainAddress, setMainAddress] = useState<AddressFields>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<AddressFields>(emptyAddress);
  const [billingSameAsMain, setBillingSameAsMain] = useState(true);
  const [insurance, setInsurance] = useState("");
  const [assignedRepId, setAssignedRepId] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [referredBy, setReferredBy] = useState("");
  const [priorCrmLocation, setPriorCrmLocation] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [apptEditing, setApptEditing] = useState<any | null>(null);
  const [apptDateLocal, setApptDateLocal] = useState("");
  const [apptRating, setApptRating] = useState<OutcomeRating>("");
  const [apptDetailNotes, setApptDetailNotes] = useState("");

  const openApptEdit = (a: any) => {
    setApptEditing(a);
    setApptDateLocal(format(new Date(a.date_time), "yyyy-MM-dd'T'HH:mm"));
    const p = parseStoredAppointment(a);
    setApptRating(p.rating);
    setApptDetailNotes(p.notes);
  };

  const closeApptEdit = () => {
    setApptEditing(null);
  };

  const saveApptEdit = async () => {
    if (!apptEditing) return;
    const { outcome, notes: n } = buildAppointmentOutcomePayload(apptRating, apptDetailNotes);
    try {
      await updateAppointment.mutateAsync({
        id: apptEditing.id,
        date_time: new Date(apptDateLocal).toISOString(),
        outcome,
        notes: n,
      });
      toast({ title: "Appointment updated" });
      closeApptEdit();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = () => {
    if (!customer) return;
    const ci = customer.contact_info as any;
    const addr = customer.main_address as any;
    const billing = (customer as any).billing_address as any;

    setName(customer.name);
    const nj = (customer as any).name_json as any;
    if (nj && nj.primary) {
      setFirstName(nj.primary.first || "");
      setLastName(nj.primary.last || "");
    } else {
      // Fallback: split name
      const parts = (customer.name || "").split(" ");
      setLastName(parts.pop() || "");
      setFirstName(parts.join(" "));
    }
    if (nj?.spouse) {
      setHasSpouse(true);
      setSpouseFirst(nj.spouse.first || "");
      setSpouseLast(nj.spouse.last || "");
    } else {
      setHasSpouse(false);
      setSpouseFirst("");
      setSpouseLast("");
    }
    setCustomerType((customer as any).customer_type || "residential");
    setCompanyName((customer as any).company_name || "");
    setPhones(
      (ci?.phones ?? []).length > 0
        ? (ci.phones as any[]).map((p: any) => ({ type: p.type || "mobile", number: p.number || "", extension: p.extension || "" }))
        : [{ type: "mobile", number: "", extension: "" }]
    );
    setEmails(
      (ci?.emails ?? []).length > 0
        ? (ci.emails as any[]).map((e: any) => ({ type: e.type || "primary", address: e.address || "" }))
        : [{ type: "primary", address: "" }]
    );
    setMainAddress({
      street: addr?.street || "",
      line2: addr?.line2 || "",
      city: addr?.city || "",
      state: addr?.state || "",
      zip: addr?.zip || "",
    });
    if (billing && (billing.street || billing.city)) {
      setBillingSameAsMain(false);
      setBillingAddress({
        street: billing?.street || "",
        line2: billing?.line2 || "",
        city: billing?.city || "",
        state: billing?.state || "",
        zip: billing?.zip || "",
      });
    } else {
      setBillingSameAsMain(true);
      setBillingAddress(emptyAddress);
    }
    setInsurance(customer.insurance_carrier || "");
    setAssignedRepId((customer as any).assigned_rep_id || "");
    setLeadSource((customer as any).lead_source || "");
    setReferredBy((customer as any).referred_by || "");
    setPriorCrmLocation((customer as any).prior_crm_location || "");
    setCustomFields((customer as any).custom_fields || {});
    setNotes(customer.notes || "");
    setEditing(true);
  };

  const updateCustomer = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() && !lastName.trim()) throw new Error("First or Last name is required");
      if (customerType === "commercial" && !companyName.trim()) throw new Error("Company name is required for commercial customers");

      const nameJson = {
        primary: { first: firstName.trim(), last: lastName.trim() },
        spouse: hasSpouse ? { first: spouseFirst.trim(), last: spouseLast.trim() } : null,
      };
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const { error } = await supabase.from("customers").update({
        name: fullName,
        name_json: nameJson,
        customer_type: customerType as any,
        company_name: companyName.trim(),
        contact_info: {
          phones: phones.filter(p => p.number.trim()).map(p => ({ type: p.type, number: p.number.trim(), extension: p.extension?.trim() || "" })),
          emails: emails.filter(e => e.address.trim()).map(e => ({ type: e.type, address: e.address.trim() })),
        },
        main_address: { street: mainAddress.street.trim(), line2: mainAddress.line2.trim(), city: mainAddress.city.trim(), state: mainAddress.state.trim(), zip: mainAddress.zip.trim() },
        billing_address: billingSameAsMain ? null : { street: billingAddress.street.trim(), line2: billingAddress.line2.trim(), city: billingAddress.city.trim(), state: billingAddress.state.trim(), zip: billingAddress.zip.trim() },
        insurance_carrier: insurance.trim(),
        assigned_rep_id: assignedRepId || null,
        lead_source: (leadSource || null) as any,
        referred_by: referredBy.trim(),
        prior_crm_location: priorCrmLocation.trim(),
        custom_fields: customFields,
        notes: notes.trim(),
      } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setEditing(false);
      toast({ title: "Customer updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // Compute job financial totals
  const jobTotals = jobs.map((j) => {
    const fin = j.financials as any;
    const checks = j.payment_checks ?? [];
    const checksReceived = checks.filter((c) => c.status !== "Disputed").reduce((s, c) => s + Number(c.amount || 0), 0);
    const acv = Number(fin?.acv || 0);
    const rcv = Number(fin?.rcv || 0);
    return { ...j, acv, rcv, depreciation: rcv - acv, checksReceived };
  });

  const totalAcv = jobTotals.reduce((s, j) => s + j.acv, 0);
  const totalRcv = jobTotals.reduce((s, j) => s + j.rcv, 0);
  const totalChecks = jobTotals.reduce((s, j) => s + j.checksReceived, 0);

  // Rep lookup
  const repName = (userId: string | null) => {
    if (!userId) return null;
    const p = allProfiles.find((pr) => pr.user_id === userId);
    return p?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Customer not found</p>
          <Button variant="ghost" onClick={() => navigate("/customers")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Button>
        </div>
      </AppLayout>
    );
  }

  const ci = customer.contact_info as any;
  const custPhones = (ci?.phones ?? []) as any[];
  const custEmails = (ci?.emails ?? []) as any[];
  const addr = customer.main_address as any;
  const billing = (customer as any).billing_address as any;
  const custType = (customer as any).customer_type || "residential";
  const custLeadSource = (customer as any).lead_source;
  const custAssignedRep = (customer as any).assigned_rep_id;

  const kpiButtonClass =
    "w-full rounded-lg p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer";

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Breadcrumb + Header */}
        <div className="mb-6">
          <BattleTooltip phraseKey="back_to_jobs" fallback="Return to customers list">
            <Button variant="ghost" size="sm" onClick={() => navigate("/customers")} className="mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
            </Button>
          </BattleTooltip>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{customer.name}</h1>
                <Badge variant={custType === "commercial" ? "default" : "secondary"} className="text-[10px]">
                  {custType === "commercial" ? <Building2 className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                  {custType === "commercial" ? "Commercial" : "Residential"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {customer.customer_number && (
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{customer.customer_number}</span>
                )}
                {(customer as any).company_name && (
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{(customer as any).company_name}</span>
                )}
                {addr?.city && (
                  <AddressLink address={addr} compact className="text-xs" />
                )}
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
                {custAssignedRep ? (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{repName(custAssignedRep)}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Unassigned</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!editing && (
                <BattleTooltip phraseKey="edit_customer">
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Edit2 className="mr-2 h-3 w-3" /> Edit
                  </Button>
                </BattleTooltip>
              )}
              <CreateJobModal
                defaultCustomerId={customer.id}
                trigger={
                  <Button size="sm"><Plus className="mr-2 h-3 w-3" /> Add Job</Button>
                }
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <button
                type="button"
                className={kpiButtonClass}
                aria-label="View jobs for this customer"
                onClick={() => setCustomerTab("jobs")}
              >
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
              </button>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <button
                type="button"
                className={kpiButtonClass}
                aria-label="View job financial totals — RCV"
                onClick={() => {
                  setCustomerTab("jobs");
                  setPendingFinancialsScroll(true);
                }}
              >
                <p className="text-xs text-muted-foreground">Total RCV</p>
                <p className="text-2xl font-bold text-foreground">${totalRcv.toLocaleString()}</p>
              </button>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <button
                type="button"
                className={kpiButtonClass}
                aria-label="View job financial totals — ACV"
                onClick={() => {
                  setCustomerTab("jobs");
                  setPendingFinancialsScroll(true);
                }}
              >
                <p className="text-xs text-muted-foreground">Total ACV</p>
                <p className="text-2xl font-bold text-foreground">${totalAcv.toLocaleString()}</p>
              </button>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <button
                type="button"
                className={kpiButtonClass}
                aria-label="View job financial totals — checks received"
                onClick={() => {
                  setCustomerTab("jobs");
                  setPendingFinancialsScroll(true);
                }}
              >
                <p className="text-xs text-muted-foreground">Checks Received</p>
                <p className="text-2xl font-bold text-foreground">${totalChecks.toLocaleString()}</p>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setCustomerTab(v as CustomerTab)}>
          <ContextualTabsPortal>
            <TabsList className={contextualTabListSidebarClassName()}>
              <TabsTrigger value="details" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5")}>
                <StickyNote className="h-3.5 w-3.5 shrink-0" />
                Details
              </TabsTrigger>
              <TabsTrigger value="jobs" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5")}>
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                Jobs ({jobs.length})
              </TabsTrigger>
              <TabsTrigger value="appointments" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5")}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="documents" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5")}>
                <FileText className="h-3.5 w-3.5 shrink-0" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="analytics" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5")}>
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </ContextualTabsPortal>
          <TabsList className={contextualTabListClassName("md:hidden")}>
            <TabsTrigger value="details" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5")}>
              <StickyNote className="h-3.5 w-3.5 shrink-0" />
              Details
            </TabsTrigger>
            <TabsTrigger value="jobs" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5")}>
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              Jobs ({jobs.length})
            </TabsTrigger>
            <TabsTrigger value="appointments" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5")}>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="documents" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5")}>
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="analytics" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5")}>
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="min-w-0 flex-1 mt-4 md:mt-6">
          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-0">
            {editing ? (
              <form onSubmit={(e) => { e.preventDefault(); updateCustomer.mutate(); }}>
                <Accordion type="multiple" defaultValue={["basic", "address", "other"]} className="space-y-3">
                  {/* BASIC INFO */}
                  <AccordionItem value="basic" className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-semibold">Basic Information</AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <div className="space-y-2">
                        <Label>Customer Type</Label>
                        <RadioGroup value={customerType} onValueChange={setCustomerType} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="residential" id="res" />
                            <Label htmlFor="res" className="font-normal">Residential</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="commercial" id="com" />
                            <Label htmlFor="com" className="font-normal">Commercial</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {customerType === "commercial" && (
                        <div className="space-y-1">
                          <Label>Company Name *</Label>
                          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required={customerType === "commercial"} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>First Name *</Label>
                          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="First" />
                        </div>
                        <div className="space-y-1">
                          <Label>Last Name *</Label>
                          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Last" />
                        </div>
                      </div>
                      {/* Spouse Toggle */}
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-muted/20">
                        <Switch checked={hasSpouse} onCheckedChange={setHasSpouse} />
                        <Label className="text-sm">Spouse / 2nd Name</Label>
                      </div>
                      {hasSpouse && (
                        <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                          <div className="space-y-1">
                            <Label className="text-xs">Spouse First</Label>
                            <Input value={spouseFirst} onChange={(e) => setSpouseFirst(e.target.value)} placeholder="First" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Spouse Last</Label>
                            <Input value={spouseLast} onChange={(e) => setSpouseLast(e.target.value)} placeholder="Last" />
                          </div>
                        </div>
                      )}
                      <MultiPhoneInput phones={phones} onChange={setPhones} />
                      <MultiEmailInput emails={emails} onChange={setEmails} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* ADDRESS */}
                  <AccordionItem value="address" className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-semibold">Address</AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <AddressForm value={mainAddress} onChange={setMainAddress} label="Customer" />
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="billingSame"
                          checked={billingSameAsMain}
                          onCheckedChange={(v) => setBillingSameAsMain(!!v)}
                        />
                        <Label htmlFor="billingSame" className="font-normal text-sm">Billing address same as customer address</Label>
                      </div>
                      {!billingSameAsMain && (
                        <AddressForm value={billingAddress} onChange={setBillingAddress} label="Billing" />
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* OTHER INFO */}
                  <AccordionItem value="other" className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-semibold">Other Information</AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Insurance Carrier</Label>
                          <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Assigned Rep</Label>
                          <Select value={assignedRepId} onValueChange={setAssignedRepId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {allProfiles.filter(p => p.active).map((p) => (
                                <SelectItem key={p.user_id} value={p.user_id}>{p.name} ({p.level})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Source of Lead</Label>
                          <Select value={leadSource} onValueChange={setLeadSource}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {leadSources.map((ls) => (
                                <SelectItem key={ls.name} value={ls.name}>{ls.display_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Referred By</Label>
                          <Input value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder="Name or source" />
                        </div>
                        <div className="space-y-1">
                          <Label>Prior CRM Data Location</Label>
                          <Input value={priorCrmLocation} onChange={(e) => setPriorCrmLocation(e.target.value)} placeholder="Old System ID" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Customer Notes</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex gap-2 mt-4">
                  <Button type="submit" disabled={updateCustomer.isPending}>
                    <Save className="mr-2 h-3 w-3" />{updateCustomer.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              /* READ-ONLY VIEW */
              <Accordion type="multiple" defaultValue={["basic", "address", "other"]} className="space-y-3">
                {/* BASIC INFO */}
                <AccordionItem value="basic" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">Basic Information</AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Customer Type</p>
                        <p className="text-sm capitalize">{custType}</p>
                      </div>
                      {(customer as any).company_name && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                          <p className="text-sm">{(customer as any).company_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Name</p>
                        <p className="text-sm font-medium">{customer.name}</p>
                        {(() => {
                          const nj = (customer as any).name_json as any;
                          const spouse = nj?.spouse;
                          return spouse?.first || spouse?.last ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Spouse: {`${spouse.first || ""} ${spouse.last || ""}`.trim()}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Phone Numbers</p>
                      {custPhones.length > 0 ? custPhones.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{p.number}</span>
                          {p.extension && <span className="text-muted-foreground">ext. {p.extension}</span>}
                          <Badge variant="outline" className="text-[9px]">{p.type}</Badge>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No phone numbers</p>}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Email Addresses</p>
                      {custEmails.length > 0 ? custEmails.map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{e.address}</span>
                          <Badge variant="outline" className="text-[9px]">{e.type}</Badge>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No email addresses</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ADDRESS */}
                <AccordionItem value="address" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">Address</AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Customer Address</p>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                          <div>
                            {addr?.street ? (
                              <>
                                <p>{addr.street}</p>
                                {addr.line2 && <p>{addr.line2}</p>}
                                <p>{addr.city}, {addr.state} {addr.zip}</p>
                              </>
                            ) : <p className="text-muted-foreground">No address</p>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Billing Address</p>
                        {billing && (billing.street || billing.city) ? (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                            <div>
                              <p>{billing.street}</p>
                              {billing.line2 && <p>{billing.line2}</p>}
                              <p>{billing.city}, {billing.state} {billing.zip}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Same as customer address</p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* OTHER INFO */}
                <AccordionItem value="other" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">Other Information</AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Insurance Carrier</p>
                        <p className="text-sm">{customer.insurance_carrier || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assigned Rep</p>
                        {custAssignedRep ? (
                          <p className="text-sm">{repName(custAssignedRep)}</p>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Unassigned</Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Source of Lead</p>
                        <p className="text-sm">{custLeadSource ? leadSourceLabels[custLeadSource] || custLeadSource : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Referred By</p>
                        <p className="text-sm">{(customer as any).referred_by || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prior CRM Location</p>
                        <p className="text-sm">{(customer as any).prior_crm_location || "—"}</p>
                      </div>
                    </div>
                    {customer.notes && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </TabsContent>

          {/* JOBS TAB - Hierarchical View */}
          <TabsContent value="jobs" className="mt-0">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <div className="max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <Table className="min-w-[720px]" containerClassName="relative w-full min-w-0 overflow-visible">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">ACV</TableHead>
                      <TableHead className="text-right">RCV</TableHead>
                      <TableHead className="text-right">Checks Recv'd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobTotals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No jobs linked to this customer</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {(() => {
                          const mains = jobTotals.filter((j: any) => !j.parent_job_id);
                          const subsByParent: Record<string, typeof jobTotals> = {};
                          jobTotals.filter((j: any) => j.parent_job_id).forEach((j: any) => {
                            if (!subsByParent[j.parent_job_id]) subsByParent[j.parent_job_id] = [];
                            subsByParent[j.parent_job_id].push(j);
                          });

                          return mains.map((j) => {
                            const subs = subsByParent[j.id] || [];
                            return (
                              <>{/* Main job row */}
                                <TableRow
                                  key={j.id}
                                  className={cn(
                                    "cursor-pointer hover:bg-muted/50",
                                    (j as any).archived_at && "opacity-70 bg-muted/25",
                                  )}
                                  onClick={() => navigate(`/operations/${j.id}`, { state: customerJobsState(customer.id) })}
                                >
                                  <TableCell className="font-medium font-mono">
                                    {j.job_id}
                                    {subs.length > 0 && <Badge variant="outline" className="ml-2 text-[9px]">{subs.length} sub{subs.length !== 1 ? "s" : ""}</Badge>}
                                    {(j as any).archived_at && (
                                      <Badge variant="outline" className="ml-2 text-[9px] border-muted-foreground/50 text-muted-foreground">
                                        Archived
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground font-mono">{(j as any).claim_number || "—"}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 flex-wrap">
                                      {j.trade_types?.map((t: string) => (
                                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className="text-[10px] text-white" style={{ backgroundColor: statusColors[j.status] || 'hsl(var(--muted))' }}>
                                      {statusLabels[j.status] || j.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">${j.acv.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-sm">${j.rcv.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-sm">${j.checksReceived.toLocaleString()}</TableCell>
                                </TableRow>
                                {subs.map((sub) => (
                                  <TableRow
                                    key={sub.id}
                                    className={cn(
                                      "cursor-pointer hover:bg-muted/50 bg-muted/20",
                                      (sub as any).archived_at && "opacity-70",
                                    )}
                                    onClick={() => navigate(`/operations/${sub.id}`, { state: customerJobsState(customer.id) })}
                                  >
                                    <TableCell className="font-mono text-sm pl-8 text-muted-foreground">
                                      ↳ {sub.job_id}
                                      {(sub as any).archived_at && (
                                        <Badge variant="outline" className="ml-2 text-[9px] border-muted-foreground/50 text-muted-foreground">
                                          Archived
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">sub #{(sub as any).sub_number}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1 flex-wrap">
                                        {sub.trade_types?.map((t: string) => (
                                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="text-[10px] text-white" style={{ backgroundColor: statusColors[sub.status] || 'hsl(var(--muted))' }}>
                                        {statusLabels[sub.status] || sub.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">${sub.acv.toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">${sub.rcv.toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">${sub.checksReceived.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </>
                            );
                          });
                        })()}
                        <TableRow ref={financialsTotalsRef} className="bg-muted/30 font-medium">
                          <TableCell colSpan={4} className="text-right text-sm">Totals</TableCell>
                          <TableCell className="text-right text-sm">${totalAcv.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">${totalRcv.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">${totalChecks.toLocaleString()}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments" className="mt-0">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No appointments</TableCell>
                      </TableRow>
                    ) : (
                      appointments.map((a: any) => (
                        <TableRow key={a.id} className="hover:bg-muted/50">
                          <TableCell className="text-sm">{format(new Date(a.date_time), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell className="text-sm font-medium">{a.jobs?.job_id || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <AppointmentOutcomeSummary outcome={a.outcome} notes={a.notes} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEditAppointment ? (
                                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => openApptEdit(a)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => navigate(`/operations/${a.job_id}`)}
                              >
                                View job
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Dialog open={!!apptEditing} onOpenChange={(open) => { if (!open) closeApptEdit(); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit appointment</DialogTitle>
                </DialogHeader>
                {apptEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cust-appt-dt">Date & time</Label>
                      <Input
                        id="cust-appt-dt"
                        type="datetime-local"
                        value={apptDateLocal}
                        onChange={(e) => setApptDateLocal(e.target.value)}
                        disabled={!canEditAppointment}
                      />
                    </div>
                    <AppointmentOutcomeFields
                      idPrefix="cust-appt"
                      outcomeRating={apptRating}
                      notes={apptDetailNotes}
                      onOutcomeRatingChange={setApptRating}
                      onNotesChange={setApptDetailNotes}
                      legacyOutcomeLine={parseStoredAppointment(apptEditing).legacyOutcomeLine}
                      disabled={!canEditAppointment}
                    />
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={closeApptEdit}>
                        Cancel
                      </Button>
                      {canEditAppointment ? (
                        <Button type="button" onClick={saveApptEdit} disabled={updateAppointment.isPending}>
                          {updateAppointment.isPending ? "Saving…" : "Save"}
                        </Button>
                      ) : null}
                    </DialogFooter>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="mt-0">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No documents</TableCell>
                      </TableRow>
                    ) : (
                      documents.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <button
                              className="text-sm font-medium text-primary hover:underline"
                              onClick={async () => {
                                try {
                                  await openFileViaProxy("job-documents", d.file_path);
                                } catch {
                                  toast({ title: "Error opening document", variant: "destructive" });
                                }
                              }}
                            >
                              {d.file_name || d.file_path}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">{d.jobs?.job_id || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{d.type}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-0">
            <CustomerAnalyticsTab
              jobs={jobs}
              appointments={appointments}
              customerCreatedAt={customer.created_at}
            />
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
