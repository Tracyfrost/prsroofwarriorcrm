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
import { useAppointments } from "@/hooks/useJobs";
import { JobAppointmentsBlock } from "@/components/appointments/JobAppointmentsBlock";
import type { Qualification } from "@/hooks/useJobProduction";
import type { JobTracking } from "@/hooks/useJobTracking";
import { resolvePlanningRoofSquares, type PlanningJobSquares } from "@/lib/roofSquares";
import { Clock, Ruler, ShieldCheck, BarChart3, Hammer, FileSpreadsheet, Shield, ScrollText, DollarSign, FileText, Calendar } from "lucide-react";
import { JobLogsTab } from "@/components/production/JobLogsTab";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { cn } from "@/lib/utils";

/** War Room sub-tabs: gold frame, blue top accent, translucent blue fill when active */
const productionSubTabTriggerClass = cn(
  "flex items-center gap-1.5 text-xs rounded-md px-3 py-2 text-[var(--wc-muted)] transition-colors",
  "border-2 border-transparent",
  "min-h-[48px] shrink-0 sm:min-h-0 md:w-full md:justify-start",
  "hover:bg-sky-500/10 hover:text-[var(--wc-ink)] dark:hover:bg-sky-400/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wc-amber)] focus-visible:ring-offset-2",
  "data-[state=active]:border-[var(--wc-amber)] data-[state=active]:border-t-[3px] data-[state=active]:border-t-blue-600",
  "data-[state=active]:bg-sky-500/25 data-[state=active]:text-[var(--wc-ink)]",
  "dark:data-[state=active]:border-t-blue-400 dark:data-[state=active]:bg-sky-400/15",
);

const productionSubTabListMobileClass = cn(
  "md:hidden h-auto w-full min-w-0 flex-none flex-row flex-wrap items-stretch gap-1 overflow-x-auto rounded-none border-t border-[var(--wc-border)]",
  "bg-[var(--wc-surface-2)] px-1 pb-1 pt-2",
);

const productionSubTabListDesktopClass = cn(
  "hidden h-auto w-56 shrink-0 flex-col gap-1 self-start rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] p-2 md:flex",
);

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
  /** Initial War Room / Production sub-tab (e.g. `job-files` when deep-linking from SiteCam) */
  initialSubTab?: string;
  /** Job Files: switch parent to SiteCam tab for annotate / field photos */
  onGoToSiteCam?: () => void;
}

