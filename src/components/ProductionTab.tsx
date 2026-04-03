import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useProductionItems,
  useCreateProductionItem,
  useUpdateProductionItem,
  useDeleteProductionItem,
  useTradeTypes,
  type ProductionItem,
  PRODUCTION_STATUSES,
  PRODUCTION_STATUS_LABELS,
} from "@/hooks/useProduction";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";

const FALLBACK_STATUS = "draft";
const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

export function ProductionTab({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useProductionItems(jobId);
  const { data: tradeTypes = [] } = useTradeTypes();
  const { data: productionStatuses = [] } = useProductionItemStatuses(true);
  const createItem = useCreateProductionItem();
  const updateItem = useUpdateProductionItem();
  const deleteItem = useDeleteProductionItem();

  const statusOptions = useMemo(() => {
    if (productionStatuses.length > 0) {
      return productionStatuses.map((status) => ({
        value: status.name,
        label: status.display_name,
      }));
    }
    return PRODUCTION_STATUSES.map((status) => ({
      value: status,
      label: PRODUCTION_STATUS_LABELS[status] ?? status,
    }));
  }, [productionStatuses]);

  const [newItem, setNewItem] = useState({
    trade_type_id: "",
    scope_description: "",
    quantity: 1,
    labor_cost: 0,
    material_cost: 0,
    status: FALLBACK_STATUS,
    scheduled_start_date: "",
    assigned_to_user_id: "",
  });

  const totalLabor = items.reduce((sum, item) => sum + (item.labor_cost || 0), 0);
  const totalMaterial = items.reduce((sum, item) => sum + (item.material_cost || 0), 0);
  const totalCost = totalLabor + totalMaterial;

  const handleTradeChange = (tradeTypeId: string) => {
    const selectedTrade = tradeTypes.find((trade) => trade.id === tradeTypeId);
    const quantity = newItem.quantity || 0;
    setNewItem((prev) => ({
      ...prev,
      trade_type_id: tradeTypeId,
      labor_cost: selectedTrade ? selectedTrade.default_labor_cost_per_unit * quantity : prev.labor_cost,
      material_cost: selectedTrade ? selectedTrade.default_material_cost_per_unit * quantity : prev.material_cost,
    }));
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    const selectedTrade = tradeTypes.find((trade) => trade.id === newItem.trade_type_id);
    setNewItem((prev) => ({
      ...prev,
      quantity,
      labor_cost: selectedTrade ? selectedTrade.default_labor_cost_per_unit * quantity : prev.labor_cost,
      material_cost: selectedTrade ? selectedTrade.default_material_cost_per_unit * quantity : prev.material_cost,
    }));
  };

  const handleAdd = async () => {
    if (!newItem.trade_type_id || !newItem.scope_description.trim()) {
      toast({
        title: "Missing fields",
        description: "Trade and scope description are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedTrade = tradeTypes.find((trade) => trade.id === newItem.trade_type_id);
      await createItem.mutateAsync({
        job_id: jobId,
        trade_type_id: newItem.trade_type_id,
        scope_description: newItem.scope_description.trim(),
        quantity: newItem.quantity || 0,
        unit_type: selectedTrade?.unit_type || "EA",
        labor_cost: newItem.labor_cost || 0,
        material_cost: newItem.material_cost || 0,
        status: newItem.status || FALLBACK_STATUS,
        scheduled_start_date: newItem.scheduled_start_date || null,
        assigned_to_user_id: newItem.assigned_to_user_id || null,
      });

      setNewItem({
        trade_type_id: "",
        scope_description: "",
        quantity: 1,
        labor_cost: 0,
        material_cost: 0,
        status: FALLBACK_STATUS,
        scheduled_start_date: "",
        assigned_to_user_id: "",
      });
      toast({ title: "Production item added" });
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleUpdate = async (id: string, field: string, value: unknown) => {
    try {
      const payload = { id, [field]: value } as Partial<ProductionItem> & { id: string };
      await updateItem.mutateAsync(payload);
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast({ title: "Production item deleted" });
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading Production Items...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-6 md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">TOTAL LABOR</p>
          <p className="text-3xl font-bold">${totalLabor.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">TOTAL MATERIALS</p>
          <p className="text-3xl font-bold">${totalMaterial.toLocaleString()}</p>
        </div>
        <div className="border-l pl-6">
          <p className="text-xs text-muted-foreground">PRODUCTION TOTAL</p>
          <p className="text-3xl font-bold text-primary">${totalCost.toLocaleString()}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Production Item
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Select value={newItem.trade_type_id} onValueChange={handleTradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Trade" />
              </SelectTrigger>
              <SelectContent>
                {tradeTypes.map((tradeType) => (
                  <SelectItem key={tradeType.id} value={tradeType.id}>
                    {tradeType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Input
              placeholder="Scope Description (e.g. Main Roof - 25 squares)"
              value={newItem.scope_description}
              onChange={(e) => setNewItem((prev) => ({ ...prev, scope_description: e.target.value }))}
            />
          </div>

          <Input type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => handleQuantityChange(e.target.value)} />

          <Button onClick={handleAdd} className="lg:col-span-1" disabled={createItem.isPending}>
            Add Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Labor $</TableHead>
                <TableHead>Material $</TableHead>
                <TableHead>Total $</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No production items yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.trade_types?.name || "—"}</TableCell>

                    <TableCell>
                      <Input
                        value={item.scope_description || ""}
                        onChange={(e) => handleUpdate(item.id, "scope_description", e.target.value)}
                        className="border-0 focus-visible:ring-1"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity || 0}
                        onChange={(e) => handleUpdate(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 border-0 focus-visible:ring-1"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        value={item.labor_cost || 0}
                        onChange={(e) => handleUpdate(item.id, "labor_cost", parseFloat(e.target.value) || 0)}
                        className="border-0 focus-visible:ring-1"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        value={item.material_cost || 0}
                        onChange={(e) => handleUpdate(item.id, "material_cost", parseFloat(e.target.value) || 0)}
                        className="border-0 focus-visible:ring-1"
                      />
                    </TableCell>

                    <TableCell className="font-medium">
                      ${((item.labor_cost || 0) + (item.material_cost || 0)).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <Select value={item.status || FALLBACK_STATUS} onValueChange={(value) => handleUpdate(item.id, "status", value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="date"
                        value={item.scheduled_start_date ? item.scheduled_start_date.split("T")[0] : ""}
                        onChange={(e) => handleUpdate(item.id, "scheduled_start_date", e.target.value || null)}
                      />
                    </TableCell>

                    <TableCell>
                      <Select
                        value={item.assigned_to_user_id || "__unassigned__"}
                        onValueChange={(value) =>
                          handleUpdate(item.id, "assigned_to_user_id", value === "__unassigned__" ? null : value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={deleteItem.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
