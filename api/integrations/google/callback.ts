import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import crypto from "node:crypto";
import { getOrigin, getServerEnv } from "./_lib.js";

function redirectWithStatus(res: VercelResponse, origin: string, status: "connected" | "error") {
  return res.redirect(`${origin}/settings?tab=integrations&google=${status}`);
}

const TOKEN_KEY_BYTES = 32;
const TOKEN_IV_BYTES = 12;

function getTokenKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing GOOGLE_TOKEN_ENCRYPTION_KEY");
  const parsed = Buffer.from(raw, "base64");
  if (parsed.length !== TOKEN_KEY_BYTES) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be base64-encoded 32-byte key");
  return parsed;
}

function encryptGoogleToken(value: string): string {
  const key = getTokenKey();
  const iv = crypto.randomBytes(TOKEN_IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const origin = getOrigin(req);

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  if (oauthError || !code || !state) {
    return redirectWithStatus(res, origin, "error");
  }

  try {
    const { supabaseUrl, serviceRoleKey } = getServerEnv();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: stateUser } = await supabase.auth.admin.getUserById(state);
    if (!stateUser?.user) return redirectWithStatus(res, origin, "error");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!,
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: me } = await oauth2.userinfo.get();
    const googleEmail = me.email || "google@connected.com";

    const encryptedAccess = tokens.access_token ? encryptGoogleToken(tokens.access_token) : null;
    const encryptedRefresh = tokens.refresh_token ? encryptGoogleToken(tokens.refresh_token) : null;

    if (!encryptedRefresh) {
      console.error("Google callback: no refresh token returned — user must have already granted access. Re-prompt with prompt=consent.");
      return redirectWithStatus(res, origin, "error");
    }

    const { data: activeRow } = await supabase
      .from("integrations_google")
      .select("id, refresh_token_encrypted")
      .eq("active", true)
      .maybeSingle();

    const { error: upsertError } = await supabase.from("integrations_google").upsert({
      id: activeRow?.id,
      google_email: googleEmail,
      access_token_encrypted: encryptedAccess,
      refresh_token_encrypted: encryptedRefresh ?? activeRow?.refresh_token_encrypted ?? null,
      token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600 * 1000).toISOString(),
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error("Google upsert error:", upsertError);
      return redirectWithStatus(res, origin, "error");
    }

    await supabase.from("audits").insert({
      user_id: stateUser.user.id,
      action: "google_connected",
      entity_type: "integration",
      details: { google_email: googleEmail },
    });

    return redirectWithStatus(res, origin, "connected");
  } catch (error) {
    console.error("Google callback error:", error);
    return redirectWithStatus(res, origin, "error");
  }
}