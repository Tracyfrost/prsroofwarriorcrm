import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, DollarSign, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  usePaymentChecks, useCreatePaymentCheck, useUpdatePaymentCheck,
  useDeletePaymentCheck, useCheckHistory, CHECK_TYPES, CHECK_STATUSES,
  type PaymentCheck,
} from "@/hooks/usePaymentChecks";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CHECK_COLORS: Record<string, string> = {
  ACV: "hsl(var(--primary))",
  "2nd_ACV": "hsl(var(--accent))",
  Depreciation: "hsl(var(--warning, 45 93% 47%))",
  Final: "hsl(var(--success, 142 76% 36%))",
  Supplement: "hsl(var(--secondary))",
  Other: "hsl(var(--muted-foreground))",
};

interface Props {
  jobId: string;
}

export function ChecksTab({ jobId }: Props) {
  const { data: checks = [], isLoading } = usePaymentChecks(jobId);
  const createCheck = useCreatePaymentCheck();
  const updateCheck = useUpdatePaymentCheck();
  const deleteCheck = useDeletePaymentCheck();
  const { toast } = useToast();
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  const handleAdd = async () => {
    try {
      await createCheck.mutateAsync({
        job_id: jobId,
        type: "ACV",
        amount: 0,
        notes: "",
        status: "Received",
      });
      toast({ title: "Check added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (check: PaymentCheck, field: string, value: any) => {
    try {
      await updateCheck.mutateAsync({ id: check.id, jobId, [field]: value });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCheck.mutateAsync({ id, jobId });
      toast({ title: "Check removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const totalAmount = checks.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const chartData = CHECK_TYPES.map((t) => ({
    name: t.replace("_", " "),
    amount: checks.filter((c) => c.type === t).reduce((s, c) => s + (Number(c.amount) || 0), 0),
    type: t,
  })).filter((d) => d.amount > 0);

  return (
    <div className="min-w-0 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Checks</p>
            <p className="text-xl font-bold text-foreground">{checks.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold text-foreground">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        {chartData.length > 0 && (
          <Card className="shadow-card col-span-2 lg:col-span-1">
            <CardContent className="p-4 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="amount">
                    {chartData.map((entry) => (
                      <Cell key={entry.type} fill={CHECK_COLORS[entry.type] || CHECK_COLORS.Other} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checks table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Payment Checks ({checks.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAdd} disabled={createCheck.isPending}>
            <Plus className="mr-1 h-3 w-3" /> Add Check
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                    {isLoading ? "Loading..." : "No checks recorded"}
                  </TableCell>
                </TableRow>
              ) : checks.map((check) => (
                <>
                  <TableRow key={check.id}>
                    <TableCell>
                      <Select value={check.type} onValueChange={(v) => handleUpdate(check, "type", v)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHECK_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={check.status} onValueChange={(v) => handleUpdate(check, "status", v)}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHECK_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={check.date_received ? format(new Date(check.date_received), "yyyy-MM-dd") : ""}
                        onChange={(e) => handleUpdate(check, "date_received", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="h-8 text-xs w-36"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={check.amount}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (val !== Number(check.amount)) handleUpdate(check, "amount", val);
                        }}
                        className="h-8 text-xs w-28 font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={check.notes ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (check.notes ?? "")) handleUpdate(check, "notes", e.target.value);
                        }}
                        className="h-8 text-xs" placeholder="Notes..."
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          onClick={() => setExpandedCheckId(expandedCheckId === check.id ? null : check.id)}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(check.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCheckId === check.id && (
                    <TableRow key={`${check.id}-history`}>
                      <TableCell colSpan={6} className="p-0">
                        <CheckHistoryPanel checkId={check.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckHistoryPanel({ checkId }: { checkId: string }) {
  const { data: history = [], isLoading } = useCheckHistory(checkId);

  if (isLoading) return <div className="p-3 text-xs text-muted-foreground">Loading history...</div>;
  if (history.length === 0) return <div className="p-3 text-xs text-muted-foreground">No changes recorded</div>;

  return (
    <div className="bg-muted/30 p-3 border-t">
      <p className="text-xs font-medium text-muted-foreground mb-2">Change History</p>
      <div className="space-y-1.5">
        {history.map((h) => (
          <div key={h.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{format(new Date(h.changed_at), "MMM d, h:mm a")}</span>
            <Badge variant="outline" className="text-[9px] px-1">{h.field_changed}</Badge>
            <span className="text-muted-foreground">{h.old_value ?? "—"}</span>
            <span>→</span>
            <span className="font-medium text-foreground">{h.new_value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
