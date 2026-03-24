// MOBILE-PORT: Maps to React Native form screen
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { useDistributionRules, useUpdateDistributionRules } from "@/hooks/useLeadArsenal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function DistributionRulesTab() {
  const { data: rules, isLoading } = useDistributionRules();
  const update = useUpdateDistributionRules();

  const [minContracts, setMinContracts] = useState(4);
  const [batchSize, setBatchSize] = useState(10);
  const [strict, setStrict] = useState(true);

  useEffect(() => {
    if (rules) {
      setMinContracts(rules.min_contracts_required);
      setBatchSize(rules.lead_batch_size);
      setStrict(rules.enforce_strict);
    }
  }, [rules]);

  const handleSave = () => {
    if (!rules) return;
    update.mutate({
      id: rules.id,
      min_contracts_required: minContracts,
      lead_batch_size: batchSize,
      enforce_strict: strict,
    });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading rules…</div>;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Distribution Rules
        </CardTitle>
        <CardDescription>Control how leads are gated and distributed to reps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Min Contracts Required for Next Batch</Label>
          <Input
            type="number"
            value={minContracts}
            onChange={(e) => setMinContracts(Number(e.target.value))}
            min={1}
            className="min-h-[44px] mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Reps must sign this many contracts before receiving more leads.</p>
        </div>

        <div>
          <Label>Lead Batch Size</Label>
          <Input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            min={1}
            className="min-h-[44px] mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Number of leads per batch when deploying to a rep.</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Enforce Strict Gating</p>
            <p className="text-xs text-muted-foreground">Block next batch until min contracts met.</p>
          </div>
          <Switch checked={strict} onCheckedChange={setStrict} />
        </div>

        <Button onClick={handleSave} disabled={update.isPending} className="w-full min-h-[48px]">
          {update.isPending ? "Saving…" : "Save Distribution Rules"}
        </Button>
      </CardContent>
    </Card>
  );
}
