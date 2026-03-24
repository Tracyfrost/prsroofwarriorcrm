import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { AppLayout } from "@/components/AppLayout";
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "@/hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const { data: items = [], isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [unit, setUnit] = useState("pcs");

  const lowStockItems = items.filter((i) => i.stock <= i.min_stock);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createItem.mutateAsync({ name, sku, stock: parseInt(stock) || 0, min_stock: parseInt(minStock) || 5, unit });
      setOpen(false);
      setName(""); setSku(""); setStock("0"); setMinStock("5"); setUnit("pcs");
      toast({ title: "Item added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleStockChange = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + delta);
    try {
      await updateItem.mutateAsync({ id, stock: newStock });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast({ title: "Item deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Arsenal Depot</h1>
            <p className="text-muted-foreground">Stockpile weapons & supplies · Fortify the arsenal.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Arm the Depot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
                  <div><Label>Min Stock</Label><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
                  <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
                </div>
                <Button onClick={handleCreate} disabled={createItem.isPending} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Low stock alerts */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-warning/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{lowStockItems.length} item(s) at or below minimum stock</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.map((i) => (
                  <Badge key={i.id} variant="outline" className="border-warning/50 text-warning">
                    {i.name}: {i.stock} {i.unit}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> All Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No inventory items yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{item.sku || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.stock <= item.min_stock ? "text-destructive font-bold" : ""}>
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.min_stock}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleStockChange(item.id, -1)}>−</Button>
                          <Button variant="outline" size="sm" onClick={() => handleStockChange(item.id, 1)}>+</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageWrapper>
    </AppLayout>
  );
}
