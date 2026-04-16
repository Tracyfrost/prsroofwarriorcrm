import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BattleTooltip } from "@/components/BattleTooltip";
import { useJobExpenses, useCreateJobExpense, useUpdateJobExpense, useDeleteJobExpense, type JobExpense } from "@/hooks/useJobExpenses";
import { useExpenseTypes } from "@/hooks/useExpenseTypes";
import { useAllies } from "@/hooks/useAllies";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Receipt, Download, Pencil, Check, X } from "lucide-react";

interface Props {
  jobId: string;
  title: string;
  icon?: React.ReactNode;
  categories: readonly string[];
  badge?: string;
  badgeVariant?: "default" | "outline" | "secondary" | "destructive";
}

export function CategoryExpenseGrid({ jobId, title, icon, categories, badge, badgeVariant = "outline" }: Props) {
  const { toast } = useToast();
  const { data: allExpenses = [] } = useJobExpenses(jobId);
  const { data: allExpenseTypes = [] } = useExpenseTypes();
  const { data: allies = [] } = useAllies();
  const { data: profiles = [] } = useAllProfiles();
  const createExpense = useCreateJobExpense();
  const updateExpense = useUpdateJobExpense();
  const deleteExpense = useDeleteJobExpense();

  const expenseTypes = useMemo(
    () => allExpenseTypes.filter(et => categories.includes(et.category)),
    [allExpenseTypes, categories]
  );
  const expenses = useMemo(
    () => allExpenses.filter(e => {
      const et = allExpenseTypes.find(t => t.id === e.expense_type_id);
      return et && categories.includes(et.category);
    }),
    [allExpenses, allExpenseTypes, categories]
  );

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allySearch, setAllySearch] = useState("");
  const [form, setForm] = useState({
    expense_type_id: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    ally_id: "none",
    reference_number: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState<typeof form>({ expense_type_id: "", amount: "", expense_date: "", ally_id: "none", reference_number: "", notes: "" });

  const filteredAllies = useMemo(() => {
    if (!allySearch) return allies;
    const q = allySearch.toLowerCase();
    return allies.filter(a => a.name.toLowerCase().includes(q));
  }, [allies, allySearch]);

  const resetForm = () => {
    setForm({ expense_type_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], ally_id: "none", reference_number: "", notes: "" });
    setAllySearch("");
    setAdding(false);
  };

  const handleAdd = async () => {
    if (!form.expense_type_id || !form.amount) return;
    try {
      await createExpense.mutateAsync({
        job_id: jobId,
        expense_type_id: form.expense_type_id,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        ally_id: form.ally_id === "none" ? null : form.ally_id,
        reference_number: form.reference_number,
        notes: form.notes,
      });
      toast({ title: "⚔ Entry etched!" });
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = (exp: JobExpense) => {
    setEditingId(exp.id);
    setEditForm({
      expense_type_id: exp.expense_type_id,
      amount: exp.amount.toString(),
      expense_date: exp.expense_date,
      ally_id: exp.ally_id || "none",
      reference_number: exp.reference_number || "",
      notes: exp.notes || "",
    });
  };

  const handleSaveEdit = async (exp: JobExpense) => {
    try {
      await updateExpense.mutateAsync({
        id: exp.id,
        job_id: jobId,
        expense_type_id: editForm.expense_type_id,
        amount: parseFloat(editForm.amount) || 0,
        expense_date: editForm.expense_date,
        ally_id: editForm.ally_id === "none" ? null : editForm.ally_id,
        reference_number: editForm.reference_number,
        notes: editForm.notes,
      });
      toast({ title: "Entry updated" });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (exp: JobExpense) => {
    try {
      await deleteExpense.mutateAsync({ id: exp.id, job_id: jobId });
      toast({ title: "Entry removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const typeSums = expenseTypes.map(et => ({
    name: et.name,
    total: expenses.filter(e => e.expense_type_id === et.id).reduce((s, e) => s + e.amount, 0),
  }));
  const netTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const exportCSV = () => {
    const headers = ["Date", "Type", "Amount", "Ally", "Ref #", "Notes"];
    const rows = expenses.map(e => [
      e.expense_date, e.expense_type?.name ?? "", e.amount.toString(),
      e.ally?.name || e.vendor?.name || e.sub?.name || "", e.reference_number, e.notes,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${jobId.slice(0, 8)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const renderEditableRow = (exp: JobExpense) => (
    <TableRow key={exp.id} className="bg-accent/5">
      <TableCell>
        <Select value={editForm.expense_type_id} onValueChange={v => setEditForm(f => ({ ...f, expense_type_id: v }))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{expenseTypes.map(et => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-xs font-mono text-right w-24" />
      </TableCell>
      <TableCell>
        <Input type="date" value={editForm.expense_date} onChange={e => setEditForm(f => ({ ...f, expense_date: e.target.value }))} className="h-8 text-xs w-28" />
      </TableCell>
      <TableCell>
        <Select value={editForm.ally_id} onValueChange={v => setEditForm(f => ({ ...f, ally_id: v }))}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {allies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input value={editForm.reference_number} onChange={e => setEditForm(f => ({ ...f, reference_number: e.target.value }))} className="h-8 text-xs w-16" /></TableCell>
      <TableCell><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs" /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="default" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(exp)} disabled={updateExpense.isPending}><Check className="h-3 w-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon || <Receipt className="h-4 w-4" />} {title}
          {badge && <Badge variant={badgeVariant} className="text-[9px]">{badge}</Badge>}
        </CardTitle>
        <div className="flex gap-2">
          {expenses.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="mr-1 h-3 w-3" /> CSV</Button>
          )}
          <BattleTooltip phraseKey="create" fallback="Etch Entry!">
            <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </BattleTooltip>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {expenses.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-b">
            {typeSums.filter(t => t.total !== 0).map(t => (
              <Badge key={t.name} variant="outline" className="font-mono text-xs gap-1">
                {t.name}: <span className={t.total < 0 ? "text-destructive" : ""}>${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </Badge>
            ))}
            <Badge variant={netTotal >= 0 ? "default" : "destructive"} className="font-mono text-xs ml-auto">
              Total: ${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Badge>
          </div>
        )}

        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Ally / Rep</TableHead>
                <TableHead className="w-20">Ref #</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Select value={form.expense_type_id || "placeholder"} onValueChange={v => v !== "placeholder" && setForm(f => ({ ...f, expense_type_id: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>Select type</SelectItem>
                        {expenseTypes.map(et => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="h-8 text-xs font-mono text-right w-24" /></TableCell>
                  <TableCell><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="h-8 text-xs w-28" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input value={allySearch} onChange={e => setAllySearch(e.target.value)} placeholder="Search ally..." className="h-7 text-xs w-36" />
                      <Select value={form.ally_id} onValueChange={v => setForm(f => ({ ...f, ally_id: v }))}>
                        <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Select ally" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {filteredAllies.map(a => <SelectItem key={a.id} value={a.id}>{a.name} {a.ein ? `(${a.ein})` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="#" className="h-8 text-xs w-16" /></TableCell>
                  <TableCell><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="h-8 text-xs" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleAdd} disabled={createExpense.isPending}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={resetForm}>✕</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {expenses.map(exp =>
                editingId === exp.id ? renderEditableRow(exp) : (
                  <TableRow key={exp.id} className="group cursor-pointer hover:bg-accent/5" onDoubleClick={() => startEdit(exp)}>
                    <TableCell><span className="text-xs">{exp.expense_type?.name ?? "—"}</span></TableCell>
                    <TableCell className={`text-right font-mono text-sm ${exp.amount < 0 ? "text-destructive font-bold" : ""}`}>
                      ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">{exp.expense_date}</TableCell>
                    <TableCell className="text-xs">{exp.ally?.name || exp.vendor?.name || exp.sub?.name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{exp.reference_number || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{exp.notes || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(exp)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(exp)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}

              {expenses.length === 0 && !adding && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                    No entries yet. Click + Add to etch your first entry.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Hook to get totals by category from job_expenses */
export function useCategoryExpenseTotals(jobId: string) {
  const { data: allExpenses = [] } = useJobExpenses(jobId);
  const { data: allExpenseTypes = [] } = useExpenseTypes();

  return useMemo(() => {
    const secureCategories = new Set(["Materials", "Labor", "Miscellaneous", "Permits", "Fees", "Inventory", "Payroll", "Refund"]);
    const companyCategories = new Set(["Company"]);
    const bonusCategories = new Set(["Bonus"]);

    let secureTotal = 0, companyTotal = 0, bonusTotal = 0;

    allExpenses.forEach(e => {
      const et = allExpenseTypes.find(t => t.id === e.expense_type_id);
      if (!et) return;
      if (secureCategories.has(et.category)) secureTotal += e.amount;
      else if (companyCategories.has(et.category)) companyTotal += e.amount;
      else if (bonusCategories.has(et.category)) bonusTotal += e.amount;
    });

    return { secureTotal, companyTotal, bonusTotal };
  }, [allExpenses, allExpenseTypes]);
}
