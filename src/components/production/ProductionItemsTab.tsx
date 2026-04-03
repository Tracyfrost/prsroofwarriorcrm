import { useMemo, useState } from "react";
import {
  useProductionItems,
  useCreateProductionItem,
  useUpdateProductionItem,
  useDeleteProductionItem,
  useTradeTypes,
  type ProductionItem,
  type CrewAssignment,
  parseCrewAssigned,
  parseScopeMetadata,
} from "@/hooks/useProduction";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { usePaymentChecks } from "@/hooks/usePaymentChecks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, PanelRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { lineEstimatedExposure } from "@/lib/productionRollups";

const QUALIFICATION_GATES = ["Pending", "Go", "Hold", "Supplement"] as const;
const MATERIAL_ORDER = ["Not Ordered", "Ordered", "Delivered"] as const;

const CREW_ROLES = [
  { value: "foreman", label: "Foreman" },
  { value: "laborer", label: "Laborer" },
  { value: "installer", label: "Installer" },
  { value: "helper", label: "Helper" },
  { value: "other", label: "Other" },
];

function gateBadgeClass(gate: string) {
  switch (gate) {
    case "Go":
      return "bg-success/20 text-success-foreground border-success/30";
    case "Hold":
      return "bg-destructive/20 text-destructive-foreground border-destructive/30";
    case "Supplement":
      return "bg-warning/20 text-warning-foreground border-warning/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function normalizeItem(i: ProductionItem): ProductionItem {
  return {
    ...i,
    qualification_status: i.qualification_status ?? "Pending",
    material_order_status: i.material_order_status ?? "Not Ordered",
    drop_location: i.drop_location ?? "",
    sol_notes: i.sol_notes ?? "",
    crew_assigned: i.crew_assigned ?? [],
    scope_metadata: i.scope_metadata ?? {},
  };
}

export function ProductionItemsTab({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useProductionItems(jobId);
  const { data: trades = [] } = useTradeTypes();
  const { data: statuses = [] } = useProductionItemStatuses();
  const { data: profiles = [] } = useAllProfiles();
  const { data: checks = [] } = usePaymentChecks(jobId);

  const createItem = useCreateProductionItem();
  const updateItem = useUpdateProductionItem();
  const deleteItem = useDeleteProductionItem();

  const defaultStatusName = statuses[0]?.name ?? "draft";

  const [newItem, setNewItem] = useState({
    trade_type_id: "",
    scope_description: "",
    quantity: 1,
    labor_cost: 0,
    material_cost: 0,
    status: defaultStatusName,
    scheduled_start_date: "",
    assigned_to_user_id: "",
  });

  const [workbookId, setWorkbookId] = useState<string | null>(null);
  const [exportSelected, setExportSelected] = useState<Record<string, boolean>>({});

  const normalizedItems = useMemo(() => (items as ProductionItem[]).map(normalizeItem), [items]);
  const workbookItem = workbookId ? normalizedItems.find((i) => i.id === workbookId) : null;

  const receivedChecksTotal = checks
    .filter((c) => c.status === "Received" || c.status === "Deposited")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const totalLabor = normalizedItems.reduce((sum, i) => sum + (i.labor_cost || 0), 0);
  const totalMaterial = normalizedItems.reduce((sum, i) => sum + (i.material_cost || 0), 0);
  const grandTotal = totalLabor + totalMaterial;
  const totalExposure = normalizedItems.reduce((s, i) => s + lineEstimatedExposure(i), 0);

  const profileOptions = profiles.map((p) => ({
    value: p.user_id,
    label: p.name || p.email || p.user_id,
  }));

  const handleAdd = async () => {
    if (!newItem.trade_type_id || !newItem.scope_description.trim()) {
      toast({ title: "Trade and scope required", variant: "destructive" });
      return;
    }

    const trade = trades.find((t) => t.id === newItem.trade_type_id);
    await createItem.mutateAsync({
      job_id: jobId,
      trade_type_id: newItem.trade_type_id,
      scope_description: newItem.scope_description,
      quantity: newItem.quantity,
      labor_cost: newItem.labor_cost,
      material_cost: newItem.material_cost,
      status: newItem.status,
      scheduled_start_date: newItem.scheduled_start_date || null,
      assigned_to_user_id: newItem.assigned_to_user_id || null,
      unit_type: trade?.unit_type ?? "EA",
      labor_vendor: "",
      material_vendor: "",
      dependencies: "",
    } as Partial<ProductionItem>);
    setNewItem({
      trade_type_id: "",
      scope_description: "",
      quantity: 1,
      labor_cost: 0,
      material_cost: 0,
      status: defaultStatusName,
      scheduled_start_date: "",
      assigned_to_user_id: "",
    });
    toast({ title: "Production line added" });
  };

  const patchItem = (id: string, partial: Partial<ProductionItem>) => {
    updateItem.mutate({ id, ...partial });
  };

  const exportOrderForm = () => {
    const selected = normalizedItems.filter((i) => exportSelected[i.id]);
    const rows = selected.length > 0 ? selected : normalizedItems;
    if (rows.length === 0) {
      toast({ title: "No lines to export", variant: "destructive" });
      return;
    }
    const headers = [
      "Trade",
      "Scope",
      "Qty",
      "Unit",
      "MaterialVendor",
      "Material$",
      "Labor$",
      "DeliveryDate",
      "DropLocation",
      "MaterialOrderStatus",
      "QualificationGate",
    ];
    const lines = rows.map((i) =>
      [
        i.trade_types?.name ?? "",
        i.scope_description ?? "",
        String(i.quantity ?? ""),
        i.unit_type ?? "",
        i.material_vendor ?? "",
        String(i.material_cost ?? ""),
        String(i.labor_cost ?? ""),
        i.delivery_date ? format(new Date(i.delivery_date), "yyyy-MM-dd") : "",
        i.drop_location ?? "",
        i.material_order_status ?? "",
        i.qualification_status ?? "",
      ].map((c) => csvEscape(String(c)))
    );
    const csv = [headers.join(","), ...lines.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-form-${jobId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Order form CSV downloaded" });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading production lines...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Labor</p>
          <p className="text-2xl font-bold">${totalLabor.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Materials</p>
          <p className="text-2xl font-bold">${totalMaterial.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Line exposure (est.)</p>
          <p className="text-2xl font-bold text-primary">${totalExposure.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">$/sq × qty or labor+material</p>
        </div>
        <div className="border-l border-border pl-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Production total</p>
          <p className="text-2xl font-bold text-primary">${grandTotal.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Checks received (job): ${receivedChecksTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={exportOrderForm}>
          <Download className="mr-2 h-4 w-4" />
          Export order form (CSV)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" /> Add production line
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Select value={newItem.trade_type_id} onValueChange={(v) => setNewItem({ ...newItem, trade_type_id: v })}>
            <SelectTrigger className="lg:col-span-2">
              <SelectValue placeholder="Trade type" />
            </SelectTrigger>
            <SelectContent>
              {trades.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Scope (e.g. Main roof replacement)"
            value={newItem.scope_description}
            onChange={(e) => setNewItem({ ...newItem, scope_description: e.target.value })}
            className="lg:col-span-2"
          />

          <Input
            type="number"
            placeholder="Qty"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
          />

          <Button onClick={handleAdd} disabled={createItem.isPending} className="lg:col-span-1">
            {createItem.isPending ? "Adding..." : "Add line"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Export</span>
                </TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="w-16">Qty</TableHead>
                <TableHead>Gate</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="w-28">Total $</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedItems.map((item) => {
                const itemTotal = (item.labor_cost || 0) + (item.material_cost || 0);
                const gate = item.qualification_status || "Pending";
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!exportSelected[item.id]}
                        onCheckedChange={(c) => setExportSelected((prev) => ({ ...prev, [item.id]: !!c }))}
                        aria-label="Include in export"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.trade_types?.name || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{item.scope_description || "—"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={gateBadgeClass(gate)}>
                        {gate}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{item.material_order_status || "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {item.delivery_date ? format(new Date(item.delivery_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">${itemTotal.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setWorkbookId(item.id)}>
                        <PanelRight className="mr-1 h-3.5 w-3.5" />
                        Workbook
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {normalizedItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No production lines yet. Add one above.</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!workbookItem} onOpenChange={(open) => !open && setWorkbookId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {workbookItem && (
            <WarRoomWorkbook
              item={workbookItem}
              statuses={statuses}
              profileOptions={profileOptions}
              receivedChecksTotal={receivedChecksTotal}
              onPatch={(partial) => patchItem(workbookItem.id, partial)}
              onDelete={() => {
                deleteItem.mutate(workbookItem.id);
                setWorkbookId(null);
              }}
              isDeleting={deleteItem.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WarRoomWorkbook({
  item,
  statuses,
  profileOptions,
  receivedChecksTotal,
  onPatch,
  onDelete,
  isDeleting,
}: {
  item: ProductionItem;
  statuses: { name: string; display_name: string }[];
  profileOptions: { value: string; label: string }[];
  receivedChecksTotal: number;
  onPatch: (p: Partial<ProductionItem>) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const meta = parseScopeMetadata(item.scope_metadata);
  const crew = parseCrewAssigned(item.crew_assigned);

  const exposure = lineEstimatedExposure(item);
  const vsChecks = exposure - receivedChecksTotal;

  const setMeta = (key: string, value: string) => {
    onPatch({ scope_metadata: { ...meta, [key]: value || undefined } });
  };

  const setCrew = (next: CrewAssignment[]) => {
    onPatch({ crew_assigned: next });
  };

  const addCrewRow = () => {
    setCrew([...crew, { user_id: profileOptions[0]?.value ?? "", role: "installer" }]);
  };

  const updateCrew = (index: number, field: keyof CrewAssignment, value: string) => {
    const next = crew.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    setCrew(next);
  };

  const removeCrew = (index: number) => {
    setCrew(crew.filter((_, i) => i !== index));
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 text-left">{item.trade_types?.name || "Line"}</SheetTitle>
        <p className="text-left text-sm text-muted-foreground">{item.scope_description}</p>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualification</h3>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Line exposure (est.) vs job checks received</p>
            <p className="mt-1 font-mono text-base">
              ${exposure.toLocaleString()} vs ${receivedChecksTotal.toLocaleString()}
              <span className={vsChecks > 0 ? " text-destructive" : " text-success"}>
                {" "}
                ({vsChecks > 0 ? "+" : ""}
                {vsChecks.toLocaleString()})
              </span>
            </p>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Gate (Go / Hold / Supplement)</Label>
              <Select
                value={item.qualification_status || "Pending"}
                onValueChange={(v) => onPatch({ qualification_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_GATES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">$/sq</Label>
                <Input
                  type="number"
                  value={item.estimate_per_sq ?? ""}
                  onChange={(e) =>
                    onPatch({ estimate_per_sq: e.target.value === "" ? null : parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty (squares or units)</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onPatch({ quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Pre-draw ($)</Label>
                <Input
                  type="number"
                  value={item.pre_draw_amount ?? ""}
                  onChange={(e) =>
                    onPatch({ pre_draw_amount: e.target.value === "" ? null : parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recoverable depreciation ($)</Label>
                <Input
                  type="number"
                  value={item.recoverable_depreciation ?? ""}
                  onChange={(e) =>
                    onPatch({
                      recoverable_depreciation: e.target.value === "" ? null : parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scope of work</h3>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={item.scope_description}
              onChange={(e) => onPatch({ scope_description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="date"
                value={item.scheduled_start_date ? item.scheduled_start_date.split("T")[0] : ""}
                onChange={(e) => onPatch({ scheduled_start_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="date"
                value={item.scheduled_end_date ? item.scheduled_end_date.split("T")[0] : ""}
                onChange={(e) => onPatch({ scheduled_end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Shingle / product</Label>
              <Input value={String(meta.shingle_style ?? "")} onChange={(e) => setMeta("shingle_style", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Manufacturer</Label>
              <Input
                value={String(meta.shingle_manufacturer ?? "")}
                onChange={(e) => setMeta("shingle_manufacturer", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <Input value={String(meta.shingle_color ?? "")} onChange={(e) => setMeta("shingle_color", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Drip edge color</Label>
              <Input value={String(meta.drip_edge_color ?? "")} onChange={(e) => setMeta("drip_edge_color", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pitch</Label>
              <Input value={String(meta.pitch ?? "")} onChange={(e) => setMeta("pitch", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">SOW notes</Label>
            <Textarea
              value={item.sol_notes ?? ""}
              onChange={(e) => onPatch({ sol_notes: e.target.value })}
              rows={2}
              placeholder="Scope notes, exclusions, supplements..."
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pre-production</h3>
          <div className="space-y-1">
            <Label className="text-xs">Workflow status</Label>
            <Select value={item.status} onValueChange={(v) => onPatch({ status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.length > 0 ? (
                  statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.display_name || s.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Material order</Label>
            <Select value={item.material_order_status || "Not Ordered"} onValueChange={(v) => onPatch({ material_order_status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_ORDER.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Delivery date</Label>
            <Input
              type="datetime-local"
              value={item.delivery_date ? format(new Date(item.delivery_date), "yyyy-MM-dd'T'HH:mm") : ""}
              onChange={(e) => onPatch({ delivery_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Drop location</Label>
            <Input value={item.drop_location ?? ""} onChange={(e) => onPatch({ drop_location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Labor vendor</Label>
              <Input value={item.labor_vendor ?? ""} onChange={(e) => onPatch({ labor_vendor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material vendor</Label>
              <Input value={item.material_vendor ?? ""} onChange={(e) => onPatch({ material_vendor: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Labor ($)</Label>
              <Input
                type="number"
                value={item.labor_cost}
                onChange={(e) => onPatch({ labor_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material ($)</Label>
              <Input
                type="number"
                value={item.material_cost}
                onChange={(e) => onPatch({ material_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Primary assignee</Label>
            <Select
              value={item.assigned_to_user_id || "__none__"}
              onValueChange={(v) => onPatch({ assigned_to_user_id: v === "__none__" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {profileOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Crew (multi)</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addCrewRow}>
                Add
              </Button>
            </div>
            {crew.length === 0 && <p className="text-xs text-muted-foreground">No extra crew rows.</p>}
            {crew.map((c, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2">
                <Select value={c.user_id} onValueChange={(v) => updateCrew(idx, "user_id", v)}>
                  <SelectTrigger className="min-w-[140px] flex-1">
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c.role} onValueChange={(v) => updateCrew(idx, "role", v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREW_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="h-9 shrink-0" onClick={() => removeCrew(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <Button variant="destructive" className="w-full" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? "Removing..." : "Delete this line"}
        </Button>
      </div>
    </>
  );
}

export default ProductionItemsTab;
