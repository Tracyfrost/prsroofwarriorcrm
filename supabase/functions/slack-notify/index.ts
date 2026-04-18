import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SlackNotifyType = "channel" | "dm";

interface SlackNotifyPayload {
  type: SlackNotifyType;
  message: string;
  channelWebhookUrl?: string;
  slackUserId?: string;
}

type SlackApiResponse = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function isValidPayload(value: unknown): value is SlackNotifyPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;
  const isValidType = payload.type === "channel" || payload.type === "dm";
  const hasMessage = typeof payload.message === "string" && payload.message.trim().length > 0;
  const validWebhook =
    payload.channelWebhookUrl === undefined || typeof payload.channelWebhookUrl === "string";
  const validUserId = payload.slackUserId === undefined || typeof payload.slackUserId === "string";

  return isValidType && hasMessage && validWebhook && validUserId;
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed. Use POST." }, 405);
    }

    let payload: SlackNotifyPayload;
    try {
      const rawBody = await req.json();
      if (!isValidPayload(rawBody)) {
        return json(
          {
            error:
              "Invalid payload. Expected { type: 'channel' | 'dm', message: string, channelWebhookUrl?: string, slackUserId?: string }",
          },
          400,
        );
      }
      payload = rawBody;
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    const message = payload.message.trim();
    if (payload.type === "channel") {
      const webhookUrl = payload.channelWebhookUrl?.trim() || Deno.env.get("SLACK_WEBHOOK_URL");
      if (!webhookUrl || webhookUrl === "SLACK_WEBHOOK_URL") {
        return json(
          {
            error:
              "Missing Slack webhook URL. Provide channelWebhookUrl or set SLACK_WEBHOOK_URL.",
          },
          500,
        );
      }

      console.log("webhookUrl resolved:", webhookUrl?.slice(0, 30));

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      if (!webhookResponse.ok) {
        const details = await webhookResponse.text();
        return json(
          {
            error: "Slack channel notification failed.",
            details: details || webhookResponse.statusText,
            status: webhookResponse.status,
          },
          502,
        );
      }

      return json({ success: true, type: "channel" });
    }

    const slackUserId = payload.slackUserId?.trim();
    if (!slackUserId) {
      return json({ error: "slackUserId is required when type is 'dm'." }, 400);
    }

    const botToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!botToken) {
      return json({ error: "Missing SLACK_BOT_TOKEN environment variable." }, 500);
    }

    const dmResponse = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: message,
      }),
    });

    let dmJson: SlackApiResponse | null = null;
    try {
      dmJson = (await dmResponse.json()) as SlackApiResponse;
    } catch {
      dmJson = null;
    }

    if (!dmResponse.ok || !dmJson?.ok) {
      return json(
        {
          error: "Slack DM notification failed.",
          details: dmJson?.error ?? dmResponse.statusText,
          status: dmResponse.status,
        },
        502,
      );
    }

    return json({ success: true, type: "dm", channel: dmJson.channel ?? slackUserId });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return json({ error: "Internal server error.", details }, 500);
  }
});
