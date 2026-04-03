import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  inspected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  scheduled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function ActiveJobs() {
  const [search, setSearch] = useState("");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["active-jobs-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name)")
        .not("status", "in", '("completed","closed")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j: any) =>
      j.job_id?.toLowerCase().includes(q) ||
      j.customers?.name?.toLowerCase().includes(q) ||
      j.status?.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">Active Operations</h1>
            <p className="text-sm text-muted-foreground">Missions in progress · {jobs.length} active</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Job ID, customer, status..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="outline">{filtered.length} results</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">ACV</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j: any) => (
                      <tr key={j.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/operations/${j.id}`} className="font-medium text-foreground hover:text-accent transition-colors">{j.job_id}</Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.customers?.name || "—"}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge className={`text-xs capitalize ${STATUS_COLORS[j.status] || ""}`}>{j.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">
                          ${((j.financials as any)?.acv ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {new Date(j.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active jobs found</td></tr>
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
