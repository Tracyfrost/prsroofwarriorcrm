import { useEffect, useRef } from "react";
import { Check, GitBranch } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/hooks/useCustomizations";
import type { StatusBranch } from "@/hooks/useStatusBranches";

const DEFAULT_MAIN_FLOW_NAMES = ["lead", "inspected", "approved", "scheduled", "completed", "closed"];

/** When the DB main branch lists fewer than 2 statuses, expand so the job-flow strip still works. */
function resolveEffectiveMainStatuses(
  mainStatuses: JobStatus[],
  allStatuses: JobStatus[],
  currentStatusName: string,
): JobStatus[] {
  if (mainStatuses.length >= 2) {
    return mainStatuses;
  }

  const defaults = allStatuses
    .filter((s) => DEFAULT_MAIN_FLOW_NAMES.includes(s.name))
    .sort((a, b) => DEFAULT_MAIN_FLOW_NAMES.indexOf(a.name) - DEFAULT_MAIN_FLOW_NAMES.indexOf(b.name));

  const current = allStatuses.find((s) => s.name === currentStatusName);
  const merged: JobStatus[] = [];
  const seen = new Set<string>();
  for (const s of defaults) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }
  if (current && !seen.has(current.id)) {
    merged.push(current);
    seen.add(current.id);
  }
  for (const s of mainStatuses) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }

  if (merged.length >= 2) {
    return merged.sort((a, b) => {
      const ia = DEFAULT_MAIN_FLOW_NAMES.indexOf(a.name);
      const ib = DEFAULT_MAIN_FLOW_NAMES.indexOf(b.name);
      const va = ia >= 0 ? ia : 1000;
      const vb = ib >= 0 ? ib : 1000;
      return va - vb;
    });
  }

  return mainStatuses.length > 0 ? mainStatuses : merged;
}

interface DualWorkflowStatusBarProps {
  allStatuses: JobStatus[];
  branches: StatusBranch[];
  mainStatus: string;
  supplementStatus: string | null;
  hasSupplement: boolean;
  onMainStatusChange: (status: string) => void;
  onSupplementStatusChange: (status: string) => void;
  onToggleSupplement: (enabled: boolean) => void;
}

function JobFlowLabelHeading({ label, progressPct }: { label: string; progressPct: number }) {
  const parts = label.split(" — ");
  const hasSub = parts.length === 2;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {hasSub ? (
        <>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{parts[0]}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">— {parts[1]}</span>
        </>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
      <span className="text-[10px] text-muted-foreground">({progressPct}%)</span>
    </div>
  );
}

function JobFlowStatusCard({
  status,
  idx,
  activeIndex,
  accentColor,
  flowPercent,
  showPercent,
  onSelect,
}: {
  status: JobStatus;
  idx: number;
  activeIndex: number;
  accentColor: string;
  flowPercent: number;
  showPercent: boolean;
  onSelect: () => void;
}) {
  const isActive = idx === activeIndex;
  const isPast = idx < activeIndex;
  const stateLabel = isActive ? "Current" : isPast ? "Completed" : "Upcoming";
  const barColor = status.color || accentColor;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-[104px] w-[160px] min-w-[150px] max-w-[180px] shrink-0 flex-col rounded-lg border border-border/80 p-3 text-center shadow-sm transition-all",
        "border-t-[5px] hover:brightness-[1.02] dark:hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "shadow-md",
        !isActive && "opacity-90",
      )}
      style={{
        borderTopColor: barColor,
        backgroundColor: `color-mix(in srgb, ${barColor} 12%, hsl(var(--card)))`,
        ...(isActive
          ? {
              boxShadow: `0 0 0 2px color-mix(in srgb, ${accentColor} 45%, transparent), 0 4px 6px -1px rgb(0 0 0 / 0.08)`,
            }
          : {}),
      }}
      aria-current={isActive ? "step" : undefined}
      aria-label={`${status.display_name}, ${stateLabel}. Click to set job status.`}
    >
      <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{status.display_name}</span>
      <div className="mt-auto flex flex-col items-center gap-1 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          {isPast && <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          {isActive && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
              aria-hidden
            />
          )}
          <span className={cn(isActive && "font-medium text-foreground")}>{stateLabel}</span>
        </div>
        {isActive && showPercent && (
          <span className="tabular-nums font-medium opacity-90" style={{ color: accentColor }}>
            {flowPercent}%
          </span>
        )}
      </div>
    </button>
  );
}

