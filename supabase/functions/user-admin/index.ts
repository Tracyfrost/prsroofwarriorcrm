import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode =
  | "NOT_AUTHENTICATED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "DUPLICATE_EMAIL"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function jsonErr(
  message: string,
  status: number,
  code: ErrorCode,
  extras?: Record<string, unknown>,
) {
  return json({ error: message, code, ...extras }, status);
}

function parseBearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization")?.trim();
  if (!raw) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(raw);
  return m?.[1]?.trim() ?? null;
}

function authFailureResponse(err: { message?: string; code?: string }): Response {
  const msg = err.message || "Not authenticated";
  const low = msg.toLowerCase();
  const c = (err.code || "").toLowerCase();
  if (low.includes("expired") || c === "session_expired" || low.includes("jwt expired")) {
    return jsonErr("Session expired. Sign in again.", 401, "SESSION_EXPIRED");
  }
  // Do not echo raw GoTrue "Invalid JWT" as the only signal — always include NOT_AUTHENTICATED for the UI.
  return jsonErr("Session could not be validated.", 401, "NOT_AUTHENTICATED");
}

const userLevelSchema = z.enum([
  "highest",
  "admin",
  "manager",
  "lvl5",
  "lvl4",
  "lvl3",
  "lvl2",
  "lvl1",
]);

const CreateUserSchema = z.object({
  action: z.literal("create-user"),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["sales_rep", "field_tech", "office_admin", "manager", "owner"]),
  must_change_password: z.boolean().default(true),
  phone: z.string().max(30).optional().nullable(),
  phone_secondary: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  profile_picture_url: z.string().max(2000).optional().nullable(),
  google_drive_link: z.string().max(2000).optional().nullable(),
  signature_text: z.string().max(500).optional().nullable(),
  signature_url: z.string().max(2000).optional().nullable(),
  level: userLevelSchema.optional(),
  commission_rate: z.number().min(0).max(1).optional(),
  override_rate: z.number().min(0).max(1).optional(),
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
});

const ResetUserPasswordSchema = z.object({
  action: z.literal("reset-user-password"),
  userId: z.string().uuid(),
  new_password: z.string().min(8).max(128),
  must_change_password: z.boolean().default(true),
});

const EmailActionSchema = z.object({
  action: z.enum(["invite", "reset-password", "resend-invite"]),
  email: z.string().email().max(255),
});

const EditUserSchema = z.object({
  action: z.literal("edit-user"),
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional().nullable(),
});

const SoftDeleteUserSchema = z.object({
  action: z.literal("soft-delete-user"),
  userId: z.string().uuid(),
  reassign_to_user_id: z.string().uuid().optional().nullable(),
});

