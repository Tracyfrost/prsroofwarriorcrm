// MOBILE-PORT-READY – maps 1:1 to React Native
import { useState } from "react";
import { useMasterLeads, useCreateMasterLead, useBulkAssignLeads, MasterLead } from "@/hooks/useCallSetter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Plus, Upload, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

const EMPTY_FORM = {
  first_name: "", last_name: "", street: "", city: "", state: "", zip: "",
  phone: "", email: "", dwelling_type: "", dwelling_type_desc: "",
  homeowner_indicator_desc: "", do_not_call: false, wireless: false,
};

export function MasterLeadsGrid() {
  const { data: leads = [], isLoading } = useMasterLeads(false);
  const createLead = useCreateMasterLead();
  const bulkAssign = useBulkAssignLeads();
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-setter"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, name, level").eq("active", true);
      return data ?? [];
    },
  });

  const filtered = leads.filter((l) => {
    const s = search.toLowerCase();
    return !s || `${l.first_name} ${l.last_name} ${l.city} ${l.zip} ${l.phone} ${l.email}`.toLowerCase().includes(s);
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((l) => l.id)));
  };

  const handleAdd = () => {
    createLead.mutate(form as any);
    setForm({ ...EMPTY_FORM });
    setShowAdd(false);
  };

  const handleBulkAssign = () => {
    if (!assignTo || selected.size === 0) return;
    bulkAssign.mutate({ leadIds: Array.from(selected), setterId: assignTo });
    setSelected(new Set());
    setShowAssign(false);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        let count = 0;
        for (const row of rows) {
          const mapped: any = {
            first_name: row["First Name"] || row["first_name"] || row["FirstName"] || "",
            last_name: row["Last Name"] || row["last_name"] || row["LastName"] || "",
            street: row["Street"] || row["Address"] || row["street"] || "",
            city: row["City"] || row["city"] || "",
            state: row["State"] || row["state"] || "",
            zip: row["Zip"] || row["ZIP"] || row["zip"] || row["Zip Code"] || "",
            phone: row["Phone"] || row["phone"] || row["Phone Number"] || "",
            email: row["Email"] || row["email"] || row["E-Mail"] || "",
            do_not_call: (row["Do Not Call"] || row["DNC"] || "").toLowerCase() === "true" || (row["Do Not Call"] || row["DNC"] || "") === "1",
            wireless: (row["Wireless"] || row["wireless"] || "").toLowerCase() === "true" || (row["Wireless"] || row["wireless"] || "") === "1",
            dwelling_type: row["Dwelling Type"] || row["dwelling_type"] || "",
            dwelling_type_desc: row["Dwelling Type Desc"] || row["dwelling_type_desc"] || "",
            homeowner_indicator_desc: row["Homeowner Indicator Desc"] || row["homeowner_indicator_desc"] || "",
          };
          if (mapped.first_name || mapped.last_name) {
            await supabase.from("master_leads" as any).insert(mapped);
            count++;
          }
        }
        toast({ title: "CSV Imported", description: `${count} leads forged into the arsenal.` });
      },
    });
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs min-h-[44px]" />
        <Button onClick={() => setShowAdd(true)} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
        <Button variant="outline" className="min-h-[44px] relative" asChild>
          <label>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
            <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCSVImport} />
          </label>
        </Button>
        {selected.size > 0 && (
          <Button variant="secondary" onClick={() => setShowAssign(true)} className="min-h-[44px]">
            <Users className="h-4 w-4 mr-1" /> Assign {selected.size}
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>DNC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Setter</TableHead>
              <TableHead>Qualified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow key={lead.id} className={cn(lead.is_qualified && "bg-green-500/10", lead.do_not_call && "opacity-50")}>
                <TableCell><Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                <TableCell className="font-medium whitespace-nowrap">{lead.first_name} {lead.last_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{lead.city}, {lead.state} {lead.zip}</TableCell>
                <TableCell className="text-sm">{lead.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
                <TableCell>
                  {lead.do_not_call && <Badge variant="destructive" className="text-[10px]">DNC</Badge>}
                  {lead.wireless && <Badge variant="outline" className="text-[10px] ml-1">📱</Badge>}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{lead.status}</Badge></TableCell>
                <TableCell className="text-xs">{profiles.find((p) => p.user_id === lead.assigned_setter_id)?.name || "—"}</TableCell>
                <TableCell>{lead.is_qualified ? <Badge className="bg-green-600 text-white text-[10px]">⚔️ Yes</Badge> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Lead Modal */}
      <ResponsiveModal open={showAdd} onOpenChange={setShowAdd} title="Forge New Lead">
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div><Label>Street</Label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Dwelling Type</Label><Input value={form.dwelling_type} onChange={(e) => setForm({ ...form, dwelling_type: e.target.value })} /></div>
            <div><Label>Dwelling Desc</Label><Input value={form.dwelling_type_desc} onChange={(e) => setForm({ ...form, dwelling_type_desc: e.target.value })} /></div>
          </div>
          <div><Label>Homeowner Indicator Desc</Label><Input value={form.homeowner_indicator_desc} onChange={(e) => setForm({ ...form, homeowner_indicator_desc: e.target.value })} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 min-h-[44px]">
              <Checkbox checked={form.do_not_call} onCheckedChange={(v) => setForm({ ...form, do_not_call: !!v })} />
              <span className="text-sm">Do Not Call</span>
            </label>
            <label className="flex items-center gap-2 min-h-[44px]">
              <Checkbox checked={form.wireless} onCheckedChange={(v) => setForm({ ...form, wireless: !!v })} />
              <span className="text-sm">Wireless</span>
            </label>
          </div>
          <Button onClick={handleAdd} className="w-full min-h-[44px]">Forge Lead</Button>
        </div>
      </ResponsiveModal>

      {/* Assign Modal */}
      <ResponsiveModal open={showAssign} onOpenChange={setShowAssign} title={`Assign ${selected.size} Leads`}>
        <div className="space-y-4 py-2">
          <div>
            <Label>Assign to Setter</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select setter..." /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleBulkAssign} className="w-full min-h-[44px]" disabled={!assignTo}>Deploy {selected.size} Leads</Button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
