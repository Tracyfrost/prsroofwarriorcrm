import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyCalendlySignature(body: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false;

  // Calendly sends signatures in format: t=timestamp,v1=signature
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) parts[key.trim()] = value.trim();
  }

  const timestamp = parts["t"];
  const v1Signature = parts["v1"];
  if (!timestamp || !v1Signature) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  const requestAge = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (requestAge > 300) return false;

  // Compute expected signature: HMAC-SHA256(secret, timestamp.body)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = encoder.encode(`${timestamp}.${body}`);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === v1Signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify webhook signature
    const calendlySecret = Deno.env.get("CALENDLY_WEBHOOK_SECRET");
    const body = await req.text();

    if (!calendlySecret) {
      console.error("CALENDLY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signature = req.headers.get("Calendly-Webhook-Signature");
    const isValid = await verifyCalendlySignature(body, signature, calendlySecret);
    if (!isValid) {
      console.error("Calendly webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    // Validate event type
    if (!event || !["invitee.created", "invitee.canceled"].includes(event)) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Calendly invitee.created webhook
    if (event === "invitee.created") {
      const invitee = payload.payload;
      const startTime = invitee?.scheduled_event?.start_time;
      const name = invitee?.name || invitee?.email || "Calendly Booking";
      const externalId = invitee?.uri || invitee?.scheduled_event?.uri;
      const durationMinutes = invitee?.scheduled_event?.duration_minutes || 60;

      if (!startTime || typeof startTime !== "string") {
        return new Response(JSON.stringify({ error: "No valid start_time in payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract job_id from Calendly custom questions/tracking params
      const customQuestions = invitee?.questions_and_answers || [];
      const jobQuestion = customQuestions.find(
        (q: any) => q?.question?.toLowerCase()?.includes("job") || q?.answer?.match(/^[0-9a-f-]{36}$/i)
      );
      const trackingJobId = invitee?.tracking?.utm_content; // Can pass job_id via UTM

      let jobId = jobQuestion?.answer || trackingJobId;

      // Validate job_id format (UUID)
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (jobId && UUID_RE.test(jobId)) {
        // Verify job exists and is active
        const { data: job } = await supabase
          .from("jobs")
          .select("id, status")
          .eq("id", jobId)
          .is("deleted_at", null)
          .single();

        if (!job) {
          console.error("Calendly webhook: job_id from custom field not found or deleted:", jobId);
          return new Response(JSON.stringify({ error: "Invalid job reference" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        jobId = job.id;
      } else {
        // No valid job_id provided — reject instead of guessing
        console.error("Calendly webhook: No valid job_id provided in custom fields or tracking");
        return new Response(
          JSON.stringify({ error: "job_id required in Calendly custom questions or tracking params" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await supabase
        .from("appointments")
        .insert({
          job_id: jobId,
          date_time: startTime,
          title: `Calendly: ${String(name).slice(0, 200)}`,
          external_id: externalId ? String(externalId).slice(0, 500) : null,
          duration_minutes: Math.min(Math.max(Number(durationMinutes) || 60, 1), 1440),
          outcome: "",
        });

      if (insertError) throw insertError;

      console.log("Created appointment from Calendly booking:", String(name).slice(0, 100));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle cancellation
    if (event === "invitee.canceled") {
      const uri = payload.payload?.scheduled_event?.uri;
      if (uri && typeof uri === "string") {
        await supabase
          .from("appointments")
          .delete()
          .eq("external_id", uri.slice(0, 500));
        console.log("Deleted appointment from Calendly cancellation");
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Calendly webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
