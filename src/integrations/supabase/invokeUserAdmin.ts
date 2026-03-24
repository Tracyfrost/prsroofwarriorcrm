import { supabase } from "@/integrations/supabase/client";
import type { FunctionsResponse } from "@supabase/supabase-js";

/** Host + project ref from VITE_SUPABASE_URL (for debug only; no secrets). */
export function getSupabaseUrlHostAndRef(): { host: string | null; projectRef: string | null } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || typeof url !== "string") return { host: null, projectRef: null };
  try {
    const u = new URL(url);
    return { host: u.host, projectRef: u.hostname.split(".")[0] ?? null };
  } catch {
    return { host: null, projectRef: null };
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function projectRefFromJwtPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const ref = payload.ref;
  if (typeof ref === "string" && ref.length > 0) return ref;
  const iss = payload.iss;
  if (typeof iss === "string") {
    try {
      return new URL(iss).hostname.split(".")[0] ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Invokes the `user-admin` Edge Function with a **fresh** user JWT.
 *
 * Sends both `Authorization: Bearer <access_token>` and `apikey: <anon/publishable key>`
 * so the Functions API always matches the same project as the browser session.
 * Repo `supabase/config.toml` sets `verify_jwt = false` for `user-admin` (validate inside the function); redeploy after changing config.
 */
export async function invokeUserAdminFunction<T>(
  functionName: string,
  body: unknown,
): Promise<FunctionsResponse<T>> {
  const { host, projectRef: envProjectRef } = getSupabaseUrlHostAndRef();

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  let session = refreshData.session ?? null;
  if (!session) {
    const { data: s2 } = await supabase.auth.getSession();
    session = s2.session ?? null;
  }
  const accessToken = session?.access_token ?? null;

  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  const tokenProjectRef = projectRefFromJwtPayload(payload);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  const nowSec = Math.floor(Date.now() / 1000);

  if (import.meta.env.DEV) {
    console.info("user-admin invoke (pre-flight)", {
      functionName,
      hasSession: Boolean(session),
      hasAccessToken: Boolean(accessToken),
      currentUserId: session?.user?.id ?? null,
      currentUserEmail: session?.user?.email ?? null,
      supabaseHost: host,
      supabaseProjectRef: envProjectRef,
      tokenProjectRef,
      accessTokenExp: exp,
      accessTokenExpiresInSec: exp != null ? exp - nowSec : null,
      refreshError: refreshError?.message ?? null,
    });
  }

  if (!accessToken) {
    throw new Error("No access token after refresh. Sign out and sign in again.");
  }

  if (envProjectRef && tokenProjectRef && envProjectRef !== tokenProjectRef) {
    await supabase.auth.signOut();
    throw new Error(
      `Session JWT is for project "${tokenProjectRef}" but app URL is "${envProjectRef}". Signed out — sign in again.`,
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (PUBLISHABLE_KEY) {
    headers.apikey = PUBLISHABLE_KEY;
  }

  return supabase.functions.invoke<T>(functionName, {
    body,
    headers,
  });
}