export function ProductionSection({
  jobId,
  jobDisplayId,
  milestones,
  qualification,
  numberOfSquaresRaw,
  squaresEstimated,
  squaresActualInstalled,
  squaresFinal,
  assignments,
  profileMap,
  tracking,
  isMainJob = true,
  parentClaimNumber,
  carrierFromCustomer,
  initialSubTab = "overview",
  onGoToSiteCam,
}: Props) {
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
  const { data: appointments = [] } = useAppointments(jobId);
  const [prodTab, setProdTab] = useState(() => initialSubTab || "overview");

  const receivedChecksTotal = useMemo(
    () =>
      checks.filter((c) => c.status === "Received" || c.status === "Deposited").reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [checks],
  );

  const contentClass = "mt-4 md:mt-0";

  return (
    <Tabs value={prodTab} onValueChange={setProdTab} className="w-full min-w-0">
      <TabsList className={productionSubTabListMobileClass}>
        <TabsTrigger value="overview" className={productionSubTabTriggerClass}>
          <BarChart3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Prod Overview
        </TabsTrigger>
        <TabsTrigger value="war-room" className={productionSubTabTriggerClass}>
          <Hammer className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Production Items
        </TabsTrigger>
        <TabsTrigger value="job-files" className={productionSubTabTriggerClass}>
          <FileText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Job files
        </TabsTrigger>
        <TabsTrigger value="measurements" className={productionSubTabTriggerClass}>
          <Ruler className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Measurements
        </TabsTrigger>
        <TabsTrigger value="qualification" className={productionSubTabTriggerClass}>
          <ShieldCheck className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Qualification
        </TabsTrigger>
        <TabsTrigger value="deployments" className={productionSubTabTriggerClass}>
          <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Deployments
        </TabsTrigger>
        <TabsTrigger value="tracking" className={productionSubTabTriggerClass}>
          <FileSpreadsheet className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Tracking
        </TabsTrigger>
        <TabsTrigger value="claim" className={productionSubTabTriggerClass}>
          <Shield className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Claim
        </TabsTrigger>
        <TabsTrigger value="checks" className={productionSubTabTriggerClass}>
          <DollarSign className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Checks
        </TabsTrigger>
        <TabsTrigger value="milestones" className={productionSubTabTriggerClass}>
          <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Milestones
        </TabsTrigger>
        <TabsTrigger value="logs" className={productionSubTabTriggerClass}>
          <ScrollText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Logs
        </TabsTrigger>
      </TabsList>

      <div className="mt-0 min-w-0 md:flex md:flex-row md:items-start md:gap-4">
        <TabsList className={productionSubTabListDesktopClass}>
          <TabsTrigger value="overview" className={productionSubTabTriggerClass}>
            <BarChart3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Prod Overview
          </TabsTrigger>
          <TabsTrigger value="war-room" className={productionSubTabTriggerClass}>
            <Hammer className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Production Items
          </TabsTrigger>
          <TabsTrigger value="job-files" className={productionSubTabTriggerClass}>
            <FileText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Job files
          </TabsTrigger>
          <TabsTrigger value="measurements" className={productionSubTabTriggerClass}>
            <Ruler className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Measurements
          </TabsTrigger>
          <TabsTrigger value="qualification" className={productionSubTabTriggerClass}>
            <ShieldCheck className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Qualification
          </TabsTrigger>
          <TabsTrigger value="deployments" className={productionSubTabTriggerClass}>
            <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Deployments
          </TabsTrigger>
          <TabsTrigger value="tracking" className={productionSubTabTriggerClass}>
            <FileSpreadsheet className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Tracking
          </TabsTrigger>
          <TabsTrigger value="claim" className={productionSubTabTriggerClass}>
            <Shield className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Claim
          </TabsTrigger>
          <TabsTrigger value="checks" className={productionSubTabTriggerClass}>
            <DollarSign className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Checks
          </TabsTrigger>
          <TabsTrigger value="milestones" className={productionSubTabTriggerClass}>
            <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Milestones
          </TabsTrigger>
          <TabsTrigger value="logs" className={productionSubTabTriggerClass}>
            <ScrollText className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Logs
          </TabsTrigger>
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="overview" className={contentClass}>
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

          <TabsContent value="war-room" className={contentClass}>
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

          <TabsContent value="job-files" className={contentClass}>
            <DocumentsPanel jobId={jobId} onGoToSiteCam={onGoToSiteCam} />
          </TabsContent>

          <TabsContent value="milestones" className={contentClass}>
            <div className="space-y-8">
              <MilestonesMainTab jobId={jobId} />
              <MilestonesSubTab jobId={jobId} />
            </div>
          </TabsContent>

          <TabsContent value="measurements" className={contentClass}>
            <MeasurementsTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="qualification" className={contentClass}>
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

          <TabsContent value="tracking" className={contentClass}>
            <JobTrackingTab jobId={jobId} tracking={tracking ?? {}} />
          </TabsContent>

          <TabsContent value="deployments" className={contentClass}>
            <JobAppointmentsBlock jobId={jobId} appointments={appointments} addMode="dialog" />
          </TabsContent>

          <TabsContent value="claim" className={contentClass}>
            <InsuranceClaimTab
              jobId={jobId}
              isMainJob={isMainJob}
              parentClaimNumber={parentClaimNumber}
              carrierFromCustomer={carrierFromCustomer}
            />
          </TabsContent>

          <TabsContent value="checks" className={contentClass}>
            <ChecksTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="logs" className={contentClass}>
            <JobLogsTab jobId={jobId} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
