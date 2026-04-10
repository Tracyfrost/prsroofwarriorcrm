import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OutcomeRating } from "./appointmentOutcomeModel";

export function AppointmentOutcomeFields({
  outcomeRating,
  notes,
  onOutcomeRatingChange,
  onNotesChange,
  legacyOutcomeLine,
  disabled,
  notesPlaceholder = "Add details (optional)",
  idPrefix = "appt-outcome",
  notesRows = 3,
}: {
  outcomeRating: OutcomeRating;
  notes: string;
  onOutcomeRatingChange: (v: OutcomeRating) => void;
  onNotesChange: (v: string) => void;
  legacyOutcomeLine?: string | null;
  disabled?: boolean;
  notesPlaceholder?: string;
  idPrefix?: string;
  notesRows?: number;
}) {
  return (
    <div className="space-y-3">
      {legacyOutcomeLine ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Previous outcome: </span>
          {legacyOutcomeLine}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-rating`}>Result</Label>
        <Select
          value={outcomeRating === "" ? "__none__" : outcomeRating}
          onValueChange={(v) =>
            onOutcomeRatingChange(v === "__none__" ? "" : (v as OutcomeRating))
          }
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-rating`}>
            <SelectValue placeholder="Select result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Not set</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Bad">Bad</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={notesPlaceholder}
          rows={notesRows}
          maxLength={2000}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
