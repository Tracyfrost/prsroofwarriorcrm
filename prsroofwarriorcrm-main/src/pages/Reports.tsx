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

        <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1 bg-[var(--wc-surface-1)] border border-[var(--wc-border)] rounded-lg mb-6">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white"
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="by-rep"
              className="data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white"
            >
              <Users className="mr-1.5 h-3.5 w-3.5" /> By Sales Rep
            </TabsTrigger>
            <TabsTrigger
              value="squares"
              className="data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white"
            >
              <Ruler className="mr-1.5 h-3.5 w-3.5" /> Squares Summary
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="data-[state=active]:bg-[var(--wc-ink)] data-[state=active]:text-white"
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Custom
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </PageWrapper>
    </AppLayout>
  );
}