function StatusBar({
  statuses,
  currentStatus,
  onStatusChange,
  label,
  accentColor = "#3b82f6",
}: {
  statuses: JobStatus[];
  currentStatus: string;
  onStatusChange: (s: string) => void;
  label?: string;
  accentColor?: string;
}) {
  const rawIdx = statuses.findIndex((s) => s.name === currentStatus);
  const resolvedIdx = rawIdx >= 0 ? rawIdx : 0;

  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const statusIds = statuses.map((s) => s.id).join(",");

  const progressPct =
    statuses.length > 1 ? Math.round((Math.max(resolvedIdx, 0) / (statuses.length - 1)) * 100) : 0;

  useEffect(() => {
    const el = itemRefs.current[resolvedIdx];
    el?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "auto" });
  }, [resolvedIdx, statusIds]);

  if (statuses.length === 0) {
    return null;
  }

  const regionLabel = label
    ? `${label} status steps. Scroll sideways to see all steps. Click a card to set status.`
    : "Job status steps. Scroll sideways to see all steps. Click a card to set status.";

  return (
    <div className="relative">
      {label && (
        <div className="mb-2 space-y-0.5">
          <JobFlowLabelHeading label={label} progressPct={progressPct} />
          {statuses.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              Scroll sideways to see all steps. Click a card to set status.
            </p>
          )}
        </div>
      )}

      <div className="job-flow-strip-wrap rounded-md">
        <ul
          className="job-flow-hscroll flex list-none flex-row gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1"
          role="list"
          aria-label={regionLabel}
        >
          {statuses.map((status, idx) => (
            <li
              key={status.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className="shrink-0"
              role="listitem"
            >
              <JobFlowStatusCard
                status={status}
                idx={idx}
                activeIndex={resolvedIdx}
                accentColor={accentColor}
                showPercent={statuses.length > 1}
                flowPercent={
                  statuses.length > 1 ? Math.round((idx / (statuses.length - 1)) * 100) : 0
                }
                onSelect={() => onStatusChange(status.name)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DualWorkflowStatusBar({
  allStatuses,
  branches,
  mainStatus,
  supplementStatus,
  hasSupplement,
  onMainStatusChange,
  onSupplementStatusChange,
  onToggleSupplement,
}: DualWorkflowStatusBarProps) {
  const mainBranch = branches.find((b) => b.name === "main");
  const supplementBranch = branches.find((b) => b.name === "supplement");

  const resolveStatuses = (branch: StatusBranch | undefined): JobStatus[] => {
    if (!branch || !branch.statuses?.length) return [];
    return branch.statuses
      .map((sid) => allStatuses.find((s) => s.id === sid))
      .filter(Boolean) as JobStatus[];
  };

  const mainStatuses = resolveStatuses(mainBranch);
  const supplementStatuses = resolveStatuses(supplementBranch);

  const effectiveMainStatuses =
    mainStatuses.length >= 2
      ? mainStatuses
      : resolveEffectiveMainStatuses(mainStatuses, allStatuses, mainStatus);

  const branchPointStatus = supplementBranch?.branch_point_status || "inspected";
  const branchPointIdx = effectiveMainStatuses.findIndex((s) => s.name === branchPointStatus);

  return (
    <div className="space-y-2">
      {hasSupplement && supplementStatuses.length > 0 && (
        <div className="relative">
          <div className="relative pl-4 pr-4">
            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 dark:border-blue-700 dark:bg-blue-950/20">
              <StatusBar
                statuses={supplementStatuses}
                currentStatus={supplementStatus || supplementStatuses[0]?.name || ""}
                onStatusChange={onSupplementStatusChange}
                label="Job Flow — Supplement"
                accentColor="#0ea5e9"
              />
            </div>
          </div>
          <div className="flex justify-start pl-4">
            <div
              className="relative"
              style={{
                marginLeft:
                  branchPointIdx >= 0 && effectiveMainStatuses.length > 1
                    ? `calc(${(branchPointIdx / (effectiveMainStatuses.length - 1)) * 100}% - 1px)`
                    : "120px",
              }}
            >
              <div className="mx-auto h-4 w-0.5 bg-gradient-to-b from-blue-400 to-blue-500" />
              <GitBranch className="mx-auto -mt-0.5 h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-3">
        <StatusBar
          statuses={effectiveMainStatuses}
          currentStatus={mainStatus}
          onStatusChange={onMainStatusChange}
          label="Job Flow"
          accentColor="#3b82f6"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Switch id="supplement-toggle" checked={hasSupplement} onCheckedChange={onToggleSupplement} />
        <Label htmlFor="supplement-toggle" className="cursor-pointer text-xs text-muted-foreground">
          Enable Supplement Flow
        </Label>
      </div>
    </div>
  );
}
