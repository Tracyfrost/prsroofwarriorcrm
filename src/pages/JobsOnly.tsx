// MOBILE-PORT: maps to React Native FlatList with card layout
import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useJobs } from "@/hooks/useJobs";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useJobAssignments } from "@/hooks/useJobs";
import { TradesBadges } from "@/components/job/TradesBadges";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Columns3, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { format } from "date-fns";

type ColumnDef = {
  key: string;
  label: string;
  defaultVisible: boolean;
};

const ALL_COLUMNS: ColumnDef[] = [
  { key: "job_id", label: "Job ID", defaultVisible: true },
  { key: "trades", label: "Trades", defaultVisible: true },
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "primary_rep", label: "Primary Rep", defaultVisible: true },
  { key: "claim_number", label: "Claim #", defaultVisible: true },
  { key: "acv", label: "ACV", defaultVisible: true },
  { key: "rcv", label: "RCV", defaultVisible: false },
  { key: "created_at", label: "Created", defaultVisible: true },
  { key: "notes", label: "Notes", defaultVisible: false },
];

const STORAGE_KEY = "jobs-only-columns";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  inspected: "bg-accent/20 text-accent-foreground",
  approved: "bg-success/20 text-success-foreground",
  scheduled: "bg-primary/20 text-primary-foreground",
  completed: "bg-success/30 text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};

function loadColumns(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
}

export default function JobsOnly() {
  const { data: jobs = [], isLoading } = useJobs();
  const { data: allProfiles = [] } = useAllProfiles();
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<string[]>(loadColumns);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [tempCols, setTempCols] = useState<string[]>(visibleCols);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  const profileMap = useMemo(() => new Map(allProfiles.map(p => [p.user_id, p])), [allProfiles]);

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(j =>
      j.job_id.toLowerCase().includes(q) ||
      (j.customers?.name ?? "").toLowerCase().includes(q) ||
      (j as any).claim_number?.toLowerCase().includes(q) ||
      j.trade_types?.some(t => t.toLowerCase().includes(q))
    );
  }, [jobs, search]);

  const toggleCol = (key: string) => {
    setTempCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const saveColumns = () => {
    setVisibleCols(tempCols);
    setColModalOpen(false);
  };

  const resetColumns = () => {
    setTempCols(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  };

  const getPrimaryRep = (j: any) => {
    const repId = j.sales_rep_id;
    if (!repId) return "—";
    const profile = profileMap.get(repId);
    return profile?.name || profile?.email || "—";
  };

  const renderCell = (j: any, key: string) => {
    switch (key) {
      case "job_id":
        return (
          <Link to={`/operations/${j.id}`} className="font-mono font-medium text-primary hover:underline text-sm">
            {j.job_id}
            {j.parent_job_id && <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Sub</Badge>}
          </Link>
        );
      case "trades":
        return <TradesBadges trades={j.trade_types ?? []} size="xs" />;
      case "customer":
        return <span className="text-sm">{j.customers?.name ?? "—"}</span>;
      case "status":
        return <Badge className={`${STATUS_COLORS[j.status] ?? ""} text-xs capitalize`}>{j.status}</Badge>;
      case "primary_rep":
        return <span className="text-sm text-muted-foreground">{getPrimaryRep(j)}</span>;
      case "acv":
        return <span className="font-mono text-sm">{(j.financials as any)?.acv > 0 ? `$${(j.financials as any).acv.toLocaleString()}` : "—"}</span>;
      case "rcv":
        return <span className="font-mono text-sm">{(j.financials as any)?.rcv > 0 ? `$${(j.financials as any).rcv.toLocaleString()}` : "—"}</span>;
      case "claim_number":
        return <span className="font-mono text-xs text-muted-foreground">{j.claim_number || "—"}</span>;
      case "created_at":
        return <span className="text-xs text-muted-foreground">{format(new Date(j.created_at), "MM/dd/yyyy")}</span>;
      case "notes":
        return <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{j.notes || "—"}</span>;
      default:
        return "—";
    }
  };

  const activeCols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
  const isRightAlign = (key: string) => key === "acv" || key === "rcv";

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">⚔ Jobs Only — Command View</h1>
            <p className="text-sm text-muted-foreground">{jobs.length} total missions · Customizable columns</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => { setColModalOpen(true); setTempCols(visibleCols); }}>
            <Columns3 className="mr-1.5 h-3.5 w-3.5" /> Command Columns
          </Button>
        </div>

        <ResponsiveModal open={colModalOpen} onOpenChange={setColModalOpen} title="Customize Columns" className="max-w-sm">
          <div className="space-y-2 py-2">
            {ALL_COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer min-h-[44px]">
                <Checkbox
                  checked={tempCols.includes(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0" onClick={resetColumns}>
              <RotateCcw className="mr-1 h-3 w-3" /> Warrior Default
            </Button>
            <Button size="sm" className="flex-1 min-h-[44px] sm:min-h-0" onClick={saveColumns}>Save Layout</Button>
          </div>
        </ResponsiveModal>

        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs, trades, customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="shadow-card hidden sm:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeCols.map(col => (
                          <TableHead key={col.key} className={isRightAlign(col.key) ? "text-right" : ""}>
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(j => (
                        <TableRow key={j.id} className="hover:bg-muted/40">
                          {activeCols.map(col => (
                            <TableCell key={col.key} className={isRightAlign(col.key) ? "text-right" : ""}>
                              {renderCell(j, col.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={activeCols.length} className="text-center py-10 text-muted-foreground">
                            No jobs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Mobile card list */}
            <div className="space-y-2 sm:hidden">
              {filtered.map(j => (
                <Link key={j.id} to={`/operations/${j.id}`}>
                  <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-mono text-sm font-medium text-primary">{j.job_id}</span>
                        <Badge className={`${STATUS_COLORS[j.status] ?? ""} text-[10px] capitalize`}>{j.status}</Badge>
                      </div>
                      <TradesBadges trades={j.trade_types ?? []} size="xs" />
                      <p className="text-sm font-medium text-foreground mt-1">{j.customers?.name ?? "—"}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{getPrimaryRep(j)}</span>
                        {(j.financials as any)?.acv > 0 && (
                          <span className="text-xs font-mono text-muted-foreground">ACV: ${(j.financials as any).acv.toLocaleString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {filtered.length === 0 && (
                <p className="text-center py-10 text-muted-foreground">No jobs found</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
