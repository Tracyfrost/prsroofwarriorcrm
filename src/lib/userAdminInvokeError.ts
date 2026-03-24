/**
 * Maps user-admin Edge Function HTTP errors to user-facing copy.
 * Handles gateway bodies like `{ "message": "Invalid JWT" }` (no string `code`) and our JSON `{ error, code }`.
 */

const SESSION_VERIFY_HINT =
  "Your session could not be verified. Sign out and sign in again. If this keeps happening, redeploy the user-admin Edge Function for this Supabase project (see docs/SUPABASE_SETUP.md).";

export function extractErrorDetailFromBody(body: Record<string, unknown> | null): string {
  if (!body) return "";
  if (typeof body.error === "string") return body.error;
  if (typeof body.msg === "string") return body.msg;
  if (typeof body.message === "string") return body.message;
  if (Array.isArray(body.details)) return body.details.join(", ");
  if (body.details) return JSON.stringify(body.details);
  return "";
}

/** True when the server only returned a generic JWT error string (gateway or GoTrue). */
export function isGenericJwtFailureMessage(details: string): boolean {
  const t = details.trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  if (/^invalid jwt\.?$/i.test(t)) return true;
  if (lower.includes("invalid jwt") && t.length < 120) return true;
  if (lower.includes("jwt expired") || lower.includes("expired jwt")) return true;
  if (lower.includes("malformed jwt")) return true;
  return false;
}

export function formatUserAdminHttpError(
  status: number | undefined,
  body: Record<string, unknown> | null,
  rawNonJsonFallback: string,
): string {
  const details = body ? extractErrorDetailFromBody(body) : rawNonJsonFallback;

  const code = typeof body?.code === "string" ? body.code : undefined;
  if (code === "NOT_AUTHENTICATED") {
    return "Your session could not be verified. Sign out and sign in again.";
  }
  if (code === "SESSION_EXPIRED") {
    return "Your session expired. Sign in again and retry.";
  }
  if (code === "FORBIDDEN") {
    return details || "You do not have permission to manage users.";
  }
  if (code === "DUPLICATE_EMAIL") {
    return details || "A user with this email already exists.";
  }
  if (code === "VALIDATION_ERROR") {
    return details || "Invalid request.";
  }
  if (code === "SERVER_ERROR") {
    return details || "Server error. Try again in a moment.";
  }

  if (status === 401) {
    if (!details || isGenericJwtFailureMessage(details)) {
      return SESSION_VERIFY_HINT;
    }
    return details;
  }

  const lower = details.toLowerCase();
  if (lower.includes("invalid jwt") || lower.includes("jwt expired")) {
    return SESSION_VERIFY_HINT;
  }

  if (status === 403) {
    return details || "You do not have permission to perform this action.";
  }
  if (status === 409) {
    return details || "This email is already in use.";
  }
  if (status != null && status >= 500) {
    return details || "Server error. Try again in a moment.";
  }
  return details || "Edge Function returned an HTTP error response.";
}
