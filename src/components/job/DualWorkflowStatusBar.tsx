import { Check, GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { JobStatus } from "@/hooks/useCustomizations";
import type { StatusBranch } from "@/hooks/useStatusBranches";

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

function StatusNode({
  status,
  isActive,
  isPast,
  isFuture,
  onClick,
  progress,
}: {
  status: JobStatus;
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
  onClick: () => void;
  progress?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="group relative flex flex-col items-center flex-1 min-w-[80px]"
            title={`Change to ${status.display_name}`}
          >
            <div
              className={`relative z-10 flex items-center justify-center rounded-full border-2 transition-all cursor-pointer
                ${isActive ? "h-9 w-9 shadow-lg ring-4 ring-blue-200 dark:ring-blue-900/50" : isPast ? "h-7 w-7" : "h-7 w-7 opacity-40"}
              `}
              style={{
                borderColor: isActive ? "#3b82f6" : isPast ? (status.color || "#6b7280") : "#d1d5db",
                backgroundColor: isPast ? (status.color || "#6b7280") : isActive ? "#3b82f6" : "transparent",
              }}
            >
              {isPast && <Check className="h-3.5 w-3.5 text-white" />}
              {isActive && <div className="h-3 w-3 rounded-full bg-white" />}
            </div>
            <span
              className={`mt-1.5 text-[10px] font-medium leading-tight text-center whitespace-nowrap
                ${isActive ? "text-blue-600 dark:text-blue-400 font-bold" : isPast ? "text-muted-foreground" : "text-muted-foreground/40"}
              `}
            >
              {status.display_name}
            </span>
            {progress && isActive && (
              <span className="text-[9px] text-blue-500 font-semibold mt-0.5">{progress}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-semibold">{status.display_name}</p>
          <p className="text-muted-foreground">Click to set status</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const currentIdx = statuses.findIndex((s) => s.name === currentStatus);
  const progressPct = statuses.length > 1 ? Math.round(((Math.max(currentIdx, 0)) / (statuses.length - 1)) * 100) : 0;

  return (
    <div className="relative">
      {label && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">({progressPct}%)</span>
        </div>
      )}
      <div className="relative flex items-center">
        {/* Background track */}
        <div className="absolute top-[14px] left-[40px] right-[40px] h-0.5 bg-border rounded-full" />
        {/* Filled track */}
        {currentIdx >= 0 && (
          <div
            className="absolute top-[14px] left-[40px] h-0.5 rounded-full transition-all duration-500"
            style={{
              width: statuses.length > 1
                ? `calc(${(currentIdx / (statuses.length - 1)) * 100}% * (1 - 80px / 100%))`
                : "0%",
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}dd)`,
              maxWidth: `calc(100% - 80px)`,
            }}
          />
        )}
        {/* Nodes */}
        <div className="relative flex items-center w-full justify-between">
          {statuses.map((status, idx) => {
            const isActive = status.name === currentStatus;
            const isPast = idx < currentIdx;
            const isFuture = idx > currentIdx;
            return (
              <StatusNode
                key={status.id}
                status={status}
                isActive={isActive}
                isPast={isPast}
                isFuture={isFuture}
                onClick={() => onStatusChange(status.name)}
                progress={isActive ? `${progressPct}%` : undefined}
              />
            );
          })}
        </div>
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

  // Resolve statuses for each branch from their UUID arrays
  const resolveStatuses = (branch: StatusBranch | undefined): JobStatus[] => {
    if (!branch || !branch.statuses?.length) return [];
    return branch.statuses
      .map((sid) => allStatuses.find((s) => s.id === sid))
      .filter(Boolean) as JobStatus[];
  };

  const mainStatuses = resolveStatuses(mainBranch);
  const supplementStatuses = resolveStatuses(supplementBranch);

  // Fallback: if branches have no statuses configured, use all active statuses for main
  const effectiveMainStatuses = mainStatuses.length > 0 ? mainStatuses : allStatuses.filter(s => 
    ["lead", "inspected", "approved", "scheduled", "completed", "closed"].includes(s.name)
  );

  // Find the branch point index in the main bar
  const branchPointStatus = supplementBranch?.branch_point_status || "inspected";
  const branchPointIdx = effectiveMainStatuses.findIndex((s) => s.name === branchPointStatus);

  return (
    <div className="space-y-2">
      {/* Supplement Branch (shown above main when enabled) */}
      {hasSupplement && supplementStatuses.length > 0 && (
        <div className="relative">
          {/* Connecting line from branch point */}
          <div className="relative pl-4 pr-4">
            <div className="rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <StatusBar
                statuses={supplementStatuses}
                currentStatus={supplementStatus || supplementStatuses[0]?.name || ""}
                onStatusChange={onSupplementStatusChange}
                label="Supplement Flow"
                accentColor="#0ea5e9"
              />
            </div>
          </div>
          {/* Vertical connector */}
          <div className="flex justify-start pl-4">
            <div
              className="relative"
              style={{
                marginLeft: branchPointIdx >= 0 && effectiveMainStatuses.length > 1
                  ? `calc(${(branchPointIdx / (effectiveMainStatuses.length - 1)) * 100}% - 1px)`
                  : "120px",
              }}
            >
              <div className="w-0.5 h-4 bg-gradient-to-b from-blue-400 to-blue-500 mx-auto" />
              <GitBranch className="h-3.5 w-3.5 text-blue-500 mx-auto -mt-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Status Bar */}
      <div className="rounded-lg border bg-card p-3">
        <StatusBar
          statuses={effectiveMainStatuses}
          currentStatus={mainStatus}
          onStatusChange={onMainStatusChange}
          label="Main Flow"
          accentColor="#3b82f6"
        />
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <Switch
          id="supplement-toggle"
          checked={hasSupplement}
          onCheckedChange={onToggleSupplement}
        />
        <Label htmlFor="supplement-toggle" className="text-xs text-muted-foreground cursor-pointer">
          Enable Supplement Flow
        </Label>
      </div>
    </div>
  );
}
