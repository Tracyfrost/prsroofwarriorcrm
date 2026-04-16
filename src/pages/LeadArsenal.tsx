// MOBILE-PORT: Maps to React Native TabView + FlatList screens
import { useState } from "react";
import { Swords, Package, Users, Settings2, TrendingUp, Target, Crosshair, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArsenalStats } from "@/hooks/useLeadArsenal";
import { usePermissions } from "@/hooks/usePermissions";
import { LeadPackagesTab } from "@/components/leads/LeadPackagesTab";
import { RepPerformanceTab } from "@/components/leads/RepPerformanceTab";
import { DistributionRulesTab } from "@/components/leads/DistributionRulesTab";
import { LeadSourcesGrid } from "@/components/leads/LeadSourcesGrid";
import { AppLayout } from "@/components/AppLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabListSidebarClassName,
  contextualTabTriggerClassName,
  contextualTabTriggerSidebarClassName,
} from "@/components/layout/contextualTabNav";

export default function LeadArsenal() {
  const [tab, setTab] = useState("dashboard");
  const stats = useArsenalStats();
  const { isOwnerOrAdmin } = usePermissions();
  usePageTitle("Lead Arsenal");

  const statCards = [
    { label: "Leads in Arsenal", value: stats.totalRemaining, icon: Target, color: "text-primary" },
    { label: "Assigned This Month", value: stats.assignedThisMonth, icon: Crosshair, color: "text-amber-500" },
    { label: "Contracts Forged", value: stats.converted, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Overall ROI", value: `${stats.roi.toFixed(1)}%`, icon: DollarSign, color: "text-cyan-400" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((s) => (
            <Card key={s.label} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <ContextualTabsPortal>
            <TabsList className={contextualTabListSidebarClassName()}>
              <TabsTrigger
                value="dashboard"
                className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
              >
                <Swords className="h-3.5 w-3.5 shrink-0" /> Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="packages"
                className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
              >
                <Package className="h-3.5 w-3.5 shrink-0" /> Packages
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
              >
                <Users className="h-3.5 w-3.5 shrink-0" /> Rep Performance
              </TabsTrigger>
              {isOwnerOrAdmin && (
                <TabsTrigger
                  value="rules"
                  className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
                >
                  <Settings2 className="h-3.5 w-3.5 shrink-0" /> Distribution Rules
                </TabsTrigger>
              )}
            </TabsList>
          </ContextualTabsPortal>
          <TabsList className={contextualTabListClassName("md:hidden")}>
            <TabsTrigger value="dashboard" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
              <Swords className="h-3.5 w-3.5 shrink-0" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="packages" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
              <Package className="h-3.5 w-3.5 shrink-0" /> Packages
            </TabsTrigger>
            <TabsTrigger value="performance" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
              <Users className="h-3.5 w-3.5 shrink-0" /> Rep Performance
            </TabsTrigger>
            {isOwnerOrAdmin && (
              <TabsTrigger value="rules" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Settings2 className="h-3.5 w-3.5 shrink-0" /> Distribution Rules
              </TabsTrigger>
            )}
          </TabsList>

          <div className="min-w-0 flex-1 mt-4 md:mt-6">
          <TabsContent value="dashboard" className="mt-0">
            <LeadSourcesGrid />
          </TabsContent>

          <TabsContent value="packages" className="mt-0">
            <LeadPackagesTab />
          </TabsContent>

          <TabsContent value="performance" className="mt-0">
            <RepPerformanceTab />
          </TabsContent>

          {isOwnerOrAdmin && (
            <TabsContent value="rules" className="mt-0">
              <DistributionRulesTab />
            </TabsContent>
          )}
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
