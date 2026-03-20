import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { JobStatus } from "@/hooks/useCustomizations";

interface WorkflowStatusBarProps {
  statuses: JobStatus[];
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

export function WorkflowStatusBar({ statuses, currentStatus, onStatusChange }: WorkflowStatusBarProps) {
  const currentIdx = statuses.findIndex(s => s.name === currentStatus);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">
        {statuses.map((status, idx) => {
          const isActive = status.name === currentStatus;
          const isPast = idx < currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <button
              key={status.id}
              onClick={() => onStatusChange(status.name)}
              className="group relative flex flex-col items-center flex-1 min-w-[90px]"
              title={`Change to ${status.display_name}`}
            >
              {/* Connector line */}
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className="h-0.5 flex-1 transition-colors"
                    style={{ backgroundColor: isPast || isActive ? status.color || 'hsl(var(--primary))' : 'hsl(var(--border))' }}
                  />
                )}
                {/* Circle */}
                <div
                  className={`relative z-10 flex items-center justify-center rounded-full border-2 transition-all ${
                    isActive
                      ? "h-8 w-8 shadow-md"
                      : isPast
                        ? "h-6 w-6"
                        : "h-6 w-6 opacity-50"
                  }`}
                  style={{
                    borderColor: status.color || 'hsl(var(--primary))',
                    backgroundColor: isPast || isActive ? (status.color || 'hsl(var(--primary))') : 'transparent',
                  }}
                >
                  {isPast && <Check className="h-3 w-3 text-white" />}
                  {isActive && (
                    <div className="h-2.5 w-2.5 rounded-full bg-white" />
                  )}
                </div>
                {idx < statuses.length - 1 && (
                  <div
                    className="h-0.5 flex-1 transition-colors"
                    style={{ backgroundColor: isPast ? statuses[idx + 1]?.color || 'hsl(var(--primary))' : 'hsl(var(--border))' }}
                  />
                )}
              </div>
              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] font-medium transition-colors leading-tight text-center ${
                  isActive
                    ? "text-foreground font-semibold"
                    : isPast
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                {status.display_name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
