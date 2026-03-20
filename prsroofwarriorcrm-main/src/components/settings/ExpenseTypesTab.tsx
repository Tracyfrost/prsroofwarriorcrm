import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useExpenseTypes, useCreateExpenseType, useUpdateExpenseType, useDeleteExpenseType,
  useExpenseTypeUsage, EXPENSE_CATEGORIES, RATE_UNITS,
  type ExpenseType,
} from "@/hooks/useExpenseTypes";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Receipt, Download, BarChart3, Info, Sparkles, CheckCheck } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  category: "Miscellaneous",
  allows_negative: false,
  active: true,
  default_rate: "",
  default_unit: "flat",
  description: "",
  icon: "receipt",
};

export function ExpenseTypesTab() {
  const { toast } = useToast();
  const { data: types = [] } = useExpenseTypes(false);
  const { data: usage = [] } = useExpenseTypeUsage();
  const createType = useCreateExpenseType();
  const updateType = useUpdateExpenseType();
  const deleteType = useDeleteExpenseType();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const usageMap = useMemo(() => {
    const m = new Map<string, { usage_count: number; avg_amount: number; total_amount: number }>();
    usage.forEach(u => m.set(u.type_id, u));
    return m;
  }, [usage]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t: ExpenseType) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      category: t.category,
      allows_negative: t.allows_negative,
      active: t.active,
      default_rate: String(t.default_rate || ""),
      default_unit: t.default_unit,
      description: t.description,
      icon: t.icon,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      const payload = {
        name: form.name,
        category: form.category,
        allows_negative: form.allows_negative,
        active: form.active,
        default_rate: parseFloat(form.default_rate) || 0,
        default_unit: form.default_unit,
        description: form.description,
        icon: form.icon,
      };
      if (editingId) {
        await updateType.mutateAsync({ id: editingId, ...payload });
        toast({ title: "⚔ Type updated" });
      } else {
        await createType.mutateAsync({ ...payload, sort_order: types.length + 1 });
        toast({ title: "⚔ Type forged — Ledger Enhanced!" });
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selected) {
        await deleteType.mutateAsync(id);
      }
      toast({ title: `${selected.size} type(s) deleted` });
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAiSuggest = () => {
    const suggestions = [
      { name: "Permit Fee", category: "Permits", default_rate: "150", default_unit: "flat", description: "Building/roofing permit fees" },
      { name: "Dumpster Rental", category: "Fees", default_rate: "450", default_unit: "/job", description: "Debris dumpster rental per job" },
      { name: "Labor Overtime", category: "Payroll", default_rate: "45", default_unit: "/hr", description: "Overtime labor charges" },
    ];
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    setForm(f => ({ ...f, ...pick, allows_negative: false, active: true, icon: "receipt" }));
    toast({ title: "🤖 AI Suggested", description: `"${pick.name}" populated` });
  };

  const exportCSV = () => {
    const headers = ["Name", "Category", "Default Rate", "Unit", "Allows Negatives", "Active", "Usage Count", "Avg Amount", "Description"];
    const rows = types.map(t => {
      const u = usageMap.get(t.id);
      return [
        t.name, t.category, t.default_rate, t.default_unit,
        t.allows_negative ? "Yes" : "No", t.active ? "Yes" : "No",
        u?.usage_count ?? 0, (u?.avg_amount ?? 0).toFixed(2), t.description,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expense-types.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === types.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(types.map(t => t.id)));
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Expense Types
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {selected.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="mr-1 h-3 w-3" /> Delete {selected.size}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} type(s)?</AlertDialogTitle>
                    <AlertDialogDescription>Existing expenses won't be affected.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleBulkDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="mr-1 h-3 w-3" /> CSV
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-3 w-3" /> Forge New Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === types.length && types.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Default Rate</TableHead>
                  <TableHead className="text-center">Negatives</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <BarChart3 className="h-3 w-3" /> Usage
                    </div>
                  </TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => {
                  const stats = usageMap.get(t.id);
                  return (
                    <TableRow key={t.id} className={selected.has(t.id) ? "bg-muted/40" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(t.id)}
                          onCheckedChange={() => toggleSelect(t.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <span className="font-medium cursor-pointer hover:underline">{t.name}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold flex items-center gap-1.5">
                                <Receipt className="h-3.5 w-3.5" /> Type Intel
                              </p>
                              <p className="text-xs text-muted-foreground">{t.description || "No description"}</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <span className="text-muted-foreground">Category:</span>
                                <span>{t.category}</span>
                                <span className="text-muted-foreground">Default Rate:</span>
                                <span className="font-mono">${t.default_rate}{t.default_unit !== "flat" ? t.default_unit : ""}</span>
                                <span className="text-muted-foreground">Uses:</span>
                                <span>{stats?.usage_count ?? 0}</span>
                                <span className="text-muted-foreground">Avg Amount:</span>
                                <span className="font-mono">${(stats?.avg_amount ?? 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {t.default_rate > 0 ? `$${t.default_rate}${t.default_unit !== "flat" ? t.default_unit : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.allows_negative}
                          onCheckedChange={checked => updateType.mutate({ id: t.id, allows_negative: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.active}
                          onCheckedChange={checked => updateType.mutate({ id: t.id, active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {stats?.usage_count ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>Existing expenses using this type won't be affected.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteType.mutate(t.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {types.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      No expense types forged yet. Click "Forge New Type" to begin.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {editingId ? "Edit Expense Type" : "Forge New Expense Type"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update the details below." : "Define a new expense category for your ledger."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Permit Fee" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Default Rate ($)</Label>
                <Input type="number" step="0.01" value={form.default_rate} onChange={e => setForm(f => ({ ...f, default_rate: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Rate Unit</Label>
                <Select value={form.default_unit} onValueChange={v => setForm(f => ({ ...f, default_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATE_UNITS.map(u => <SelectItem key={u} value={u}>{u === "flat" ? "Flat" : `$${u}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What this expense type covers..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.allows_negative} onCheckedChange={v => setForm(f => ({ ...f, allows_negative: v }))} />
                <Label className="flex items-center gap-1">
                  Allows Negatives
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="text-xs w-48">
                      Enable to allow refunds/credits (negative amounts) for this type.
                    </HoverCardContent>
                  </HoverCard>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={createType.isPending || updateType.isPending || !form.name}>
                <CheckCheck className="mr-1 h-3 w-3" />
                {editingId ? "Save Changes" : "Etch Type"}
              </Button>
              {!editingId && (
                <Button variant="outline" onClick={handleAiSuggest} type="button">
                  <Sparkles className="mr-1 h-3 w-3" /> AI Suggest
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
