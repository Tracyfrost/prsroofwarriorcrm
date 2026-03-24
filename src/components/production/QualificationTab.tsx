import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateQualification, type Qualification } from "@/hooks/useJobProduction";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_CONFIG: Record<string, { color: string; icon: typeof ShieldCheck; label: string }> = {
  Qualified: { color: "bg-success/20 text-success-foreground", icon: ShieldCheck, label: "Qualified" },
  Review: { color: "bg-warning/20 text-warning-foreground", icon: AlertTriangle, label: "Under Review" },
  Underfunded: { color: "bg-destructive/20 text-destructive-foreground", icon: XCircle, label: "Underfunded" },
};

interface Props {
  jobId: string;
  qualification: Qualification;
  numberOfSquares: number;
}

export function QualificationTab({ jobId, qualification, numberOfSquares }: Props) {
  const [estRoofSq, setEstRoofSq] = useState("");
  const [estCost, setEstCost] = useState("");
  const [firstCheckFunds, setFirstCheckFunds] = useState("");
  const updateQual = useUpdateQualification();
  const { toast } = useToast();

  useEffect(() => {
    setEstRoofSq(String(qualification?.estimate_roof_sq ?? numberOfSquares ?? ""));
    setEstCost(String(qualification?.estimate_cost ?? ""));
    setFirstCheckFunds(String(qualification?.first_check_funds ?? ""));
  }, [qualification, numberOfSquares]);

  const handleSave = async () => {
    try {
      await updateQual.mutateAsync({
        id: jobId,
        qualification: {
          estimate_roof_sq: parseFloat(estRoofSq) || 0,
          estimate_cost: parseFloat(estCost) || 0,
          first_check_funds: parseFloat(firstCheckFunds) || 0,
        },
      });
      toast({ title: "Qualification saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Computed values (from DB trigger, but also show locally)
  const variance = (parseFloat(estCost) || 0) - (parseFloat(firstCheckFunds) || 0);
  const status = variance <= 0 ? "Qualified" : variance < 10000 ? "Review" : "Underfunded";
  const displayStatus = qualification?.status || status;
  const displayVariance = qualification?.variance ?? variance;
  const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Review;
  const StatusIcon = config.icon;

  const chartData = [
    { name: "Estimate Cost", value: parseFloat(estCost) || 0 },
    { name: "First Check", value: parseFloat(firstCheckFunds) || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <Card className="shadow-card">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`rounded-full p-3 ${config.color}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Badge className={config.color + " text-sm px-3 py-1"}>{config.label}</Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Variance: <span className={`font-bold ${displayVariance > 0 ? "text-destructive" : "text-success-foreground"}`}>
                ${Math.abs(displayVariance).toLocaleString()}
              </span>
              {displayVariance > 0 ? " underfunded" : " surplus"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Qualification Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Roof Squares</Label>
              <Input type="number" value={estRoofSq} onChange={(e) => setEstRoofSq(e.target.value)} step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Cost ($)</Label>
              <Input type="number" value={estCost} onChange={(e) => setEstCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">First Check Funds ($)</Label>
              <Input type="number" value={firstCheckFunds} onChange={(e) => setFirstCheckFunds(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={updateQual.isPending} className="w-full">
              <Save className="mr-2 h-3 w-3" /> Save & Recalculate
            </Button>
          </CardContent>
        </Card>

        {/* Chart comparison */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Estimate vs Funds</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--success, 142 76% 36%))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
