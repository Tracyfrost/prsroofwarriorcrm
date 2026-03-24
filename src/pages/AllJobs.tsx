import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  inspected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  scheduled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AllJobs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["all-jobs-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let result = jobs;
    if (statusFilter !== "all") result = result.filter((j: any) => j.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((j: any) =>
        j.job_id?.toLowerCase().includes(q) ||
        j.customers?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j: any) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return counts;
  }, [jobs]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">All Jobs</h1>
            <p className="text-sm text-muted-foreground">{jobs.length} total jobs</p>
          </div>
        </div>

        {/* Status summary chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border cursor-pointer ${
                statusFilter === status ? "ring-2 ring-accent ring-offset-1" : ""
              } ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}
            >
              <span className="capitalize">{status}</span>
              <span className="font-bold">{count}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Job ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Trades</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">ACV</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j: any) => (
                      <tr key={j.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/jobs/${j.id}`} className="font-medium text-foreground hover:text-accent transition-colors">{j.job_id}</Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.customers?.name || "—"}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge className={`text-xs capitalize ${STATUS_COLORS[j.status] || ""}`}>{j.status}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {(j.trade_types || []).slice(0, 2).map((t: string) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                            {(j.trade_types || []).length > 2 && (
                              <Badge variant="outline" className="text-[10px]">+{j.trade_types.length - 2}</Badge>
                            )}
                          </div>
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
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No jobs found</td></tr>
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