const RequestSchema = z.discriminatedUnion("action", [
  CreateUserSchema,
  ResetUserPasswordSchema,
  EmailActionSchema,
  EditUserSchema,
  SoftDeleteUserSchema,
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonErr("Method not allowed. Use POST.", 405, "VALIDATION_ERROR");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl) {
      console.error("Missing SUPABASE_URL in function env");
      return jsonErr("Missing server env: SUPABASE_URL", 500, "SERVER_ERROR");
    }
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY in function env");
      return jsonErr("Missing server env: SUPABASE_SERVICE_ROLE_KEY", 500, "SERVER_ERROR");
    }
    if (!anonKey) {
      console.error("Missing SUPABASE_ANON_KEY in function env");
      return jsonErr("Missing server env: SUPABASE_ANON_KEY", 500, "SERVER_ERROR");
    }

    const accessToken = parseBearerToken(req);
    if (!accessToken) {
      return jsonErr("Not authenticated: missing or invalid Bearer token", 401, "NOT_AUTHENTICATED");
    }

    const authHeader = `Bearer ${accessToken}`;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: getUserError } = await anonClient.auth.getUser(accessToken);
    if (getUserError) {
      return authFailureResponse(getUserError);
    }
    const caller = userData.user;
    if (!caller) {
      return jsonErr("Not authenticated", 401, "NOT_AUTHENTICATED");
    }

    const { data: isAdmin } = await anonClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return jsonErr("Unauthorized: admin role required", 403, "FORBIDDEN", {
        reason: "admin_required",
      });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonErr("Invalid JSON body", 400, "VALIDATION_ERROR");
    }
    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return jsonErr("Invalid input", 400, "VALIDATION_ERROR", {
        details: validation.error.issues.map((i) => i.message),
      });
    }
    const body = validation.data;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let result: Record<string, unknown> = {};

    // For edit-user and soft-delete-user, require "highest" level
    if (body.action === "edit-user" || body.action === "soft-delete-user") {
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("level")
        .eq("user_id", caller.id)
        .single();
      if (!callerProfile || callerProfile.level !== "highest") {
        return jsonErr("Unauthorized: Owner (Highest) role required", 403, "FORBIDDEN", {
          reason: "owner_required",
        });
      }
    }

    switch (body.action) {
      case "create-user": {
        const {
          email,
          password,
          full_name,
          role,
          must_change_password,
          phone,
          phone_secondary,
          address,
          manager_id,
          level,
          commission_rate,
          override_rate,
          active,
          verified,
        } = body;

        const norm = (s: string | null | undefined) =>
          s === undefined || s === null || String(s).trim() === "" ? null : String(s).trim();
        const profile_picture_url = norm(body.profile_picture_url);
        const google_drive_link = norm(body.google_drive_link);
        const signature_text = norm(body.signature_text);
        const signature_url = norm(body.signature_url);

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: full_name },
        });
        if (createError) {
          const duplicateEmailError =
            createError.message?.toLowerCase().includes("already") ||
            createError.message?.toLowerCase().includes("exists") ||
            createError.message?.toLowerCase().includes("duplicate");
          if (duplicateEmailError) {
            return jsonErr("A user with this email already exists.", 409, "DUPLICATE_EMAIL");
          }
          throw createError;
        }
        if (!newUser?.user?.id) {
          return jsonErr("Auth user was not created.", 500, "SERVER_ERROR");
        }

        const newAuthId = newUser.user.id;

        if (manager_id) {
          const { data: mgr } = await adminClient.from("profiles").select("id").eq("id", manager_id).maybeSingle();
          if (!mgr?.id) {
            return jsonErr("Invalid manager: profile not found.", 400, "VALIDATION_ERROR");
          }
        }

        const profilePatch: Record<string, unknown> = {
          must_change_password,
          name: full_name,
        };
        if (phone !== undefined && phone !== null) profilePatch.phone = phone;
        if (phone_secondary !== undefined && phone_secondary !== null) profilePatch.phone_secondary = phone_secondary;
        if (address !== undefined && address !== null) profilePatch.address = address;
        if (manager_id !== undefined) profilePatch.manager_id = manager_id;
        if (profile_picture_url !== undefined && profile_picture_url !== null) {
          profilePatch.profile_picture_url = profile_picture_url;
        }
        if (google_drive_link !== undefined && google_drive_link !== null) {
          profilePatch.google_drive_link = google_drive_link;
        }
        if (signature_text !== undefined && signature_text !== null) profilePatch.signature_text = signature_text;
        if (signature_url !== undefined && signature_url !== null) profilePatch.signature_url = signature_url;
        if (level !== undefined) profilePatch.level = level;
        if (commission_rate !== undefined) profilePatch.commission_rate = commission_rate;
        if (override_rate !== undefined) profilePatch.override_rate = override_rate;
        if (active !== undefined) profilePatch.active = active;
        if (verified !== undefined) profilePatch.verified = verified;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update(profilePatch)
          .eq("user_id", newAuthId);
        if (profileError) throw profileError;

        if (role) {
          const { error: roleError } = await adminClient
            .from("user_roles")
            .insert({ user_id: newAuthId, role });
          if (roleError) throw roleError;
        }

        await adminClient.from("audits").insert({
          user_id: caller.id,
          subject_user_id: newAuthId,
          entity_type: "user",
          action: "user_created",
          entity_id: newAuthId,
          details: {
            email,
            role,
            performed_by: caller.email,
            optional_fields: {
              has_phone: Boolean(phone),
              has_manager: Boolean(manager_id),
              has_level: Boolean(level),
            },
          },
        });

        result = { success: true, userId: newAuthId };
        break;
      }

      case "reset-user-password": {
        const { userId, new_password, must_change_password } = body;

        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
          password: new_password,
        });
        if (updateError) throw updateError;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ must_change_password })
          .eq("user_id", userId);
        if (profileError) console.error("Profile update error:", profileError);

        result = { success: true };
        break;
      }

      case "edit-user": {
        const { userId, name, email, phone } = body;

        // Build profile update
        const profileUpdate: Record<string, unknown> = {};
        const oldValues: Record<string, unknown> = {};

        // Fetch current profile for audit
        const { data: currentProfile } = await adminClient
          .from("profiles")
          .select("name, email, phone")
          .eq("user_id", userId)
          .single();

        if (name !== undefined) {
          oldValues.name = currentProfile?.name;
          profileUpdate.name = name;
        }
        if (phone !== undefined) {
          oldValues.phone = currentProfile?.phone;
          profileUpdate.phone = phone;
        }
        if (email !== undefined && email !== currentProfile?.email) {
          oldValues.email = currentProfile?.email;
          profileUpdate.email = email;

          // Update auth email too
          const { error: authError } = await adminClient.auth.admin.updateUserById(userId, { email });
          if (authError) throw authError;
        }

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await adminClient
            .from("profiles")
            .update(profileUpdate)
            .eq("user_id", userId);
          if (profileError) throw profileError;
        }

        // Audit with old/new values
        await adminClient.from("audits").insert({
          user_id: caller.id,
          subject_user_id: userId,
          entity_type: "user",
          action: "edit_user_contact",
          entity_id: userId,
          details: { old_values: oldValues, new_values: profileUpdate, performed_by: caller.email },
        });

        result = { success: true };
        break;
      }

      case "soft-delete-user": {
        const { userId, reassign_to_user_id } = body;

        // Prevent self-deletion
        if (userId === caller.id) {
          return jsonErr("Cannot delete your own account", 400, "VALIDATION_ERROR");
        }

        // Fetch user info for audit before deletion
        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("name, email")
          .eq("user_id", userId)
          .single();

        // Call the soft_delete_user function
        const { error: deleteError } = await adminClient.rpc("soft_delete_user", {
          _target_user_id: userId,
          _reassign_to_user_id: reassign_to_user_id || null,
        });
        if (deleteError) throw deleteError;

        // Disable the auth user
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years
        });
        if (authError) console.error("Auth ban error:", authError);

        // Audit
        await adminClient.from("audits").insert({
          user_id: caller.id,
          subject_user_id: userId,
          entity_type: "user",
          action: "soft_delete_user",
          entity_id: userId,
          details: {
            deleted_user_name: targetProfile?.name,
            deleted_user_email: targetProfile?.email,
            reassigned_to: reassign_to_user_id || null,
            performed_by: caller.email,
          },
        });

        result = { success: true };
        break;
      }

      case "invite": {
        const { email } = body;
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}`,
        });
        if (error) throw error;
        result = { success: true, userId: data.user.id };
        break;
      }

      case "reset-password": {
        const { email } = body;
        const { error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${req.headers.get("origin") || supabaseUrl}` },
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "resend-invite": {
        const { email } = body;
        // List users to find existing user, then generate a magic link instead of re-inviting
        const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = userList.users.find((u: any) => u.email === email);
        if (existingUser) {
          // User already exists — generate a recovery/magic link instead
          const { error: linkError } = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${req.headers.get("origin") || supabaseUrl}` },
          });
          if (linkError) throw linkError;
        } else {
          const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${req.headers.get("origin") || supabaseUrl}`,
          });
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${(body as any).action}`);
    }

    // Write audit log (for actions that don't already audit above)
    if (!["edit-user", "soft-delete-user", "create-user"].includes(body.action)) {
      const uid = "userId" in body ? body.userId : null;
      await adminClient.from("audits").insert({
        user_id: caller.id,
        subject_user_id: typeof uid === "string" ? uid : null,
        entity_type: "user",
        action: body.action,
        entity_id: uid,
        details: { email: "email" in body ? body.email : undefined, performed_by: caller.email },
      });
    }

    return json(result);
  } catch (error: unknown) {
    const e = error as { message?: string; status?: number; details?: unknown; code?: string; name?: string };
    const status = typeof e?.status === "number" && e.status >= 400 ? e.status : 400;
    console.error("user-admin error:", {
      message: e?.message,
      status,
      details: e?.details ?? null,
      code: e?.code ?? null,
      name: e?.name ?? null,
    });
    const extras = e?.details != null ? { details: e.details } : undefined;
    return jsonErr(
      e?.message || "An error occurred processing your request",
      status,
      "SERVER_ERROR",
      extras,
    );
  }
});
