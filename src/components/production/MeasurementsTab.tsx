import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Ruler, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSquares } from "@/hooks/useJobProduction";
import { getSquaresReported } from "@/lib/reports/repResolution";

interface Props {
  jobId: string;
  /** Legacy single value; display as COALESCE(actual, final, number_of_squares) */
  numberOfSquares: number;
  squaresEstimated?: number | null;
  squaresActualInstalled?: number | null;
  squaresFinal?: number | null;
}

export function MeasurementsTab({
  jobId,
  numberOfSquares,
  squaresEstimated = null,
  squaresActualInstalled = null,
  squaresFinal = null,
}: Props) {
  const [estimated, setEstimated] = useState("");
  const [actualInstalled, setActualInstalled] = useState("");
  const [finalSq, setFinalSq] = useState("");
  const [calcLength, setCalcLength] = useState("");
  const [calcWidth, setCalcWidth] = useState("");
  const [calcPitch, setCalcPitch] = useState("1.0");
  const updateSquares = useUpdateSquares();
  const { toast } = useToast();

  const hasNewFields =
    squaresEstimated != null ||
    squaresActualInstalled != null ||
    squaresFinal != null;

  useEffect(() => {
    setEstimated(
      squaresEstimated != null ? String(squaresEstimated) : ""
    );
  }, [squaresEstimated]);

  useEffect(() => {
    setActualInstalled(
      squaresActualInstalled != null ? String(squaresActualInstalled) : (hasNewFields ? "" : String(numberOfSquares || ""))
    );
  }, [squaresActualInstalled, numberOfSquares, hasNewFields]);

  useEffect(() => {
    setFinalSq(
      squaresFinal != null ? String(squaresFinal) : ""
    );
  }, [squaresFinal]);

  const toNum = (s: string): number | null => {
    const n = parseFloat(s);
    return s.trim() === "" ? null : (isNaN(n) ? null : n);
  };

  const handleSave = async () => {
    const est = toNum(estimated);
    const act = toNum(actualInstalled);
    const fin = toNum(finalSq);
    if (est !== null && est < 0) {
      toast({ title: "Estimated squares must be ≥ 0", variant: "destructive" });
      return;
    }
    if (act !== null && act < 0) {
      toast({ title: "Actual installed squares must be ≥ 0", variant: "destructive" });
      return;
    }
    if (fin !== null && fin < 0) {
      toast({ title: "Final squares must be ≥ 0", variant: "destructive" });
      return;
    }
    try {
      await updateSquares.mutateAsync({
        id: jobId,
        squares_estimated: est ?? undefined,
        squares_actual_installed: act ?? undefined,
        squares_final: fin ?? undefined,
      });
      toast({ title: "Measurements saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCalc = () => {
    const l = parseFloat(calcLength) || 0;
    const w = parseFloat(calcWidth) || 0;
    const p = parseFloat(calcPitch) || 1.0;
    const sqft = l * w * p;
    const result = (sqft / 100).toFixed(2);
    setActualInstalled(result);
  };

  const reported = getSquaresReported({
    number_of_squares: numberOfSquares || null,
    squares_actual_installed: toNum(actualInstalled) ?? squaresActualInstalled,
    squares_final: toNum(finalSq) ?? squaresFinal,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4" /> Roof Squares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Squares</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Actual Installed Squares</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={actualInstalled}
                onChange={(e) => setActualInstalled(e.target.value)}
                placeholder="e.g. 25.5"
              />
              <p className="text-xs text-muted-foreground">Used for &quot;Total Squares Installed&quot; in reports. 1 square = 100 sq ft.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Final Squares</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={finalSq}
                onChange={(e) => setFinalSq(e.target.value)}
                placeholder="e.g. 26"
              />
            </div>
            <Button onClick={handleSave} disabled={updateSquares.isPending} className="w-full">
              <Save className="mr-2 h-3 w-3" /> Save Measurement
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Square Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Length (ft)</Label>
                <Input type="number" value={calcLength} onChange={(e) => setCalcLength(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Width (ft)</Label>
                <Input type="number" value={calcWidth} onChange={(e) => setCalcWidth(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pitch Multiplier</Label>
              <Input type="number" value={calcPitch} onChange={(e) => setCalcPitch(e.target.value)} step="0.05" />
              <p className="text-xs text-muted-foreground">Standard: 1.0, 6/12 pitch: 1.12, 8/12: 1.20, 12/12: 1.41</p>
            </div>
            <Button variant="outline" onClick={handleCalc} className="w-full">
              <Calculator className="mr-2 h-3 w-3" /> Calculate → Set Actual Installed
            </Button>
            {reported > 0 && (
              <p className="text-center text-lg font-bold text-foreground">{reported} squares (reported)</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
