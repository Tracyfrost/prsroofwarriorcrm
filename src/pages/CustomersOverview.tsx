import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";

export default function CustomersOverview() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["all-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobCounts = {} } = useQuery({
    queryKey: ["customer-job-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("customer_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((j) => { counts[j.customer_id] = (counts[j.customer_id] || 0) + 1; });
      return counts;
    },
  });

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.main_address?.city?.toLowerCase().includes(q) ||
      c.insurance_carrier?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers Overview</h1>
            <p className="text-sm text-muted-foreground">All customers · {customers.length} total</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, or carrier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline">{filtered.length} results</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Location</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Insurance</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Jobs</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/customers/${c.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {c.main_address?.city ? `${c.main_address.city}, ${c.main_address.state}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {c.insurance_carrier || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{jobCounts[c.id] || 0}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No customers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
