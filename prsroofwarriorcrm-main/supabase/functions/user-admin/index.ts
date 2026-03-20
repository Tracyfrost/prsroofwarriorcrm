import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CreateUserSchema = z.object({
  action: z.literal("create-user"),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().max(100).optional().default(""),
  role: z.enum(["sales_rep", "field_tech", "office_admin", "manager", "owner"]).optional(),
  must_change_password: z.boolean().default(true),
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin using their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Check admin status
    const { data: isAdmin } = await anonClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Unauthorized: admin role required");

    const rawBody = await req.json();
    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error.issues.map(i => i.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        return new Response(
          JSON.stringify({ error: "Unauthorized: Owner (Highest) role required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    switch (body.action) {
      case "create-user": {
        const { email, password, full_name, role, must_change_password } = body;

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: full_name },
        });
        if (createError) throw createError;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ must_change_password, name: full_name })
          .eq("user_id", newUser.user.id);
        if (profileError) console.error("Profile update error:", profileError);

        if (role) {
          const { error: roleError } = await adminClient
            .from("user_roles")
            .insert({ user_id: newUser.user.id, role });
          if (roleError) console.error("Role assign error:", roleError);
        }

        result = { success: true, userId: newUser.user.id };
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
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
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
    if (!["edit-user", "soft-delete-user"].includes(body.action)) {
      await adminClient.from("audits").insert({
        user_id: caller.id,
        entity_type: "user",
        action: body.action,
        entity_id: "userId" in body ? body.userId : null,
        details: { email: "email" in body ? body.email : undefined, performed_by: caller.email },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("user-admin error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
