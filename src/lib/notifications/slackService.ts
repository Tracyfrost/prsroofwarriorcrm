import { supabase } from "@/integrations/supabase/client";
import {
  ALL_SLACK_SETTING_KEYS,
  SLACK_NOTIFICATION_SETTING_KEY,
  SLACK_NOTIFICATION_UI_ROWS,
  SLACK_WEBHOOK_URL_KEY,
  type SlackNotificationType,
} from "@/lib/notifications/notificationTypes";

type SlackNotifyFunctionResponse = {
  success?: boolean;
  error?: string;
  details?: string;
  status?: number;
  type?: "channel" | "dm";
};

type SlackSettingsCache = {
  webhookUrl: string;
  toggles: Record<SlackNotificationType, boolean>;
};

let cache: SlackSettingsCache | null = null;
let loadPromise: Promise<void> | null = null;

function defaultToggles(): Record<SlackNotificationType, boolean> {
  return {
    [SlackNotificationType.NewLeadChannel]: true,
    [SlackNotificationType.LeadAssignedDm]: true,
    [SlackNotificationType.JobStatusChangedChannel]: true,
    [SlackNotificationType.JobAssignedDm]: true,
    [SlackNotificationType.PaymentReceivedChannel]: true,
    [SlackNotificationType.LargePaymentAlertDm]: true,
    [SlackNotificationType.FollowUpScheduledDm]: true,
    [SlackNotificationType.OverdueFollowUpDm]: true,
  };
}

function parseWebhookValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  return String(raw);
}

function parseToggleValue(raw: unknown): boolean | null {
  if (raw === true || raw === false) return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export function invalidateSlackNotificationCache(): void {
  cache = null;
  loadPromise = null;
}

export async function ensureSlackSettingsLoaded(): Promise<void> {
  if (cache) return;
  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    const { data, error } = await supabase
      .from("global_settings")
      .select("key, value")
      .in("key", ALL_SLACK_SETTING_KEYS);

    if (error) throw error;

    const byKey = new Map<string, unknown>();
    for (const row of data ?? []) {
      byKey.set(row.key, row.value);
    }

    const toggles = defaultToggles();
    for (const row of SLACK_NOTIFICATION_UI_ROWS) {
      const t = row.type;
      const key = SLACK_NOTIFICATION_SETTING_KEY[t];
      const parsed = parseToggleValue(byKey.get(key));
      if (parsed !== null) toggles[t] = parsed;
    }

    const webhookRaw = byKey.get(SLACK_WEBHOOK_URL_KEY);
    const webhookUrl = parseWebhookValue(webhookRaw);

    cache = { webhookUrl, toggles };
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

function isNotificationEnabled(type: SlackNotificationType): boolean {
  if (!cache) return true;
  return cache.toggles[type] !== false;
}

async function invokeSlackNotify(
  body: {
    type: "channel" | "dm";
    message: string;
    channelWebhookUrl?: string;
    slackUserId?: string;
  },
): Promise<SlackNotifyFunctionResponse> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data, error } = await supabase.functions.invoke<SlackNotifyFunctionResponse>(
    "slack-notify",
    {
      body,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to invoke slack-notify function.");
  }

  if (data?.error) {
    const suffix = data.details ? ` ${data.details}` : "";
    throw new Error(`${data.error}${suffix}`);
  }

  return data ?? { success: false, error: "No response from slack-notify function." };
}

/** Test channel message using persisted webhook in global_settings. */
export async function sendSlackConnectionTest(): Promise<void> {
  console.log("1. Starting test connection");
  const { data, error } = await supabase
    .from("global_settings")
    .select("value")
    .eq("key", "slack_webhook_url")
    .single();
  console.log("DB result:", JSON.stringify(data), "error:", error?.message);

  if (error) {
    throw new Error(error.message || "Failed to load Slack webhook URL from global settings.");
  }

  const webhookUrl = parseWebhookValue(data?.value).trim();
  console.log("2. Fetched webhook URL:", webhookUrl?.slice(0, 20));
  if (!webhookUrl) {
    throw new Error("Save a Slack webhook URL before testing the connection.");
  }

  console.log(
    "3. Calling edge function with payload:",
    JSON.stringify({ type: "channel", channelWebhookUrl: webhookUrl?.slice(0, 20) }),
  );

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "channel",
      message: "\u2705 PRS CRM Slack connection is working!",
      channelWebhookUrl: webhookUrl,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(responseText || `Slack test failed with status ${response.status}.`);
  }
}

export async function sendChannelNotification(type: SlackNotificationType, message: string): Promise<void> {
  await ensureSlackSettingsLoaded();
  if (!isNotificationEnabled(type)) return;
  const webhookUrl = cache?.webhookUrl?.trim() ?? "";
  if (!webhookUrl) return;

  await invokeSlackNotify({
    type: "channel",
    message,
    channelWebhookUrl: webhookUrl,
  });
}

export async function sendDMNotification(
  type: SlackNotificationType,
  slackUserId: string,
  message: string,
): Promise<void> {
  await ensureSlackSettingsLoaded();
  if (!isNotificationEnabled(type)) return;
  const id = slackUserId.trim();
  if (!id) return;

  await invokeSlackNotify({
    type: "dm",
    slackUserId: id,
    message,
  });
}
