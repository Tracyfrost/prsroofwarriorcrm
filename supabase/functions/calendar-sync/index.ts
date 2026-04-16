import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID v4 regex for input validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Validate action
    if (typeof action !== "string" || !["sync_to_google"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync_to_google - push an appointment to Google Calendar
    if (action === "sync_to_google") {
      const { appointment_id } = body;

      // Validate appointment_id is a UUID
      if (!appointment_id || typeof appointment_id !== "string" || !UUID_RE.test(appointment_id)) {
        return new Response(JSON.stringify({ error: "Invalid appointment_id — must be a valid UUID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
      if (!GOOGLE_API_KEY) {
        return new Response(JSON.stringify({ error: "Google Calendar API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user's OAuth token from integrations_config
      const { data: config } = await supabase
        .from("integrations_config")
        .select("value")
        .eq("key", "google_calendar")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!config?.value?.oauth_token) {
        return new Response(JSON.stringify({ error: "Google Calendar not connected. Please authorize in Settings." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: appt } = await supabase
        .from("appointments")
        .select("*, jobs(job_id, customers(name)), customers(name)")
        .eq("id", appointment_id)
        .single();

      if (!appt) {
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const duration = appt.duration_minutes || 60;
      const startDate = new Date(appt.date_time);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const displayName =
        appt.jobs?.customers?.name ?? (appt as { customers?: { name?: string } }).customers?.name ?? "Appointment";
      const googleEvent = {
        summary: appt.title || displayName,
        description: `Job: ${appt.jobs?.job_id ?? "—"}\nNotes: ${appt.notes || ""}`,
        start: { dateTime: startDate.toISOString(), timeZone: appt.timezone || "UTC" },
        end: { dateTime: endDate.toISOString(), timeZone: appt.timezone || "UTC" },
      };

      // This would use the actual Google Calendar API
      // For now, log and return success
      console.log("Would sync to Google Calendar:", googleEvent);

      return new Response(JSON.stringify({ success: true, message: "Google Calendar sync placeholder" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
