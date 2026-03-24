import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JobDataSchema = z.object({
  status: z.string().max(50).optional(),
  trade_types: z.array(z.string().max(50)).max(20).optional(),
  financials: z.record(z.unknown()).optional(),
  dates: z.record(z.unknown()).optional(),
  job_id: z.string().max(50).optional(),
  customer_name: z.string().max(200).optional(),
  site_address: z.record(z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
}).passthrough().refine(
  (data) => JSON.stringify(data).length <= 10000,
  { message: "Job data payload too large" }
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const validation = JobDataSchema.safeParse(body.jobData);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.issues.map(i => i.message) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jobData = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are an insurance claim prediction expert for roofing jobs. Given this job data, predict the likelihood of claim approval and estimated timeline. Be concise (2-3 sentences). Return JSON with fields: prediction (string), confidence (string: high/medium/low), estimated_days (number).

Job data: ${JSON.stringify(jobData)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an AI assistant that predicts insurance claim outcomes for roofing projects. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "claim_prediction",
              description: "Return a claim prediction with confidence and timeline.",
              parameters: {
                type: "object",
                properties: {
                  prediction: { type: "string", description: "A 2-3 sentence prediction of the claim outcome" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_days: { type: "number", description: "Estimated days until resolution" },
                },
                required: ["prediction", "confidence", "estimated_days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "claim_prediction" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let prediction;

    if (toolCall?.function?.arguments) {
      prediction = JSON.parse(toolCall.function.arguments);
    } else {
      prediction = { prediction: "Unable to generate prediction at this time.", confidence: "low", estimated_days: 14 };
    }

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("claim-predict error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
