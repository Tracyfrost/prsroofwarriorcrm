/** Stored as `appointments.outcome` when user picks a result. */
export type OutcomeRating = "" | "Good" | "Bad";

export function normalizeOutcomeRating(raw: string | null | undefined): OutcomeRating {
  const t = (raw ?? "").trim();
  if (t === "Good" || t === "Bad") return t;
  return "";
}

export function parseStoredAppointment(appt: { outcome?: string | null; notes?: string | null }) {
  const outcome = (appt.outcome ?? "").trim();
  const rating = normalizeOutcomeRating(outcome);
  const notes = (appt.notes ?? "").trim();
  const legacyOutcomeLine =
    outcome && rating === "" ? outcome : null;
  return { rating, notes, legacyOutcomeLine };
}

export function buildAppointmentOutcomePayload(rating: OutcomeRating, notes: string) {
  const n = notes.trim();
  return {
    outcome: rating === "" ? "" : rating,
    notes: n,
  };
}
