import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Download, LayoutGrid, List } from "lucide-react";
import { BattleTooltip } from "@/components/BattleTooltip";
import { useNavigate } from "react-router-dom";
import {
  useAllProductionItems,
  useUpdateProductionItem,
  useTradeTypes,
  type ProductionItem,
} from "@/hooks/useProduction";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useToast } from "@/hooks/use-toast";
import { ProductionBoard } from "@/components/ProductionBoard";
import { ProductionList } from "@/components/ProductionList";

export default function Production() {
  const [view, setView] = useState<"list" | "board">("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gateFilter, setGateFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");
  const { data: items = [], isLoading } = useAllProductionItems();
  const { data: tradeTypes = [] } = useTradeTypes();
  const { data: profiles = [] } = useAllProfiles();
  const { data: productionStatuses = [] } = useProductionItemStatuses(true);
  const updateItem = useUpdateProductionItem();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Side panel
  const [selectedItem, setSelectedItem] = useState<ProductionItem | null>(null);
  const [editLabor, setEditLabor] = useState("");
  const [editMaterial, setEditMaterial] = useState("");
  const [editScope, setEditScope] = useState("");

  const filtered = items.filter((i) => {
    const matchSearch =
      (i.trade_types?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.jobs?.job_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.jobs?.customers?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchTrade = tradeFilter === "all" || i.trade_type_id === tradeFilter;
    const matchAssignee = assigneeFilter === "all" || i.assigned_to_user_id === assigneeFilter;
    const matchDateFrom = !dateFrom || (i.scheduled_start_date && i.scheduled_start_date >= dateFrom);
    const matchDateTo = !dateTo || (i.scheduled_start_date && i.scheduled_start_date <= dateTo);
    const matchGate = gateFilter === "all" || (i.qualification_status || "Pending") === gateFilter;
    const matchMaterial =
      materialFilter === "all" || (i.material_order_status || "Not Ordered") === materialFilter;
    const delDay = i.delivery_date ? i.delivery_date.split("T")[0] : "";
    const matchDelFrom = !deliveryFrom || (delDay && delDay >= deliveryFrom);
    const matchDelTo = !deliveryTo || (delDay && delDay <= deliveryTo);
    return (
      matchSearch &&
      matchStatus &&
      matchTrade &&
      matchAssignee &&
      matchDateFrom &&
      matchDateTo &&
      matchGate &&
      matchMaterial &&
      matchDelFrom &&
      matchDelTo
    );
  });

  const handleStatusChange = async (item: ProductionItem, newStatus: string) => {
    try {
      await updateItem.mutateAsync({ id: item.id, status: newStatus } as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkStatusChange = async (ids: string[], status: string) => {
    try {
      await Promise.all(ids.map((id) => updateItem.mutateAsync({ id, status } as any)));
      toast({ title: `${ids.length} items updated` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkAssign = async (ids: string[], userId: string) => {
    try {
      await Promise.all(ids.map((id) => updateItem.mutateAsync({ id, assigned_to_user_id: userId } as any)));
      toast({ title: `${ids.length} items assigned` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkSchedule = async (ids: string[], start: string, end: string) => {
    try {
      await Promise.all(
        ids.map((id) =>
          updateItem.mutateAsync({
            id,
            scheduled_start_date: start || null,
            scheduled_end_date: end || null,
          } as any)
        )
      );
      toast({ title: `${ids.length} items scheduled` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openDetail = (item: ProductionItem) => {
    setSelectedItem(item);
    setEditLabor(String(item.labor_cost));
    setEditMaterial(String(item.material_cost));
    setEditScope(item.scope_description);
  };

  const saveDetail = async () => {
    if (!selectedItem) return;
    try {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        labor_cost: parseFloat(editLabor) || 0,
        material_cost: parseFloat(editMaterial) || 0,
        scope_description: editScope,
      } as any);
      toast({ title: "Updated" });
      setSelectedItem(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const headers = [
      "Job ID",
      "Customer",
      "Trade",
      "Qty",
      "Unit",
      "Labor",
      "Material",
      "Total",
      "Status",
      "Scheduled",
      "QualificationGate",
      "MaterialOrder",
      "DeliveryDate",
      "DropLocation",
    ];
    const rows = filtered.map((i) => [
      i.jobs?.job_id || "",
      i.jobs?.customers?.name || "",
      i.trade_types?.name || "",
      i.quantity,
      i.unit_type,
      i.labor_cost,
      i.material_cost,
      i.labor_cost + i.material_cost,
      productionStatuses.find((s) => s.name === i.status)?.display_name || i.status,
      i.scheduled_start_date || "",
      i.qualification_status || "",
      i.material_order_status || "",
      i.delivery_date ? i.delivery_date.split("T")[0] : "",
      (i.drop_location || "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "production-export.csv";
    a.click();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTradeFilter("all");
    setAssigneeFilter("all");
    setDateFrom("");
    setDateTo("");
    setGateFilter("all");
    setMaterialFilter("all");
    setDeliveryFrom("");
    setDeliveryTo("");
  };

  const hasFilters =
    search ||
    statusFilter !== "all" ||
    tradeFilter !== "all" ||
    assigneeFilter !== "all" ||
    dateFrom ||
    dateTo ||
    gateFilter !== "all" ||
    materialFilter !== "all" ||
    deliveryFrom ||
    deliveryTo;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Battle Grid — War Room</h1>
            <p className="text-muted-foreground text-sm">{items.length} production items · Command the forge</p>
          </div>
          <BattleTooltip phraseKey="export_csv">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </BattleTooltip>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {productionStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {tradeTypes.map((tt) => (
                  <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gateFilter} onValueChange={setGateFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Gate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gates</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Go">Go</SelectItem>
                <SelectItem value="Hold">Hold</SelectItem>
                <SelectItem value="Supplement">Supplement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Materials" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All material states</SelectItem>
                <SelectItem value="Not Ordered">Not Ordered</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <BattleTooltip phraseKey="view_board_production">
                <button
                  onClick={() => setView("board")}
                  className={`px-3 py-2 text-sm ${view === "board" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </BattleTooltip>
              <BattleTooltip phraseKey="view_list_production">
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-2 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </BattleTooltip>
            </div>
          </div>
          {/* Date range row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Delivery from</Label>
              <Input type="date" value={deliveryFrom} onChange={(e) => setDeliveryFrom(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Delivery to</Label>
              <Input type="date" value={deliveryTo} onChange={(e) => setDeliveryTo(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : view === "board" ? (
          <ProductionBoard items={filtered} onStatusChange={handleStatusChange} onCardClick={openDetail} />
        ) : (
          <ProductionList
            items={filtered}
            profiles={profiles}
            onStatusChange={handleStatusChange}
            onRowClick={openDetail}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkAssign={handleBulkAssign}
            onBulkSchedule={handleBulkSchedule}
            navigate={navigate}
          />
        )}

        {/* Side panel */}
        <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{selectedItem?.trade_types?.name} — {selectedItem?.jobs?.job_id}</SheetTitle>
            </SheetHeader>
            {selectedItem && (
              <div className="space-y-4 mt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedItem.jobs?.customers?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedItem.quantity} {selectedItem.unit_type} • Status: {productionStatuses.find((s) => s.name === selectedItem.status)?.display_name || selectedItem.status}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Input value={editScope} onChange={(e) => setEditScope(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Labor ($)</Label>
                    <Input type="number" value={editLabor} onChange={(e) => setEditLabor(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Material ($)</Label>
                    <Input type="number" value={editMaterial} onChange={(e) => setEditMaterial(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedItem.status} onValueChange={(v) => handleStatusChange(selectedItem, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {productionStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button onClick={saveDetail} className="flex-1" disabled={updateItem.isPending}>
                    {updateItem.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/operations/${selectedItem.job_id}`)}>
                    View Job
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </PageWrapper>
    </AppLayout>
  );
}
