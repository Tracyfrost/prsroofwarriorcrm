import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseStoredAppointment } from "./appointmentOutcomeModel";

/** Bright green / red chips for appointment result (light + dark friendly contrast). */
export function outcomeRatingBadgeClass(rating: "Good" | "Bad"): string {
  if (rating === "Good") {
    return "border-transparent bg-green-500 text-white shadow-sm hover:bg-green-600";
  }
  return "border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700";
}

export function AppointmentOutcomeSummary({
  outcome,
  notes,
  className,
}: {
  outcome?: string | null;
  notes?: string | null;
  className?: string;
}) {
  const { rating, notes: n, legacyOutcomeLine } = parseStoredAppointment({ outcome, notes });

  if (legacyOutcomeLine) {
    return (
      <div className={`space-y-0.5 text-sm ${className ?? ""}`}>
        <p className="text-muted-foreground">{legacyOutcomeLine}</p>
        {n ? <p className="text-xs text-muted-foreground">{n}</p> : null}
      </div>
    );
  }

  if (!rating && !n) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${className ?? ""}`}>
      {rating ? (
        <Badge variant="outline" className={cn("text-xs font-semibold", outcomeRatingBadgeClass(rating))}>
          {rating}
        </Badge>
      ) : null}
      {n ? <span className="text-muted-foreground">{n}</span> : null}
    </div>
  );
}
