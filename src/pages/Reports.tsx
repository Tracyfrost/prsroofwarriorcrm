import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ruler, SlidersHorizontal } from "lucide-react";
import { ReportDashboard } from "@/components/reports/ReportDashboard";
import { ReportBySalesRep } from "@/components/reports/ReportBySalesRep";
import { ReportSquaresSummary } from "@/components/reports/ReportSquaresSummary";
import { ReportCustom } from "@/components/reports/ReportCustom";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabListSidebarClassName,
  contextualTabTriggerClassName,
  contextualTabTriggerSidebarClassName,
} from "@/components/layout/contextualTabNav";

type ReportTab = "dashboard" | "by-rep" | "squares" | "custom";

export default function Reports() {
  usePageTitle("Reports");
  const [tab, setTab] = useState<ReportTab>("dashboard");

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">
            Victory Analytics — Intel Reports
          </h1>
          <p className="text-muted-foreground">
            Tactical performance intelligence · Execute your report.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)} className="min-w-0 w-full">
          <ContextualTabsPortal>
            <TabsList
              className={contextualTabListSidebarClassName(
                "border-[var(--wc-border)] bg-[var(--wc-surface-1)] [&_[data-state=active]]:bg-[var(--wc-ink)] [&_[data-state=active]]:text-white",
              )}
            >
              <TabsTrigger
                value="dashboard"
                className={contextualTabTriggerSidebarClassName(
                  "inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white",
                )}
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0" /> Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="by-rep"
                className={contextualTabTriggerSidebarClassName(
                  "inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white",
                )}
              >
                <Users className="h-3.5 w-3.5 shrink-0" /> By Sales Rep
              </TabsTrigger>
              <TabsTrigger
                value="squares"
                className={contextualTabTriggerSidebarClassName(
                  "inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white",
                )}
              >
                <Ruler className="h-3.5 w-3.5 shrink-0" /> Squares Summary
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className={contextualTabTriggerSidebarClassName(
                  "inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" /> Custom
              </TabsTrigger>
            </TabsList>
          </ContextualTabsPortal>
          <TabsList
            className={contextualTabListClassName(
              "md:hidden border-[var(--wc-border)] bg-[var(--wc-surface-1)] [&_[data-state=active]]:bg-[var(--wc-ink)] [&_[data-state=active]]:text-white",
            )}
          >
            <TabsTrigger
              value="dashboard"
              className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white")}
            >
              <BarChart3 className="h-3.5 w-3.5 shrink-0" /> Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="by-rep"
              className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white")}
            >
              <Users className="h-3.5 w-3.5 shrink-0" /> By Sales Rep
            </TabsTrigger>
            <TabsTrigger
              value="squares"
              className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white")}
            >
              <Ruler className="h-3.5 w-3.5 shrink-0" /> Squares Summary
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" /> Custom
            </TabsTrigger>
          </TabsList>

          <div className="min-w-0 flex-1 mt-4 md:mt-6">
          <TabsContent value="dashboard" className="mt-0">
            <ReportDashboard />
          </TabsContent>
          <TabsContent value="by-rep" className="mt-0">
            <ReportBySalesRep />
          </TabsContent>
          <TabsContent value="squares" className="mt-0">
            <ReportSquaresSummary />
          </TabsContent>
          <TabsContent value="custom" className="mt-0">
            <ReportCustom />
          </TabsContent>
          </div>
        </Tabs>
      </PageWrapper>
    </AppLayout>
  );
}
