import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/PageWrapper";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  DollarSign,
  Briefcase,
  UserPlus,
  Calendar,
  CalendarPlus,
  Hammer,
  Phone,
  Plus,
  LayoutGrid,
  BarChart3,
  BookUser,
  Camera,
  ImagePlus,
} from "lucide-react";
import { useProfile, useUserRoles } from "@/hooks/useProfile";
import { useMyProfile } from "@/hooks/useHierarchy";
import { LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AddCustomerModal } from "@/components/customer/AddCustomerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function StatCard({ title, value, icon: Icon, trend, to }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  to?: string;
}) {
  const tileClass = "size-[5.75rem] shrink-0";
  const a11yLabel = trend ? `${title}. ${value}. ${trend}` : `${title}. ${value}.`;
  const inner = (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition-all hover:border-accent/40 hover:bg-muted/50 group ${to ? "cursor-pointer" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="w-full min-w-0 text-[10px] font-medium leading-tight text-muted-foreground line-clamp-2 sm:text-xs">
        {title}
      </p>
      <p className="w-full min-w-0 text-sm font-bold tabular-nums leading-none text-foreground line-clamp-1">
        {value}
      </p>
      {trend ? (
        <p className="w-full min-w-0 text-[9px] font-medium leading-tight text-success line-clamp-1">{trend}</p>
      ) : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`block ${tileClass}`} aria-label={a11yLabel}>
        {inner}
      </Link>
    );
  }
  return <div className={tileClass}>{inner}</div>;
}

