import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useProductionItems,
  useCreateProductionItem,
  useUpdateProductionItem,
  useTradeTypes,
  type ProductionItem,
} from "@/hooks/useProduction";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";

export function ProductionTab({ jobId }: { jobId: string }) {
  const { data: items = [], isLoading } = useProductionItems(jobId);
  const { data: tradeTypes = [] } = useTradeTypes();
  const { data: productionStatuses = [] } = useProductionItemStatuses(true);
  const createItem = useCreateProductionItem();
  const updateItem = useUpdateProductionItem();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [formTradeId, setFormTradeId] = useState("");
  const [formScope, setFormScope] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formLabor, setFormLabor] = useState("0");
  const [formMaterial, setFormMaterial] = useState("0");
  const [formUnit, setFormUnit] = useState("EA");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const handleTradeSelect = (tradeId: string) => {
    setFormTradeId(tradeId);
    const tt = tradeTypes.find((t) => t.id === tradeId);
    if (tt) {
      setFormUnit(tt.unit_type);
      const qty = parseFloat(formQty) || 1;
      setFormLabor(String(tt.default_labor_cost_per_unit * qty));
      setFormMaterial(String(tt.default_material_cost_per_unit * qty));
    }
  };

  const handleQtyChange = (val: string) => {
    setFormQty(val);
    const tt = tradeTypes.find((t) => t.id === formTradeId);
    if (tt) {
      const qty = parseFloat(val) || 0;
      setFormLabor(String(tt.default_labor_cost_per_unit * qty));
      setFormMaterial(String(tt.default_material_cost_per_unit * qty));
    }
  };

  const handleAdd = async () => {
    if (!formTradeId) return;
    try {
      await createItem.mutateAsync({
        job_id: jobId,
        trade_type_id: formTradeId,
        scope_description: formScope,
        quantity: parseFloat(formQty) || 0,
        unit_type: formUnit,
        labor_cost: parseFloat(formLabor) || 0,
        material_cost: parseFloat(formMaterial) || 0,
        scheduled_start_date: formStartDate || null,
        scheduled_end_date: formEndDate || null,
      });
      toast({ title: "Production item added" });
      setShowAdd(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormTradeId("");
    setFormScope("");
    setFormQty("1");
    setFormLabor("0");
    setFormMaterial("0");
    setFormUnit("EA");
    setFormStartDate("");
    setFormEndDate("");
  };

  const handleStatusChange = async (item: ProductionItem, newStatus: string) => {
    try {
      await updateItem.mutateAsync({ id: item.id, status: newStatus } as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleInlineEdit = async (item: ProductionItem, field: string, value: any) => {
    try {
      await updateItem.mutateAsync({ id: item.id, [field]: value } as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const totalLabor = items.reduce((s, i) => s + (i.labor_cost || 0), 0);
  const totalMaterial = items.reduce((s, i) => s + (i.material_cost || 0), 0);
  const totalCost = totalLabor + totalMaterial;

  // Cost by trade
  const costByTrade = items.reduce<Record<string, number>>((acc, i) => {
    const name = i.trade_types?.name || "Other";
    acc[name] = (acc[name] || 0) + (i.labor_cost || 0) + (i.material_cost || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Labor</p>
            <p className="text-xl font-bold text-foreground">${totalLabor.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Materials</p>
            <p className="text-xl font-bold text-foreground">${totalMaterial.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Production</p>
            <p className="text-xl font-bold text-foreground">${totalCost.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">By Trade</p>
            <div className="space-y-0.5 mt-1">
              {Object.entries(costByTrade).map(([name, cost]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-mono">${cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Production Items ({items.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3 w-3" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No production items yet</TableCell></TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.trade_types?.name || "—"}</TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs border-0 bg-transparent p-0 focus:bg-card focus:border focus:p-1"
                        defaultValue={item.scope_description}
                        onBlur={(e) => {
                          if (e.target.value !== item.scope_description)
                            handleInlineEdit(item, "scope_description", e.target.value);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-mono">{item.quantity} {item.unit_type}</TableCell>
                    <TableCell className="text-sm font-mono">${item.labor_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-mono">${item.material_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold font-mono">${(item.labor_cost + item.material_cost).toLocaleString()}</TableCell>
                    <TableCell>
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {productionStatuses.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.display_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.scheduled_start_date || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Production Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trade Type *</Label>
              <Select value={formTradeId} onValueChange={handleTradeSelect}>
                <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                <SelectContent>
                  {tradeTypes.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>{tt.name} ({tt.unit_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope Description</Label>
              <Input value={formScope} onChange={(e) => setFormScope(e.target.value)} placeholder="Describe the scope" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={formQty} onChange={(e) => handleQtyChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Labor Cost ($)</Label>
                <Input type="number" value={formLabor} onChange={(e) => setFormLabor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Material Cost ($)</Label>
                <Input type="number" value={formMaterial} onChange={(e) => setFormMaterial(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createItem.isPending || !formTradeId}>
              {createItem.isPending ? "Adding..." : "Add Production Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
