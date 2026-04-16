import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSiteCamMedia, getMediaUrl, type SiteCamMedia } from "@/hooks/useSiteCam";
import { useFeatureGate } from "@/hooks/useSubscription";
import { Brain, Loader2, ShieldAlert, Lock } from "lucide-react";

interface AiDamageButtonProps {
  media: SiteCamMedia;
}

interface DamageTag {
  label: string;
  confidence: number;
  description: string;
}

interface DamageResult {
  tags: DamageTag[];
  overall_severity: string;
  summary: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  severe: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300",
};

export function AiDamageButton({ media }: AiDamageButtonProps) {
  const { canUseAiDetection } = useFeatureGate();
  const updateMedia = useUpdateSiteCamMedia();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DamageResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!canUseAiDetection) {
      toast({
        title: "Pro Feature",
        description: "AI damage detection requires a Pro or Enterprise plan.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const imageUrl = getMediaUrl(media.annotated_path || media.original_path);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be logged in to use AI analysis");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-damage-detect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: DamageResult = await resp.json();
      setResult(data);
      setShowResult(true);

      // Save tags back to media record
      const tagLabels = data.tags.map(
        (t) => `${t.label} (${Math.round(t.confidence * 100)}%)`
      );
      const existingTags = media.tags || [];
      const mergedTags = [...new Set([...existingTags, ...tagLabels])];

      await updateMedia.mutateAsync({
        id: media.id,
        tags: mergedTags,
      });

      toast({ title: "AI analysis complete", description: data.summary });
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }, [media, canUseAiDetection, updateMedia, toast]);

  if (media.type !== "photo") return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={analyzing}
        className="gap-1.5"
      >
        {analyzing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : !canUseAiDetection ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )}
        {analyzing ? "Analyzing..." : "Analyze Damage"}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Damage Analysis
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-medium">Severity:</span>
                <Badge className={SEVERITY_COLORS[result.overall_severity] || ""}>
                  {result.overall_severity}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{result.summary}</p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Detected Issues:</p>
                {result.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No damage detected</p>
                ) : (
                  result.tags.map((tag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {tag.label.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{tag.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 shrink-0 font-mono text-xs">
                        {Math.round(tag.confidence * 100)}%
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** AI damage analysis for an arbitrary signed image URL (e.g. Job Files). Does not persist tags. */
export function AiDamageAnalyzeUrlButton({ imageUrl }: { imageUrl: string | null | undefined }) {
  const { canUseAiDetection } = useFeatureGate();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DamageResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!canUseAiDetection) {
      toast({
        title: "Pro Feature",
        description: "AI damage detection requires a Pro or Enterprise plan.",
        variant: "destructive",
      });
      return;
    }
    if (!imageUrl) {
      toast({ title: "Not ready", description: "Image link is still loading.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be logged in to use AI analysis");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-damage-detect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl }),
        },
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: DamageResult = await resp.json();
      setResult(data);
      setShowResult(true);
      toast({ title: "AI analysis complete", description: data.summary });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      toast({ title: "AI Error", description: msg, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }, [imageUrl, canUseAiDetection, toast]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleAnalyze()}
        disabled={analyzing || !imageUrl}
        className="gap-1.5"
      >
        {analyzing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : !canUseAiDetection ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )}
        {analyzing ? "Analyzing..." : "Analyze Damage"}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Damage Analysis
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-medium">Severity:</span>
                <Badge className={SEVERITY_COLORS[result.overall_severity] || ""}>
                  {result.overall_severity}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{result.summary}</p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Detected Issues:</p>
                {result.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No damage detected</p>
                ) : (
                  result.tags.map((tag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border bg-muted/50 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">
                          {tag.label.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{tag.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 shrink-0 font-mono text-xs">
                        {Math.round(tag.confidence * 100)}%
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