function LaunchAction({
  icon: Icon,
  title,
  description,
  onClick,
  to,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick?: () => void;
  to?: string;
}) {
  const a11yLabel = `${title}. ${description}`;
  const tileClass = "size-[5.75rem] shrink-0";
  const inner = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-all hover:border-accent/40 hover:bg-muted/50 group">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="w-full min-w-0 text-xs font-semibold leading-tight text-foreground line-clamp-2">
        {title}
      </p>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className={`block ${tileClass}`} title={description} aria-label={a11yLabel}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block ${tileClass} text-center`}
      title={description}
      aria-label={a11yLabel}
    >
      {inner}
    </button>
  );
}

export default function Index() {
  const { data: profile } = useProfile();
  const { data: myProfile } = useMyProfile();
  const { data: myRoles = [] } = useUserRoles();
  const { can } = usePermissions();
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
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
      <PageWrapper className="pb-24">
        {/* Mission launch — quick actions + FAB */}
        <Card className="mb-8 shadow-card border-accent/20">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base font-display uppercase tracking-wide flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-accent" />
                  Mission launch
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  {profile?.name ? `Welcome back, ${profile.name}.` : "Welcome back."}{" "}
                  {isAdmin ? "Execute the plan. Lead the mission." : "Secure every opportunity. Dominate the field."}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {levelConfig.badge} {levelConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-2">
              Add contacts, manage leads, schedule deployments, and view install calendars from one place.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid justify-items-start gap-2 [grid-template-columns:repeat(auto-fill,minmax(5.75rem,5.75rem))]">
              {can("add_customer") ? (
                <LaunchAction
                  icon={UserPlus}
                  title="Add contact"
                  description="Create a new lead or customer record."
                  onClick={() => setAddCustomerOpen(true)}
                />
              ) : (
                <LaunchAction
                  icon={Users}
                  title="Customers"
                  description="Browse contacts and records."
                  to="/customers"
                />
              )}
              {can("view_reports") && (
                <LaunchAction
                  icon={Phone}
                  title="Lead Command"
                  description="Lead intake, sources, and distribution."
                  to="/lead-arsenal"
                />
              )}
              {can("add_appointment") && (
                <LaunchAction
                  icon={CalendarPlus}
                  title="Schedule deployment"
                  description="Open the calendar with a new appointment."
                  to="/appointments?new=1"
                />
              )}
              <LaunchAction
                icon={Calendar}
                title="Deployment calendar"
                description="View and drag appointments on the calendar."
                to="/appointments"
              />
              {can("view_production") && (
                <LaunchAction
                  icon={Hammer}
                  title="Install schedule"
                  description="Production board, trades, and scheduled installs."
                  to="/production"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <AddCustomerModal open={addCustomerOpen} onOpenChange={setAddCustomerOpen} />

        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:bottom-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-label="Quick actions menu"
              >
                <Plus className="h-7 w-7" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-56">
              <DropdownMenuLabel>Create / run</DropdownMenuLabel>
              {can("add_customer") && (
                <DropdownMenuItem onSelect={() => setAddCustomerOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add contact
                </DropdownMenuItem>
              )}
              {can("view_reports") && (
                <DropdownMenuItem asChild>
                  <Link to="/lead-arsenal">
                    <Phone className="mr-2 h-4 w-4" />
                    Lead Command
                  </Link>
                </DropdownMenuItem>
              )}
              {can("add_appointment") && (
                <DropdownMenuItem asChild>
                  <Link to="/appointments?new=1">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    New appointment
                  </Link>
                </DropdownMenuItem>
              )}
              {can("view_sitecam") && (
                <DropdownMenuItem asChild>
                  <Link to="/sitecam/capture">
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Create photo
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Go to</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/customers">
                  <Users className="mr-2 h-4 w-4" />
                  Customers
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/appointments">
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </Link>
              </DropdownMenuItem>
              {can("view_production") && (
                <DropdownMenuItem asChild>
                  <Link to="/production">
                    <Hammer className="mr-2 h-4 w-4" />
                    Production / installs
                  </Link>
                </DropdownMenuItem>
              )}
              {can("view_sitecam") && (
                <DropdownMenuItem asChild>
                  <Link to="/sitecam">
                    <Camera className="mr-2 h-4 w-4" />
                    SiteCam
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/dashboard/customers-overview">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Contacts overview
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Command readout — stats */}
        <Card className="mb-8 shadow-card border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display uppercase tracking-wide flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Command readout
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Contacts, active work, pipeline volume, and ACV at a glance. Tap a tile for details.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid justify-items-start gap-2 [grid-template-columns:repeat(auto-fill,minmax(5.75rem,5.75rem))]">
              <StatCard title="Total Contacts" value={String(customerCount)} icon={Users} to="/dashboard/customers-overview" />
              <StatCard title="Active Ops" value={String(jobStats?.active ?? 0)} icon={Briefcase} to="/dashboard/active-jobs" />
              <StatCard title="Total Operations" value={String(jobStats?.total ?? 0)} icon={TrendingUp} to="/dashboard/all-jobs" />
              <StatCard title="Total ACV" value={`$${(jobStats?.totalAcv ?? 0).toLocaleString()}`} icon={DollarSign} to="/dashboard/acv-financials" />
            </div>
          </CardContent>
        </Card>

        {/* Recent contacts */}
        <Card className="shadow-card border-accent/20">
          <CardHeader className="space-y-1 p-3 pb-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <BookUser className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <CardTitle className="text-base font-display uppercase tracking-wide">
                Recent contacts
              </CardTitle>
              <Link
                to="/dashboard/customers-overview"
                className="text-xs text-accent hover:underline shrink-0"
              >
                View all →
              </Link>
            </div>
            <p className="w-full text-xs text-muted-foreground font-normal">
              Newest contacts added to your roster.
            </p>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No contacts yet. Secure your first lead to begin operations.
              </p>
            ) : (
              <div className="space-y-1">
                {recentCustomers.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/customers/${c.id}`}
                    className="group flex min-h-0 w-full min-w-0 flex-row items-center gap-1.5 rounded-xl border px-2 py-1 transition-all hover:border-accent/40 hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="min-w-0 w-max max-w-[calc(100%-4.5rem)] space-y-0">
                      <p className="text-sm font-medium leading-tight text-foreground group-hover:text-accent transition-colors truncate">
                        {c.name}
                      </p>
                      <p className="text-xs leading-tight text-muted-foreground truncate">
                        {c.main_address?.city ? `${c.main_address.city}, ${c.main_address.state}` : "No address"}
                      </p>
                    </div>
                    <p className="shrink-0 self-center text-xs leading-none text-muted-foreground whitespace-nowrap tabular-nums">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
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
