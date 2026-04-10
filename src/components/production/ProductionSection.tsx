import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MilestonesMainTab from "@/components/job/MilestonesMainTab";
import MilestonesSubTab from "@/components/job/MilestonesSubTab";
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
import { resolvePlanningRoofSquares, type PlanningJobSquares } from "@/lib/roofSquares";
import { Clock, Ruler, ShieldCheck, BarChart3, Hammer, FileSpreadsheet, Shield, ScrollText, DollarSign, FileText } from "lucide-react";
import { JobLogsTab } from "@/components/production/JobLogsTab";
import { DocumentsPanel } from "@/components/DocumentsPanel";

interface Props {
  jobId: string;
  /** Human-readable job id for CSV export labels */
  jobDisplayId?: string;
  milestones: Record<string, string | null>;
  qualification: Qualification;
  /** Raw `jobs.number_of_squares` for planning SQ fallback */
  numberOfSquaresRaw?: number | null;
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

export function ProductionSection({ jobId, jobDisplayId, milestones, qualification, numberOfSquaresRaw, squaresEstimated, squaresActualInstalled, squaresFinal, assignments, profileMap, tracking, isMainJob = true, parentClaimNumber, carrierFromCustomer }: Props) {
  const planningJobSquares: PlanningJobSquares = useMemo(
    () => ({
      squares_estimated: squaresEstimated ?? null,
      squares_actual_installed: squaresActualInstalled ?? null,
      squares_final: squaresFinal ?? null,
      number_of_squares: numberOfSquaresRaw ?? null,
    }),
    [squaresEstimated, squaresActualInstalled, squaresFinal, numberOfSquaresRaw],
  );

  const planningRoofSquares = useMemo(
    () => resolvePlanningRoofSquares(planningJobSquares, qualification as Record<string, unknown>),
    [planningJobSquares, qualification],
  );

  const { data: productionItems = [], isLoading: productionItemsLoading } = useProductionItems(jobId);
  const { data: checks = [] } = usePaymentChecks(jobId);
  const { data: itemizedExpenses = [] } = useJobExpenses(jobId);
  const { data: draws = [] } = useDraws(jobId);
  const [prodTab, setProdTab] = useState("overview");

  const receivedChecksTotal = useMemo(
    () =>
      checks.filter((c) => c.status === "Received" || c.status === "Deposited").reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [checks],
  );

  return (
    <Tabs value={prodTab} onValueChange={setProdTab} className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-1 px-1 pt-2 pb-1 overflow-x-auto bg-[var(--wc-surface-2)] border-t border-[var(--wc-border)] rounded-none">
        <TabsTrigger
          value="overview"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <BarChart3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Overview
        </TabsTrigger>
        <TabsTrigger
          value="war-room"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Hammer className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> War Room
        </TabsTrigger>
        <TabsTrigger
          value="job-files"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <FileText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Job files
        </TabsTrigger>
        <TabsTrigger
          value="milestones"
          className="flex items-center gap-1.5 text-xs min-h-[48px] sm:min-h-0 px-3 py-2 border-b-2 border-transparent text-[var(--wc-muted)] data-[state=active]:text-[var(--wc-ink)] data-[state=active]:border-b-[var(--wc-amber)] data-[state=active]:bg-transparent hover:text-[var(--wc-ink)] hover:bg-[var(--wc-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2"
        >
          <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Milestones
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
          planningRoofSquares={planningRoofSquares}
          productionItems={productionItems}
          assignments={assignments}
          profileMap={profileMap}
          tracking={tracking}
          itemizedExpenses={itemizedExpenses}
          draws={draws}
        />
      </TabsContent>

      <TabsContent value="war-room" className="mt-4">
        <ProductionItemsTab
          jobId={jobId}
          jobDisplayId={jobDisplayId}
          planningJobSquares={planningJobSquares}
          qualification={qualification}
          productionItems={productionItems}
          draws={draws}
          receivedChecksTotal={receivedChecksTotal}
          productionItemsLoading={productionItemsLoading}
        />
      </TabsContent>

      <TabsContent value="job-files" className="mt-4">
        <DocumentsPanel jobId={jobId} />
      </TabsContent>

      <TabsContent value="milestones" className="mt-4">
        <div className="space-y-8">
          <MilestonesMainTab jobId={jobId} />
          <MilestonesSubTab jobId={jobId} />
        </div>
      </TabsContent>

      <TabsContent value="measurements" className="mt-4">
        <MeasurementsTab jobId={jobId} />
      </TabsContent>

      <TabsContent value="qualification" className="mt-4">
        <QualificationTab
          jobId={jobId}
          jobDisplayId={jobDisplayId}
          qualification={qualification}
          planningJobSquares={planningJobSquares}
          productionItems={productionItems}
          draws={draws}
          receivedChecksTotal={receivedChecksTotal}
          onNavigateWarRoom={() => setProdTab("war-room")}
        />
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
