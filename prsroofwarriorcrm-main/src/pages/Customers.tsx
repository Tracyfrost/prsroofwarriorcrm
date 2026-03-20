import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, Mail, X, Briefcase, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { BattleTooltip } from "@/components/BattleTooltip";
import { AddressLink } from "@/components/AddressLink";
import { Badge } from "@/components/ui/badge";
import { useCustomerJobCounts } from "@/hooks/useCustomer";
import { useLeadSources } from "@/hooks/useCustomizations";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddCustomerModal } from "@/components/customer/AddCustomerModal";
import { CustomerSearchBar } from "@/components/customer/CustomerSearchBar";
import { CustomerCardList } from "@/components/customer/CustomerCardList";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageTitle } from "@/hooks/usePageTitle";

// MOBILE-PORT: Maps to React Native FlatList (mobile) / Table (tablet+)

export default function Customers() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState("");
  const navigate = useNavigate();
  const { data: jobCounts = {} } = useCustomerJobCounts();
  const { data: leadSources = [] } = useLeadSources();
  const { can } = usePermissions();
  const isMobile = useIsMobile();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const getPhones = (c: any): string[] => {
    const ci = c.contact_info as any;
    return (ci?.phones ?? []).map((p: any) => p.number).filter(Boolean);
  };
  const getEmails = (c: any): string[] => {
    const ci = c.contact_info as any;
    return (ci?.emails ?? []).map((e: any) => e.address).filter(Boolean);
  };

  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const states = new Set<string>();
    const carriers = new Set<string>();
    customers.forEach((c: any) => {
      const addr = c.main_address as any;
      if (addr?.city) cities.add(addr.city);
      if (addr?.state) states.add(addr.state);
      if (c.insurance_carrier) carriers.add(c.insurance_carrier);
    });
    return {
      cities: Array.from(cities).sort(),
      states: Array.from(states).sort(),
      carriers: Array.from(carriers).sort(),
    };
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter((c: any) => {
      const q = search.toLowerCase();
      const nj = c.name_json as any;
      const spouseName = nj?.spouse ? `${nj.spouse.first || ""} ${nj.spouse.last || ""}`.trim().toLowerCase() : "";
      const matchesSearch = !q ||
        c.name?.toLowerCase().includes(q) ||
        spouseName.includes(q) ||
        (c.customer_number || "").toLowerCase().includes(q) ||
        getEmails(c).some((e: string) => e.toLowerCase().includes(q)) ||
        getPhones(c).some((p: string) => p.includes(search)) ||
        (c.insurance_carrier || "").toLowerCase().includes(q) ||
        ((c.main_address as any)?.city || "").toLowerCase().includes(q) ||
        ((c.main_address as any)?.state || "").toLowerCase().includes(q) ||
        ((c.main_address as any)?.street || "").toLowerCase().includes(q) ||
        ((c.main_address as any)?.zip || "").includes(search);

      const addr = c.main_address as any;
      const matchesCity = !cityFilter || (addr?.city || "") === cityFilter;
      const matchesState = !stateFilter || (addr?.state || "") === stateFilter;
      const matchesInsurance = !insuranceFilter || (c.insurance_carrier || "") === insuranceFilter;

      return matchesSearch && matchesCity && matchesState && matchesInsurance;
    });
  }, [customers, search, cityFilter, stateFilter, insuranceFilter]);

  const activeFilterCount = [cityFilter, stateFilter, insuranceFilter].filter(Boolean).length;

  usePageTitle("Customers");

  return (
    <AppLayout>
      <PageWrapper>
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wide text-foreground">Warrior Roster</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">{customers.length} allies secured · Roster Intel</p>
          </div>
          <BattleTooltip phraseKey="create_customer">
            <Button onClick={() => setOpen(true)} className="min-h-[48px] sm:min-h-0 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Recruit Ally
            </Button>
          </BattleTooltip>
        </div>

        <AddCustomerModal open={open} onOpenChange={setOpen} />

        {/* Search & Filters */}
        <div className="mb-4 space-y-2 sticky top-0 z-10 bg-background pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:z-auto sm:pb-0">
          <CustomerSearchBar value={search} onChange={setSearch} />

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 min-h-[44px] sm:min-h-0">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{activeFilterCount}</Badge>
                )}
                {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 rounded-md border border-border/50 bg-muted/30 p-3">
                <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">City</Label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-10 sm:h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {filterOptions.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-[100px] flex-1 sm:flex-none">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">State</Label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="h-10 sm:h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {filterOptions.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Insurance</Label>
                  <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                    <SelectTrigger className="h-10 sm:h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {filterOptions.carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" className="text-xs h-10 sm:h-8" onClick={() => { setCityFilter(""); setStateFilter(""); setInsuranceFilter(""); }}>
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Mobile: Card list / Desktop: Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : isMobile ? (
          <CustomerCardList customers={filtered} jobCounts={jobCounts} leadSources={leadSources} />
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Lead Origin</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{search || activeFilterCount ? "No matches found" : "No customers yet"}</TableCell></TableRow>
                  ) : (
                    filtered.map((c: any) => {
                      const phones = getPhones(c);
                      const emails = getEmails(c);
                      const addr = c.main_address as any;
                      const leadSource = leadSources.find(ls => ls.name === c.lead_source);
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${c.id}`)}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{(c as any).customer_number || "—"}</TableCell>
                          <TableCell className="font-medium">
                            {c.name}
                            {(() => {
                              const nj = c.name_json as any;
                              const spouse = nj?.spouse;
                              return spouse?.first || spouse?.last ? (
                                <span className="text-xs text-muted-foreground ml-1.5">& {`${spouse.first || ""} ${spouse.last || ""}`.trim()}</span>
                              ) : null;
                            })()}
                          </TableCell>
                          <TableCell>
                            {leadSource ? (
                              <Badge style={{ backgroundColor: leadSource.color, color: '#fff' }} className="text-xs">
                                {leadSource.display_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {phones.map((p: string, i: number) => (
                                <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" /> {p}
                                </span>
                              ))}
                              {emails.map((e: string, i: number) => (
                                <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" /> {e}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {addr?.city ? <AddressLink address={addr} compact /> : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.insurance_carrier || "—"}</TableCell>
                          <TableCell>
                            {jobCounts[c.id] ? (
                              <Badge variant="secondary" className="text-[10px]">
                                <Briefcase className="h-3 w-3 mr-1" />{jobCounts[c.id]}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageWrapper>
    </AppLayout>
  );
}
