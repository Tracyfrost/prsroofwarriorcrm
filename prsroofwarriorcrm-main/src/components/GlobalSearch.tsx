import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Briefcase, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = { customers: [], jobs: [] } } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const q = `%${debouncedQuery}%`;
      const [custRes, jobRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, customer_number")
          .or(`name.ilike.${q},customer_number.ilike.${q}`)
          .limit(5),
        supabase
          .from("jobs")
          .select("id, job_id, claim_number, status")
          .or(`job_id.ilike.${q},claim_number.ilike.${q}`)
          .is("deleted_at", null)
          .limit(5),
      ]);
      return {
        customers: custRes.data ?? [],
        jobs: jobRes.data ?? [],
      };
    },
  });

  const hasResults = results.customers.length > 0 || results.jobs.length > 0;
  const showDropdown = open && debouncedQuery.length >= 2;

  const handleSelect = useCallback((path: string) => {
    setQuery("");
    setOpen(false);
    navigate(path);
  }, [navigate]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search operations & roster..."
        className="pl-9 pr-8 h-9 text-sm"
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {!hasResults && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches found</p>
            )}
            {results.customers.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                  Roster — Customers
                </p>
                {results.customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/customers/${c.id}`)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors"
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{c.customer_number}</span>
                  </button>
                ))}
              </div>
            )}
            {results.jobs.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                  Operations — Jobs
                </p>
                {results.jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => handleSelect(`/jobs/${j.id}`)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium font-mono">{j.job_id}</span>
                    {j.claim_number && <span className="text-xs text-muted-foreground">Claim# {j.claim_number}</span>}
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{j.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
