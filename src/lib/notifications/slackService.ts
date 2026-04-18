import { supabase } from "@/integrations/supabase/client";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
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

function formatSlackNotifyResponseError(payload: SlackNotifyFunctionResponse): string {
  const err = payload.error?.trim() || "slack-notify request failed";
  const suffix = payload.details ? ` ${payload.details}` : "";
  return `${err}${suffix}`;
}

async function getSlackNotifyInvokeFailureMessage(
  data: SlackNotifyFunctionResponse | null | undefined,
  error: unknown,
): Promise<string> {
  if (data && typeof data.error === "string" && data.error.trim()) {
    return formatSlackNotifyResponseError(data);
  }

  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    let rawFallback = "";
    try {
      const raw = await res.clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw) as SlackNotifyFunctionResponse;
          if (typeof body.error === "string" && body.error.trim()) {
            return formatSlackNotifyResponseError(body);
          }
        } catch {
          rawFallback = raw;
        }
      }
    } catch {
      rawFallback = "";
    }
    if (rawFallback) return rawFallback;
    return error.message;
  }

  if (error instanceof FunctionsRelayError) {
    return "Edge Function relay error. Check slack-notify deployment and project ref.";
  }

  if (error instanceof FunctionsFetchError) {
    const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
    if (!hasSupabaseUrl) {
      return "Supabase URL is missing (VITE_SUPABASE_URL). Configure frontend env vars and restart the app.";
    }
    return `Could not reach slack-notify (${error.message}). Confirm the function is deployed and your Supabase URL matches this environment.`;
  }

  if (error instanceof Error) return error.message;
  return "Unexpected error while invoking slack-notify.";
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
    throw new Error(await getSlackNotifyInvokeFailureMessage(data, error));
  }

  if (data?.error) {
    throw new Error(formatSlackNotifyResponseError(data));
  }

  return data ?? { success: false, error: "No response from slack-notify function." };
}

/** Test channel message using the form value if provided, otherwise global_settings. */
export async function sendSlackConnectionTest(webhookFromForm?: string): Promise<void> {
  let webhookUrl = webhookFromForm?.trim() ?? "";

  if (!webhookUrl) {
    const { data, error } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", SLACK_WEBHOOK_URL_KEY)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to load Slack webhook URL from global settings.");
    }

    webhookUrl = parseWebhookValue(data?.value).trim();
  }

  if (!webhookUrl) {
    throw new Error("Enter a Slack webhook URL (and save it to keep it) before testing the connection.");
  }

  await invokeSlackNotify({
    type: "channel",
    message: "\u2705 PRS CRM Slack connection is working!",
    channelWebhookUrl: webhookUrl,
  });
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
