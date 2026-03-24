import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/PageWrapper";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, DollarSign, Briefcase, ChevronRight, Shield } from "lucide-react";
import { useProfile, useUserRoles } from "@/hooks/useProfile";
import { useMyProfile } from "@/hooks/useHierarchy";
import { LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

function StatCard({ title, value, icon: Icon, trend, to }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  to?: string;
}) {
  const content = (
    <Card className="shadow-card hover:shadow-card-hover transition-all group cursor-pointer border hover:border-accent/40">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {trend && <p className="mt-1 text-xs font-medium text-success">{trend}</p>}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
            <Icon className="h-6 w-6 text-accent" />
          </div>
        </div>
        {to && (
          <div className="mt-3 flex items-center text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

export default function Index() {
  const { data: profile } = useProfile();
  const { data: myProfile } = useMyProfile();
  const { data: myRoles = [] } = useUserRoles();
  const { companyName } = useWhiteLabelDefaults();
  const isAdmin = myRoles.some((r) => ["manager", "owner", "office_admin"].includes(r));
  const levelConfig = LEVEL_CONFIG[myProfile?.level ?? "lvl1"] || LEVEL_CONFIG.lvl1;

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["customer-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: jobStats } = useQuery({
    queryKey: ["job-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("status, financials");
      if (error) throw error;
      const jobs = data ?? [];
      const active = jobs.filter((j) => !["completed", "closed"].includes(j.status)).length;
      const totalAcv = jobs.reduce((sum, j) => sum + ((j.financials as any)?.acv ?? 0), 0);
      return { total: jobs.length, active, totalAcv };
    },
  });

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ["recent-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  usePageTitle("Dashboard");

  return (
    <AppLayout>
      <PageWrapper>
        {/* Hero Banner */}
        <div className="mb-8 rounded-xl gradient-command p-6 text-white relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <KnotShieldLogo size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <KnotShieldLogo size={40} />
              <div>
                <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
                  {companyName} — Command Center
                </h1>
                <p className="text-sm text-white/70">
                  {profile?.name ? `Welcome back, ${profile.name}.` : "Welcome back."}{" "}
                  {isAdmin ? "Execute the plan. Lead the mission." : "Secure every opportunity. Dominate the field."}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-white/30 text-white/80 mt-1">
              {levelConfig.badge} {levelConfig.label}
            </Badge>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Contacts" value={String(customerCount)} icon={Users} to="/dashboard/customers-overview" />
          <StatCard title="Active Ops" value={String(jobStats?.active ?? 0)} icon={Briefcase} to="/dashboard/active-jobs" />
          <StatCard title="Total Operations" value={String(jobStats?.total ?? 0)} icon={TrendingUp} to="/dashboard/all-jobs" />
          <StatCard title="Total ACV" value={`$${(jobStats?.totalAcv ?? 0).toLocaleString()}`} icon={DollarSign} to="/dashboard/acv-financials" />
        </div>

        {/* Recent contacts */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display uppercase tracking-wide">Recent Contacts</CardTitle>
            <Link to="/dashboard/customers-overview" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No contacts yet. Secure your first lead to begin operations.
              </p>
            ) : (
              <div className="space-y-2">
                {recentCustomers.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/customers/${c.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 hover:border-accent/30 transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.main_address?.city ? `${c.main_address.city}, ${c.main_address.state}` : "No address"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageWrapper>
    </AppLayout>
  );
}
