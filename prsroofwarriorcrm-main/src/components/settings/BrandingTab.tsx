import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWhiteLabel, useUpdateWhiteLabel, useCreateWhiteLabel } from "@/hooks/useWhiteLabel";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { DEFAULT_PHRASES } from "@/components/BattleTooltip";
import { Shield, Palette, Type, Upload, Image, Loader2, MessageSquare } from "lucide-react";

const DEFAULT_COLORS: Record<string, string> = {
  command_slate: "210 30% 15%",
  command_olive: "85 30% 35%",
  command_amber: "38 92% 50%",
  command_iron: "210 15% 40%",
};

const COLOR_META: Record<string, { label: string; cssVar: string }> = {
  command_slate: { label: "Command Slate", cssVar: "--command-slate" },
  command_olive: { label: "Command Olive", cssVar: "--command-olive" },
  command_amber: { label: "Command Amber (Accent)", cssVar: "--accent" },
  command_iron: { label: "Command Iron", cssVar: "--command-iron" },
};

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#888888";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: config, isLoading } = useWhiteLabel();
  const updateConfig = useUpdateWhiteLabel();
  const createConfig = useCreateWhiteLabel();

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>(DEFAULT_COLORS);
  const [tooltipPhrases, setTooltipPhrases] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when data loads
  if (config && !initialized) {
    setCompanyName(config.company_name);
    setLogoUrl(config.logo_url ?? "");
    setAppName((config as any).app_name ?? "");
    setColors({ ...DEFAULT_COLORS, ...config.colors });
    setTooltipPhrases(config.tooltip_phrases ?? {});
    setInitialized(true);
  }
  if (!config && !isLoading && !initialized) {
    setCompanyName("Warrior Command");
    setAppName("PRS CRM");
    setInitialized(true);
  }

  // Apply CSS vars live
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, hsl]) => {
      const meta = COLOR_META[key];
      if (meta) root.style.setProperty(meta.cssVar, hsl);
    });
    return () => {
      Object.values(COLOR_META).forEach(({ cssVar }) => {
        root.style.removeProperty(cssVar);
      });
    };
  }, [colors]);

  const handleColorChange = (key: string, hex: string) => {
    setColors(prev => ({ ...prev, [key]: hexToHsl(hex) }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `tenants/${user?.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
      setLogoUrl(urlData.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setLogoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (config) {
        await updateConfig.mutateAsync({
          id: config.id,
          company_name: companyName,
          app_name: appName || null,
          logo_url: logoUrl || null,
          colors,
          tooltip_phrases: Object.keys(tooltipPhrases).length > 0 ? tooltipPhrases : null,
        });
      } else {
        await createConfig.mutateAsync({
          tenant_id: user?.id ?? "",
          company_name: companyName,
          app_name: appName || null,
          logo_url: logoUrl || null,
          colors,
          icon_style: "knot-shield",
          tooltip_phrases: Object.keys(tooltipPhrases).length > 0 ? tooltipPhrases : null,
          theme_pack: null,
        });
      }
      setLogoPreview(null);
      toast({ title: "Branding updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const resetColors = () => setColors(DEFAULT_COLORS);

  const displayLogo = logoPreview || logoUrl;

  return (
    <div className="space-y-6 mt-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 font-display uppercase tracking-wide">
            <Shield className="h-4 w-4" /> White-Label Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Preview */}
          <div className="rounded-xl gradient-command p-6 text-white">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={`${companyName || "Warrior Command"} logo`}
                  className="h-12 w-12 rounded-lg object-contain bg-white/10 p-1"
                />
              ) : (
                <KnotShieldLogo size={48} />
              )}
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wide">
                  {companyName || "Warrior Command"}
                </h2>
                <p className="text-xs text-white/60 uppercase tracking-[0.15em]">Command CRM</p>
              </div>
            </div>
          </div>

          {/* Identity Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" /> Company Name
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Warrior Command"
              />
              <p className="text-xs text-muted-foreground">
                Replaces all app branding dynamically.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" /> App Name (Browser Tab)
              </Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="PRS CRM"
              />
              <p className="text-xs text-muted-foreground">
                Controls the base browser tab title (e.g. Jobs – {`{AppName}`}). Falls back to company name if empty.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" /> Company Logo
              </Label>
              <div className="flex gap-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setLogoPreview(null); }}
                  placeholder="https://... or upload below"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload logo"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload or paste URL. Max 2MB. Uses knot shield by default.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Picker Card */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-display uppercase tracking-wide">
              <Palette className="h-4 w-4" /> Tactical Palette
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetColors} className="text-xs">
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Customize your command colors. Changes preview live and persist on save.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(COLOR_META).map(([key, { label }]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={hslToHex(colors[key] || DEFAULT_COLORS[key])}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-10 w-10 rounded-md border border-input cursor-pointer bg-transparent p-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{colors[key]}</p>
                </div>
                <div
                  className="h-8 w-8 rounded-md border border-border"
                  style={{ backgroundColor: `hsl(${colors[key]})` }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Tooltip Phrases Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 font-display uppercase tracking-wide">
            <MessageSquare className="h-4 w-4" /> Battle Tooltips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Customize warrior rally cries shown on hover. Leave blank to use defaults.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(DEFAULT_PHRASES).map(([key, defaultVal]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                <Input
                  value={tooltipPhrases[key] ?? ""}
                  onChange={(e) =>
                    setTooltipPhrases((prev) => {
                      const next = { ...prev };
                      if (e.target.value.trim()) {
                        next[key] = e.target.value;
                      } else {
                        delete next[key];
                      }
                      return next;
                    })
                  }
                  placeholder={defaultVal}
                  className="h-8 text-xs"
                  maxLength={60}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateConfig.isPending || createConfig.isPending}
        className="w-full sm:w-auto"
      >
        {updateConfig.isPending || createConfig.isPending ? "Saving..." : "Save Branding"}
      </Button>
    </div>
  );
}
