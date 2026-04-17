import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGlobalSettings, useUpdateGlobalSetting } from "@/hooks/useCustomizations";
import {
  SLACK_NOTIFICATION_SETTING_KEY,
  SLACK_NOTIFICATION_UI_ROWS,
  SLACK_WEBHOOK_URL_KEY,
  SlackNotificationType,
} from "@/lib/notifications/notificationTypes";
import { invalidateSlackNotificationCache, sendSlackConnectionTest } from "@/lib/notifications/slackService";
import { Slack } from "lucide-react";

const ALL_KEYS_TO_CHECK = [
  SLACK_WEBHOOK_URL_KEY,
  ...SLACK_NOTIFICATION_UI_ROWS.map((r) => SLACK_NOTIFICATION_SETTING_KEY[r.type]),
];

function parseStringSetting(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return String(val);
}

function parseBoolSetting(val: unknown, fallback: boolean): boolean {
  if (val === true || val === false) return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
}

function defaultToggleMap(): Record<SlackNotificationType, boolean> {
  const m = {} as Record<SlackNotificationType, boolean>;
  for (const row of SLACK_NOTIFICATION_UI_ROWS) {
    m[row.type] = true;
  }
  return m;
}

export function SlackSettings() {
  const { toast } = useToast();
  const { data: settings = [], isLoading } = useGlobalSettings();
  const updateSetting = useUpdateGlobalSetting();

  const idByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.id;
    }
    return map;
  }, [settings]);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [toggles, setToggles] = useState<Record<SlackNotificationType, boolean>>(defaultToggleMap);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const webhookRow = settings.find((s) => s.key === SLACK_WEBHOOK_URL_KEY);
    setWebhookUrl(parseStringSetting(webhookRow?.value));

    setToggles((prev) => {
      const next = { ...prev };
      for (const row of SLACK_NOTIFICATION_UI_ROWS) {
        const key = SLACK_NOTIFICATION_SETTING_KEY[row.type];
        const s = settings.find((x) => x.key === key);
        next[row.type] = parseBoolSetting(s?.value, true);
      }
      return next;
    });
    setHydrated(true);
  }, [isLoading, settings]);

  const handleSave = async () => {
    const updates: { id: string; key: string; value: unknown }[] = [];

    const webhookId = idByKey[SLACK_WEBHOOK_URL_KEY];
    if (webhookId) {
      updates.push({ id: webhookId, key: SLACK_WEBHOOK_URL_KEY, value: webhookUrl });
    }

    for (const row of SLACK_NOTIFICATION_UI_ROWS) {
      const key = SLACK_NOTIFICATION_SETTING_KEY[row.type];
      const id = idByKey[key];
      if (id) {
        updates.push({ id, key, value: toggles[row.type] });
      }
    }

    const missing = ALL_KEYS_TO_CHECK.filter((k) => !idByKey[k]);
    if (missing.length > 0) {
      toast({
        title: "Settings not ready",
        description: `Missing global_settings rows: ${missing.join(", ")}. Apply the latest database migration.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await Promise.all(updates.map((u) => updateSetting.mutateAsync({ id: u.id, value: u.value })));
      invalidateSlackNotificationCache();
      toast({ title: "Slack settings saved" });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    try {
      await sendSlackConnectionTest();
      toast({ title: "Test sent", description: "Check your Slack channel for the test message." });
    } catch (e: unknown) {
      toast({
        title: "Test failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  if (isLoading || !hydrated) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading Slack settings...</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Slack className="h-4 w-4" />
            Slack
          </CardTitle>
          <CardDescription className="text-xs">
            Channel messages use your incoming webhook. Direct messages use the Slack app configured for the PRS CRM project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Slack webhook URL</Label>
            <p className="text-xs text-muted-foreground">
              Stored in global settings as <code className="text-[10px]">{SLACK_WEBHOOK_URL_KEY}</code>. Used for channel notifications.
            </p>
            <Input
              type="password"
              autoComplete="off"
              className="font-mono text-sm"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleTest} disabled={updateSetting.isPending}>
              Test Connection
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Notification types</CardTitle>
          <CardDescription className="text-xs">Turn categories on or off. Changes apply after you click Save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SLACK_NOTIFICATION_UI_ROWS.map((row) => (
            <div key={row.type} className="flex items-center justify-between rounded-lg border p-3 gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm font-medium">
                  {row.label}{" "}
                  <span className="text-muted-foreground font-normal">({row.subtitle})</span>
                </Label>
                <p className="text-xs text-muted-foreground capitalize">{row.delivery} delivery</p>
              </div>
              <Switch
                checked={toggles[row.type]}
                onCheckedChange={(checked) => setToggles((prev) => ({ ...prev, [row.type]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
