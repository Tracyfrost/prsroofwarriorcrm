import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestonesTab } from "@/components/production/MilestonesTab";
import { MeasurementsTab } from "@/components/production/MeasurementsTab";
import { QualificationTab } from "@/components/production/QualificationTab";
import { OverviewTab } from "@/components/production/OverviewTab";
import { ProductionItemsTab } from "@/components/production/ProductionItemsTab";
import { JobTrackingTab } from "@/components/production/JobTrackingTab";
import { InsuranceClaimTab } from "@/components/production/InsuranceClaimTab";
import { ChecksTab } from "@/components/production/ChecksTab";
import { useProductionItems } from "@/hooks/useProduction";
import { usePaymentChecks } from "@/hooks/usePaymentChecks";
import { useJobExpenses } from "@/hooks/useJobExpenses";
import { useDraws } from "@/hooks/useDraws";
import type { Qualification } from "@/hooks/useJobProduction";
import type { JobTracking } from "@/hooks/useJobTracking";
import { Clock, Ruler, ShieldCheck, BarChart3, Hammer, FileSpreadsheet, Shield, ScrollText, DollarSign } from "lucide-react";
import { JobLogsTab } from "@/components/production/JobLogsTab";

interface Props {
  jobId: string;
  milestones: Record<string, string | null>;
  qualification: Qualification;
  numberOfSquares: number;
  squaresEstimated?: number | null;
  squaresActualInstalled?: number | null;
  squaresFinal?: number | null;
  assignments: any[];
  profileMap: Map<string, any>;
  tracking?: JobTracking;
  isMainJob?: boolean;
  parentClaimNumber?: string | null;
  carrierFromCustomer?: string | null;
}

export function ProductionSection({ jobId, milestones, qualification, numberOfSquares, squaresEstimated, squaresActualInstalled, squaresFinal, assignments, profileMap, tracking, isMainJob = true, parentClaimNumber, carrierFromCustomer }: Props) {
  const { data: productionItems = [] } = useProductionItems(jobId);
  const { data: checks = [] } = usePaymentChecks(jobId);
  const { data: itemizedExpenses = [] } = useJobExpenses(jobId);
  const { data: draws = [] } = useDraws(jobId);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-1 px-1 pt-2 pb-1 overflow-x-auto bg-[var(--wc-surface-2)] border-t border-[var(--wc-border)] rounded-none">
        <TabsTrigger
          value="overview"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <BarChart3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Overview
        </TabsTrigger>
        <TabsTrigger
          value="milestones"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Milestones
        </TabsTrigger>
        <TabsTrigger
          value="items"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Hammer className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Items
        </TabsTrigger>
        <TabsTrigger
          value="measurements"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Ruler className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Measurements
        </TabsTrigger>
        <TabsTrigger
          value="qualification"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <ShieldCheck className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Qualification
        </TabsTrigger>
        <TabsTrigger
          value="tracking"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Tracking
        </TabsTrigger>
        <TabsTrigger
          value="claim"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Shield className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Claim
        </TabsTrigger>
        <TabsTrigger
          value="checks"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <DollarSign className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Checks
        </TabsTrigger>
        <TabsTrigger
          value="logs"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <ScrollText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Logs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab
          milestones={milestones}
          checks={checks}
          qualification={qualification}
          numberOfSquares={numberOfSquares}
          productionItems={productionItems}
          assignments={assignments}
          profileMap={profileMap}
          tracking={tracking}
          itemizedExpenses={itemizedExpenses}
          draws={draws}
        />
      </TabsContent>

      <TabsContent value="milestones" className="mt-4">
        <MilestonesTab jobId={jobId} milestones={milestones} />
      </TabsContent>

      <TabsContent value="items" className="mt-4">
        <ProductionItemsTab jobId={jobId} />
      </TabsContent>

      <TabsContent value="measurements" className="mt-4">
        <MeasurementsTab
          jobId={jobId}
          numberOfSquares={numberOfSquares}
          squaresEstimated={squaresEstimated}
          squaresActualInstalled={squaresActualInstalled}
          squaresFinal={squaresFinal}
        />
      </TabsContent>

      <TabsContent value="qualification" className="mt-4">
        <QualificationTab jobId={jobId} qualification={qualification} numberOfSquares={numberOfSquares} />
      </TabsContent>

      <TabsContent value="tracking" className="mt-4">
        <JobTrackingTab jobId={jobId} tracking={tracking ?? {}} />
      </TabsContent>

      <TabsContent value="claim" className="mt-4">
        <InsuranceClaimTab
          jobId={jobId}
          isMainJob={isMainJob}
          parentClaimNumber={parentClaimNumber}
          carrierFromCustomer={carrierFromCustomer}
        />
      </TabsContent>

      <TabsContent value="checks" className="mt-4">
        <ChecksTab jobId={jobId} />
      </TabsContent>

      <TabsContent value="logs" className="mt-4">
        <JobLogsTab jobId={jobId} />
      </TabsContent>
    </Tabs>
  );
}
