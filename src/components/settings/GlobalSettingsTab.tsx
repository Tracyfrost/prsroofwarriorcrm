import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGlobalSettings, useUpdateGlobalSetting } from "@/hooks/useCustomizations";
import { Settings2, Receipt, Zap, Bell, Brain, MapPin, Search } from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  invoices: { label: "Invoices & Documents", icon: <Receipt className="h-4 w-4" />, description: "Control how invoices and documents are generated" },
  defaults: { label: "Defaults & Requirements", icon: <Settings2 className="h-4 w-4" />, description: "Set default values and required fields" },
  financials: { label: "Financials", icon: <Receipt className="h-4 w-4" />, description: "Configure financial defaults and calculations" },
  notifications: { label: "Notifications", icon: <Bell className="h-4 w-4" />, description: "Control notification preferences" },
  ai: { label: "AI & Automation", icon: <Brain className="h-4 w-4" />, description: "Enable AI-powered features and automation" },
  integrations: { label: "Maps & Search", icon: <MapPin className="h-4 w-4" />, description: "Configure address navigation and predictive search" },
  general: { label: "General", icon: <Zap className="h-4 w-4" />, description: "General system settings" },
};

function isBoolean(val: any): boolean {
  return val === true || val === false || val === "true" || val === "false";
}

function isNumeric(val: any): boolean {
  return typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val !== "true" && val !== "false");
}

export function GlobalSettingsTab() {
  const { toast } = useToast();
  const { data: settings = [], isLoading } = useGlobalSettings();
  const updateSetting = useUpdateGlobalSetting();

  // Group by category
  const grouped = settings.reduce<Record<string, typeof settings>>((acc, s) => {
    const cat = s.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const handleUpdate = async (id: string, value: any) => {
    try {
      await updateSetting.mutateAsync({ id, value });
      toast({ title: "Setting updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_META[category] || CATEGORY_META.general;
        return (
          <Card key={category} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {meta.icon} {meta.label}
              </CardTitle>
              <CardDescription className="text-xs">{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((setting) => {
                const val = setting.value;
                const boolVal = val === true || val === "true";

                if (isBoolean(val)) {
                  return (
                    <div key={setting.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          {setting.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Label>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch
                        checked={boolVal}
                        onCheckedChange={(checked) => handleUpdate(setting.id, checked)}
                      />
                    </div>
                  );
                }

                if (isNumeric(val)) {
                  return (
                    <div key={setting.id} className="flex items-center justify-between rounded-lg border p-3 gap-4">
                      <div className="space-y-0.5 flex-1">
                        <Label className="text-sm font-medium">
                          {setting.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Label>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Input
                        type="number"
                        defaultValue={Number(val)}
                        className="h-8 w-24 font-mono text-sm"
                        onBlur={(e) => {
                          const num = parseFloat(e.target.value);
                          if (!isNaN(num)) handleUpdate(setting.id, num);
                        }}
                      />
                    </div>
                  );
                }

                // String fallback
                return (
                  <div key={setting.id} className="flex items-center justify-between rounded-lg border p-3 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">
                        {setting.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Label>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Input
                      defaultValue={String(val)}
                      className="h-8 w-48 text-sm"
                      onBlur={(e) => handleUpdate(setting.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
