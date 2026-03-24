import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Link2, RefreshCw, Shield, BookOpen, ExternalLink } from "lucide-react";

// --- Shared hooks ---

function useIntegrationConfig(key: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["integration-config", key, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integrations_config")
        .select("*")
        .eq("key", key)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.value as any ?? null;
    },
  });
}

function useUpsertIntegrationConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: existing } = await (supabase as any)
        .from("integrations_config")
        .select("id")
        .eq("key", key)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("integrations_config")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("integrations_config")
          .insert({ key, value, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ["integration-config", key] });
    },
  });
}

// --- Main component ---

export function IntegrationsTab() {
  const { toast } = useToast();
  const { data: googleConfig } = useIntegrationConfig("google_calendar");
  const { data: calendlyConfig } = useIntegrationConfig("calendly");
  const { data: qbConfig } = useIntegrationConfig("quickbooks");
  const upsertConfig = useUpsertIntegrationConfig();

  const isGoogleConnected = googleConfig?.enabled === true;
  const isCalendlyConnected = calendlyConfig?.enabled === true;
  const isQbConnected = qbConfig?.enabled === true;

  const handleToggleGoogle = async (enabled: boolean) => {
    try {
      await upsertConfig.mutateAsync({ key: "google_calendar", value: { ...googleConfig, enabled } });
      toast({ title: enabled ? "Google Calendar enabled" : "Google Calendar disabled" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleCalendly = async (enabled: boolean) => {
    try {
      await upsertConfig.mutateAsync({ key: "calendly", value: { ...calendlyConfig, enabled } });
      toast({ title: enabled ? "Calendly sync enabled" : "Calendly sync disabled" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleQb = async (enabled: boolean) => {
    try {
      await upsertConfig.mutateAsync({ key: "quickbooks", value: { ...qbConfig, enabled } });
      toast({ title: enabled ? "QuickBooks sync enabled" : "QuickBooks sync disabled" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleQbConnect = () => {
    toast({ title: "OAuth Activation Pending", description: "QuickBooks OAuth connect will be available once your admin configures API credentials." });
  };

  const handleQbSync = () => {
    toast({ title: "Categories Conquered!", description: "QuickBooks category sync will pull Chart of Accounts once OAuth is active." });
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Google Calendar */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Google Calendar
          </CardTitle>
          <Badge variant={isGoogleConnected ? "default" : "outline"} className="text-xs">
            {isGoogleConnected ? "Connected" : "Not Connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sync appointments bi-directionally with Google Calendar.
          </p>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Sync</Label>
              <p className="text-xs text-muted-foreground">Push/pull events to Google Calendar</p>
            </div>
            <Switch checked={isGoogleConnected} onCheckedChange={handleToggleGoogle} />
          </div>
          {isGoogleConnected && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sync on Create</Label>
                  <p className="text-xs text-muted-foreground">Auto-push new appointments</p>
                </div>
                <Switch checked={googleConfig?.sync_on_create !== false} onCheckedChange={(v) =>
                  upsertConfig.mutate({ key: "google_calendar", value: { ...googleConfig, sync_on_create: v } })
                } />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sync on Update</Label>
                  <p className="text-xs text-muted-foreground">Auto-update when rescheduled</p>
                </div>
                <Switch checked={googleConfig?.sync_on_update !== false} onCheckedChange={(v) =>
                  upsertConfig.mutate({ key: "google_calendar", value: { ...googleConfig, sync_on_update: v } })
                } />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Pull Events</Label>
                  <p className="text-xs text-muted-foreground">Import Google Calendar events</p>
                </div>
                <Switch checked={googleConfig?.pull_events === true} onCheckedChange={(v) =>
                  upsertConfig.mutate({ key: "google_calendar", value: { ...googleConfig, pull_events: v } })
                } />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Google Calendar integration requires an API key configured in your backend secrets. Contact your administrator to set up OAuth credentials.</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendly */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Calendly
          </CardTitle>
          <Badge variant={isCalendlyConnected ? "default" : "outline"} className="text-xs">
            {isCalendlyConnected ? "Connected" : "Not Connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect Calendly to auto-create appointments when customers book through your scheduling links.
          </p>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Calendly</Label>
              <p className="text-xs text-muted-foreground">Receive webhook notifications for bookings</p>
            </div>
            <Switch checked={isCalendlyConnected} onCheckedChange={handleToggleCalendly} />
          </div>
          {isCalendlyConnected && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Calendly API key should be configured as a backend secret (CALENDLY_API_KEY). Contact your administrator.</span>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendly-webhook`}
                    className="text-xs font-mono bg-muted/30"
                  />
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendly-webhook`);
                    toast({ title: "Copied!" });
                  }}>Copy</Button>
                </div>
                <p className="text-xs text-muted-foreground">Paste this URL in your Calendly webhook settings.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QuickBooks */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> QuickBooks
            <Badge variant="outline" className="text-[10px] font-normal">Coming Soon</Badge>
          </CardTitle>
          <Badge variant={isQbConnected ? "default" : "outline"} className="text-xs">
            {isQbConnected ? "Connected" : "Not Connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sync expense categories from your QuickBooks Chart of Accounts. Pull/push expense types for seamless financial tracking.
          </p>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable QB Sync</Label>
              <p className="text-xs text-muted-foreground">Sync expense categories bi-directionally</p>
            </div>
            <Switch checked={isQbConnected} onCheckedChange={handleToggleQb} />
          </div>
          {isQbConnected && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleQbConnect}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Connect via OAuth
                </Button>
                <Button size="sm" variant="outline" onClick={handleQbSync}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync Categories Now
                </Button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>QuickBooks OAuth requires QB_CLIENT_ID and QB_CLIENT_SECRET configured as backend secrets. Categories will map to your Expense Types with a qb_account_id reference.</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mapped Categories Preview</Label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    ["QB: Job Materials", "→ Materials"],
                    ["QB: Subcontractor", "→ Labor"],
                    ["QB: Permit Fees", "→ Permits"],
                    ["QB: Office Supplies", "→ Company"],
                  ].map(([from, to]) => (
                    <div key={from} className="flex items-center gap-2 py-1 px-2 bg-muted/40 rounded font-mono">
                      <span className="text-muted-foreground">{from}</span>
                      <span className="text-primary">{to}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Sync Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent sync activity. Sync logs will appear here once integrations are active.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
