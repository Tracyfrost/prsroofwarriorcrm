import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useArchivedCustomers } from "@/hooks/useCustomer";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { Customer } from "@/hooks/useCustomer";

export default function ArchivedCustomers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: archived = [], isLoading } = useArchivedCustomers();

  const restoreCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .update({ archived_at: null, archived_by: null, archive_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer restored" });
    },
    onError: (e: Error) => toast({ title: "Restore failed", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return archived;
    return archived.filter((c: Customer) =>
      c.name?.toLowerCase().includes(q) ||
      c.customer_number?.toLowerCase().includes(q) ||
      c.archive_reason?.toLowerCase().includes(q),
    );
  }, [archived, search]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Settings
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Archived Customers</h1>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived customers..."
            className="max-w-sm"
          />
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{filtered.length} archived customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No archived customers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Archived</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c: Customer) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.customer_number}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.archived_at ? new Date(c.archived_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.archive_reason || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/customers/${c.id}?archived=1`)}>
                              View
                            </Button>
                            <Button size="sm" onClick={() => restoreCustomer.mutate(c.id)} disabled={restoreCustomer.isPending}>
                              Restore
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
