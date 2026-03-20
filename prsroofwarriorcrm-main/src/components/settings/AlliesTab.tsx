import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useAllies, useCreateAlly, useUpdateAlly, useDeleteAlly, type Ally, type AllyPhone, type AllyEmail, type AllyAddress, type AllyContactInfo } from "@/hooks/useAllies";
import { useGlobalSettings } from "@/hooks/useCustomizations";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Swords, Phone, Mail, MapPin, X, Search, Download, Filter } from "lucide-react";

const EMPTY_CONTACT: AllyContactInfo = { phones: [], emails: [], address: { street: "", city: "", state: "", zip: "" } };

function ContactEditor({ value, onChange }: { value: AllyContactInfo; onChange: (v: AllyContactInfo) => void }) {
  const addPhone = () => onChange({ ...value, phones: [...value.phones, { type: "mobile", number: "" }] });
  const addEmail = () => onChange({ ...value, emails: [...value.emails, { type: "main", address: "" }] });
  const removePhone = (i: number) => onChange({ ...value, phones: value.phones.filter((_, idx) => idx !== i) });
  const removeEmail = (i: number) => onChange({ ...value, emails: value.emails.filter((_, idx) => idx !== i) });
  const updatePhone = (i: number, p: Partial<AllyPhone>) => {
    const phones = [...value.phones];
    phones[i] = { ...phones[i], ...p };
    onChange({ ...value, phones });
  };
  const updateEmail = (i: number, e: Partial<AllyEmail>) => {
    const emails = [...value.emails];
    emails[i] = { ...emails[i], ...e };
    onChange({ ...value, emails });
  };
  const addr = value.address ?? { street: "", city: "", state: "", zip: "" };
  const updateAddress = (patch: Partial<AllyAddress>) => onChange({ ...value, address: { ...addr, ...patch } });

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phones</Label>
          <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={addPhone}><Plus className="h-3 w-3 mr-0.5" />Phone</Button>
        </div>
        {value.phones.map((p, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <Select value={p.type} onValueChange={t => updatePhone(i, { type: t as "mobile" | "office" })}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="office">Office</SelectItem>
              </SelectContent>
            </Select>
            <Input value={p.number} onChange={e => updatePhone(i, { number: e.target.value })} placeholder="555-000-0000" className="h-7 text-xs" />
            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removePhone(i)}><X className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Emails</Label>
          <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={addEmail}><Plus className="h-3 w-3 mr-0.5" />Email</Button>
        </div>
        {value.emails.map((em, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <Input value={em.type} onChange={e => updateEmail(i, { type: e.target.value })} placeholder="Type" className="h-7 text-xs w-24" />
            <Input value={em.address} onChange={e => updateEmail(i, { address: e.target.value })} placeholder="email@example.com" className="h-7 text-xs" />
            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeEmail(i)}><X className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Address</Label>
        <Input value={addr.street} onChange={e => updateAddress({ street: e.target.value })} placeholder="Street address" className="h-7 text-xs mb-1" />
        <div className="flex gap-1">
          <Input value={addr.city} onChange={e => updateAddress({ city: e.target.value })} placeholder="City" className="h-7 text-xs" />
          <Input value={addr.state} onChange={e => updateAddress({ state: e.target.value })} placeholder="State" className="h-7 text-xs w-16" />
          <Input value={addr.zip} onChange={e => updateAddress({ zip: e.target.value })} placeholder="ZIP" className="h-7 text-xs w-20" />
        </div>
      </div>
    </div>
  );
}

export function AlliesTab() {
  const { toast } = useToast();
  const { data: allies = [] } = useAllies(false);
  const { data: globalSettings = [] } = useGlobalSettings();
  const createAlly = useCreateAlly();
  const updateAlly = useUpdateAlly();
  const deleteAlly = useDeleteAlly();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "Vendor" | "Sub">("all");
  const [form, setForm] = useState({
    name: "", type: "Vendor" as "Vendor" | "Sub", ein: "", contact_info: { ...EMPTY_CONTACT }, notes: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(form);

  const requireEin = globalSettings.find(s => s.key === "require_ein_on_allies")?.value === true ||
    globalSettings.find(s => s.key === "require_ein_on_allies")?.value === "true";

  const resetForm = () => setForm({ name: "", type: "Vendor", ein: "", contact_info: { phones: [], emails: [], address: { street: "", city: "", state: "", zip: "" } }, notes: "" });

  // Filter + search
  const filtered = useMemo(() => {
    return allies.filter(a => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) ||
        (a.ein || "").toLowerCase().includes(q) ||
        a.contact_info?.emails?.some(e => e.address.toLowerCase().includes(q)) ||
        a.contact_info?.phones?.some(p => p.number.includes(search));
    });
  }, [allies, search, filterType]);

  const handleAdd = async () => {
    if (!form.name) return;
    if (requireEin && !form.ein.trim()) {
      toast({ title: "EIN Required", description: "Global settings require EIN for all allies.", variant: "destructive" });
      return;
    }
    // Unique name check
    if (allies.some(a => a.name.toLowerCase() === form.name.trim().toLowerCase())) {
      toast({ title: "Duplicate Name", description: "An ally with this name already exists.", variant: "destructive" });
      return;
    }
    // Unique EIN check
    if (form.ein.trim() && allies.some(a => a.ein === form.ein.trim())) {
      toast({ title: "Duplicate EIN", description: "An ally with this EIN already exists.", variant: "destructive" });
      return;
    }
    try {
      await createAlly.mutateAsync({
        name: form.name.trim(),
        type: form.type,
        ein: form.ein.trim() || null,
        contact_info: form.contact_info,
        notes: form.notes,
      });
      toast({ title: "⚔ Ally forged!" });
      setShowAdd(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editForm.name) return;
    // Unique EIN check (excluding self)
    if (editForm.ein.trim() && allies.some(a => a.id !== editId && a.ein === editForm.ein.trim())) {
      toast({ title: "Duplicate EIN", description: "An ally with this EIN already exists.", variant: "destructive" });
      return;
    }
    try {
      await updateAlly.mutateAsync({
        id: editId,
        name: editForm.name.trim(),
        type: editForm.type,
        ein: editForm.ein.trim() || null,
        contact_info: editForm.contact_info,
        notes: editForm.notes,
      });
      toast({ title: "Ally updated" });
      setEditId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = (a: Ally) => {
    setEditId(a.id);
    setEditForm({
      name: a.name,
      type: a.type,
      ein: a.ein || "",
      contact_info: a.contact_info ?? { phones: [], emails: [], address: { street: "", city: "", state: "", zip: "" } },
      notes: a.notes || "",
    });
  };

  const exportCSV = () => {
    const headers = ["Name", "Type", "EIN", "Phones", "Emails", "Street", "City", "State", "ZIP", "Notes", "Active"];
    const rows = filtered.map(a => {
      const ci = a.contact_info;
      return [
        a.name, a.type, a.ein || "",
        (ci?.phones || []).map(p => `${p.type}:${p.number}`).join("; "),
        (ci?.emails || []).map(e => `${e.type}:${e.address}`).join("; "),
        ci?.address?.street || "", ci?.address?.city || "", ci?.address?.state || "", ci?.address?.zip || "",
        a.notes || "", a.active ? "Yes" : "No",
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allies-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const contactSummary = (ci: AllyContactInfo) => {
    const parts: string[] = [];
    if (ci?.phones?.length) parts.push(`${ci.phones.length} phone${ci.phones.length > 1 ? "s" : ""}`);
    if (ci?.emails?.length) parts.push(`${ci.emails.length} email${ci.emails.length > 1 ? "s" : ""}`);
    if (ci?.address?.street) parts.push("address");
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Swords className="h-4 w-4" /> Allies (Vendors & Subs)</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="mr-1 h-3 w-3" /> CSV
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Forge Ally</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search + Filter bar */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, EIN, contact..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Vendor">Vendors</SelectItem>
                <SelectItem value="Sub">Subs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>EIN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <HoverCard>
                        <HoverCardTrigger className="cursor-pointer hover:underline">{a.name}</HoverCardTrigger>
                        <HoverCardContent className="w-72">
                          <p className="text-xs font-bold mb-1">⚔ Ally Intel</p>
                          <p className="text-xs text-muted-foreground">EIN: {a.ein || "—"}</p>
                          {a.contact_info?.phones?.map((p, i) => (
                            <p key={i} className="text-xs"><Phone className="inline h-3 w-3 mr-1" />{p.type}: {p.number}</p>
                          ))}
                          {a.contact_info?.emails?.map((e, i) => (
                            <p key={i} className="text-xs"><Mail className="inline h-3 w-3 mr-1" />{e.type}: {e.address}</p>
                          ))}
                          {a.contact_info?.address?.street && (
                            <p className="text-xs"><MapPin className="inline h-3 w-3 mr-1" />{a.contact_info.address.street}, {a.contact_info.address.city}, {a.contact_info.address.state} {a.contact_info.address.zip}</p>
                          )}
                          {a.notes && <p className="text-xs mt-1 text-muted-foreground">{a.notes}</p>}
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.type === "Vendor" ? "secondary" : "outline"} className="text-xs">{a.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.ein || "—"}</TableCell>
                    <TableCell className="text-xs">{contactSummary(a.contact_info)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{a.notes || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={a.active} onCheckedChange={checked => updateAlly.mutate({ id: a.id, active: checked })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(a)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete "{a.name}"?</AlertDialogTitle><AlertDialogDescription>This ally will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteAlly.mutate(a.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      {search || filterType !== "all" ? "No allies match your filters" : "No allies yet. Forge your first!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {allies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {allies.length} allies
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>⚔ Forge Ally Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ally name" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "Vendor" | "Sub" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Sub">Sub</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>EIN (Tax ID) {requireEin && <span className="text-destructive">*</span>}</Label>
              <Input value={form.ein} onChange={e => setForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" className="font-mono" />
              {requireEin && <p className="text-[10px] text-muted-foreground">EIN is required by global settings</p>}
            </div>
            <ContactEditor value={form.contact_info} onChange={ci => setForm(f => ({ ...f, contact_info: ci }))} />
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Intel about this ally..." rows={2} /></div>
            <Button onClick={handleAdd} className="w-full" disabled={createAlly.isPending || !form.name}>{createAlly.isPending ? "Forging..." : "⚔ Etch Ally"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={open => { if (!open) setEditId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Ally</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v as "Vendor" | "Sub" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Sub">Sub</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>EIN (Tax ID)</Label><Input value={editForm.ein} onChange={e => setEditForm(f => ({ ...f, ein: e.target.value }))} className="font-mono" /></div>
            <ContactEditor value={editForm.contact_info} onChange={ci => setEditForm(f => ({ ...f, contact_info: ci }))} />
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateAlly.isPending || !editForm.name}>{updateAlly.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
