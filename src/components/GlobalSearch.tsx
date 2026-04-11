import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Briefcase, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mergeGlobalSearchJobRows, type GlobalSearchJobRow } from "@/lib/globalSearchJobs";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type CustomerSearchRow = {
  id: string;
  name: string;
  customer_number: string;
  match_hint: string | null;
};

const GLOBAL_SEARCH_EMPTY: {
  customers: CustomerSearchRow[];
  jobs: GlobalSearchJobRow[];
} = { customers: [], jobs: [] };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  const {
    data: results = GLOBAL_SEARCH_EMPTY,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`;
      const jobSelect = "id, job_id, claim_number, status" as const;
      const [custRes, jobIdRes, claimRes] = await Promise.all([
        supabase.rpc("search_customers_global", {
          search_query: debouncedQuery,
          result_limit: 20,
        }),
        supabase
          .from("jobs")
          .select(jobSelect)
          .ilike("job_id", pattern)
          .is("deleted_at", null)
          .limit(10),
        supabase
          .from("jobs")
          .select(jobSelect)
          .ilike("claim_number", pattern)
          .is("deleted_at", null)
          .limit(10),
      ]);
      if (custRes.error) throw custRes.error;
      if (jobIdRes.error) throw jobIdRes.error;
      if (claimRes.error) throw claimRes.error;

      const jobs = mergeGlobalSearchJobRows(
        (jobIdRes.data ?? []) as GlobalSearchJobRow[],
        (claimRes.data ?? []) as GlobalSearchJobRow[],
        10
      );

      return {
        customers: (custRes.data ?? []) as CustomerSearchRow[],
        jobs,
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative w-full min-w-0 max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search name, phone, address, claim #…"
        className="pl-9 pr-8 h-9 text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="z-50 flex max-h-[min(50vh,24rem)] flex-col overflow-hidden rounded-lg border border-border bg-popover shadow-lg max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-[calc(env(safe-area-inset-top,0px)+3.5rem+1px)] max-sm:mt-0 max-sm:max-h-[min(75vh,calc(100dvh-env(safe-area-inset-top,0px)-4.5rem-env(safe-area-inset-bottom,0px)))] sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-1">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isError ? (
                <p className="px-3 py-4 text-sm text-destructive text-center">
                  {error instanceof Error
                    ? error.message
                    : typeof error === "object" && error && "message" in error
                      ? String((error as { message: unknown }).message)
                      : "Search failed. Try again."}
                </p>
              ) : (
                <>
                  {isFetching ? (
                    <p className="sticky top-0 z-10 px-3 py-2 text-xs text-muted-foreground bg-muted/40 border-b border-border">
                      Searching…
                    </p>
                  ) : null}
                  {!hasResults && !isFetching ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches found</p>
                  ) : null}
                </>
              )}
              {!isError && results.customers.length > 0 && (
                <div>
                  <p className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Roster — Customers
                  </p>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(`/customers/${c.id}`)}
                      className="flex min-h-11 w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 sm:min-h-[44px] sm:flex-row sm:items-start sm:gap-2"
                    >
                      <div className="flex min-w-0 w-full items-start gap-2 sm:flex-1 sm:min-w-0">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="block font-medium leading-snug text-foreground [overflow-wrap:anywhere] max-sm:whitespace-normal sm:truncate">
                            {c.name}
                          </span>
                          {c.match_hint ? (
                            <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground line-clamp-2 sm:block">
                              {c.match_hint}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="hidden shrink-0 self-start text-xs font-mono tabular-nums text-muted-foreground sm:block">
                        {c.customer_number}
                      </span>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 pl-[1.375rem] text-xs text-muted-foreground sm:hidden">
                        {c.match_hint ? <span className="min-w-0 leading-snug">{c.match_hint}</span> : null}
                        <span className="shrink-0 font-mono tabular-nums">{c.customer_number}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!isError && results.jobs.length > 0 && (
                <div>
                  <p className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Operations — Jobs
                  </p>
                  {results.jobs.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handleSelect(`/operations/${j.id}`)}
                      className="flex min-h-11 w-full flex-col items-stretch gap-1 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 sm:min-h-[44px] sm:flex-row sm:items-center sm:gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:min-w-0 sm:flex-1">
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 font-medium font-mono [overflow-wrap:anywhere] max-sm:whitespace-normal sm:truncate">
                          {j.job_id}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[1.375rem] text-xs text-muted-foreground sm:ml-auto sm:shrink-0 sm:flex-nowrap sm:pl-0 sm:justify-end">
                        {j.claim_number ? <span>Claim# {j.claim_number}</span> : null}
                        <span className="capitalize">{j.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-border bg-muted/30 px-3 py-2">
              <Link
                to={`/customers?search=${encodeURIComponent(debouncedQuery)}`}
                className="text-xs font-medium text-accent hover:underline"
                onClick={() => setOpen(false)}
              >
                Open Warrior Roster with this search
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
