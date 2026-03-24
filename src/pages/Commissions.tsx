import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { AppLayout } from "@/components/AppLayout";
import { useCommissions, useUpdateCommissionStatus, type Commission } from "@/hooks/useCommissions";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, CheckCircle, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Commissions() {
  const { user } = useAuth();
  const { data: commissions = [], isLoading } = useCommissions();
  const updateStatus = useUpdateCommissionStatus();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = commissions.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const isOverride = (c as any).override_amount > 0 && c.amount === 0;
    const matchType =
      typeFilter === "all" ||
      (typeFilter === "override" && isOverride) ||
      (typeFilter === "base" && !isOverride);
    return matchStatus && matchType;
  });

  const totalEarned = commissions.filter((c) => c.status === "earned").reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const totalAll = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalOverrides = commissions.reduce((sum, c) => sum + ((c as any).override_amount ?? 0), 0);

  const handleStatusToggle = async (id: string, current: string) => {
    const newStatus = current === "earned" ? "paid" : "earned";
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast({ title: `Commission marked as ${newStatus}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Conquest Rewards — War Chest</h1>
          <p className="text-muted-foreground text-sm">Claim your victories · Track earned spoils & command overrides</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Base</p>
                  <p className="text-2xl font-bold text-foreground">${totalAll.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-accent/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overrides</p>
                  <p className="text-2xl font-bold text-foreground">${totalOverrides.toLocaleString()}</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Earned</p>
                  <p className="text-2xl font-bold text-foreground">${totalEarned.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-warning/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="override">Override</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No commissions found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const isOverride = (c as any).override_amount > 0 && c.amount === 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.jobs?.job_id ?? "—"}</TableCell>
                        <TableCell className="text-sm">{c.jobs?.customers?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={isOverride ? "secondary" : "outline"} className="text-[10px]">
                            {isOverride ? "Override" : "Base"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {c.amount > 0 ? `$${c.amount.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-accent">
                          {(c as any).override_amount > 0 ? `$${(c as any).override_amount.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={c.status === "paid" ? "bg-success/20 text-success-foreground" : "bg-warning/20 text-warning-foreground"}>
                            {c.status === "paid" ? "Paid" : "Earned"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusToggle(c.id, c.status)}
                            disabled={updateStatus.isPending}
                          >
                            {c.status === "earned" ? "Mark Paid" : "Mark Earned"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageWrapper>
    </AppLayout>
  );
}
