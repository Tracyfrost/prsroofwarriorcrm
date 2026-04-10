import { useState, useEffect, useMemo } from "react";
import { useJob } from "@/hooks/useJobs";
import { useUpdateSquares } from "@/hooks/useJobProduction";
import { useUploadDocument, formatSupabaseErr } from "@/hooks/useDocuments";
import { useAuth } from "@/lib/auth";
import { resolvePlanningRoofSquares } from "@/lib/roofSquares";
import { extractPdfText } from "@/lib/quickMeasurePdf";
import { parseGafRoofAreaSqFt, sqFtToRoofingSquares } from "@/lib/quickMeasureParse";
import { getSquaresReported } from "@/lib/reports/repResolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Save } from "lucide-react";

interface Props {
  jobId: string;
}

const PITCH_OPTIONS = [
  { value: "1.0", label: "6/12 = 1.0", mult: 1.0 },
  { value: "1.12", label: "7/12 = 1.12", mult: 1.12 },
  { value: "1.20", label: "8/12 = 1.20", mult: 1.2 },
  { value: "1.41", label: "12/12 = 1.41", mult: 1.41 },
] as const;

export function MeasurementsTab({ jobId }: Props) {
  const { toast } = useToast();
  const { data: job } = useJob(jobId);
  const updateSquares = useUpdateSquares();
  const uploadDoc = useUploadDocument();
  const { user } = useAuth();

  const planningSq = useMemo(
    () => resolvePlanningRoofSquares(job ?? null, (job?.qualification ?? {}) as Record<string, unknown>),
    [job],
  );

  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [pitchKey, setPitchKey] = useState<string>("1.0");
  const pitchMult = PITCH_OPTIONS.find((p) => p.value === pitchKey)?.mult ?? 1.0;

  const { calculatedSqFt, calculatedRoofingSq } = useMemo(() => {
    if (!length || !width) return { calculatedSqFt: 0, calculatedRoofingSq: 0 };
    const l = parseFloat(length);
    const w = parseFloat(width);
    if (!Number.isFinite(l) || !Number.isFinite(w)) return { calculatedSqFt: 0, calculatedRoofingSq: 0 };
    const sqFt = l * w * pitchMult;
    return { calculatedSqFt: sqFt, calculatedRoofingSq: sqFtToRoofingSquares(sqFt) };
  }, [length, width, pitchMult]);

  const [actualInstalled, setActualInstalled] = useState("");
  const [finalSq, setFinalSq] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    setActualInstalled(
      job?.squares_actual_installed != null ? String(job.squares_actual_installed) : "",
    );
  }, [job?.squares_actual_installed]);

  useEffect(() => {
    setFinalSq(job?.squares_final != null ? String(job.squares_final) : "");
  }, [job?.squares_final]);

  const toNum = (s: string): number | null => {
    const n = parseFloat(s);
    return s.trim() === "" ? null : Number.isNaN(n) ? null : n;
  };

  const saveMasterSquares = async () => {
    if (calculatedRoofingSq <= 0) return;
    try {
      await updateSquares.mutateAsync({
        id: jobId,
        squares_estimated: calculatedRoofingSq,
      });
      toast({
        title: "Planning squares saved",
        description: `${calculatedRoofingSq} SQ (master for War Room, ordering & CSV).`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const importQuickMeasurePdf = async (file: File) => {
    setImportBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const text = await extractPdfText(buf);
      const sqFt = parseGafRoofAreaSqFt(text);
      if (sqFt == null || sqFt <= 0) {
        toast({
          title: "Could not read roof area",
          description: "Expected GAF QuickMeasure-style text: “Roof Area … sq ft”.",
          variant: "destructive",
        });
        return;
      }
      const roofingSq = sqFtToRoofingSquares(sqFt);
      await updateSquares.mutateAsync({
        id: jobId,
        squares_estimated: roofingSq,
      });
      try {
        await uploadDoc.mutateAsync({
          file,
          fileBytes: buf,
          jobId,
          type: "measurements",
          uploadedBy: user?.id,
        });
        toast({
          title: "QuickMeasure imported",
          description: `${roofingSq} SQ (${sqFt.toLocaleString()} sq ft) as planning master. PDF saved under job documents (Measurements).`,
        });
      } catch (uploadErr: unknown) {
        const uploadMsg = formatSupabaseErr(uploadErr);
        toast({
          title: "Squares updated; PDF not saved",
          description: `Planning squares were saved (${roofingSq} SQ), but the PDF could not be stored: ${uploadMsg}. Upload it manually in Documents → Measurements.`,
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast({ title: "PDF import failed", description: msg, variant: "destructive" });
    } finally {
      setImportBusy(false);
    }
  };

  const saveActualInstalled = async () => {
    const act = toNum(actualInstalled);
    if (act !== null && act < 0) {
      toast({ title: "Actual installed squares must be ≥ 0", variant: "destructive" });
      return;
    }
    try {
      await updateSquares.mutateAsync({
        id: jobId,
        squares_actual_installed: act ?? undefined,
      });
      toast({ title: "Actual installed squares saved" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const saveFinalSquares = async () => {
    const fin = toNum(finalSq);
    if (fin !== null && fin < 0) {
      toast({ title: "Final squares must be ≥ 0", variant: "destructive" });
      return;
    }
    try {
      await updateSquares.mutateAsync({
        id: jobId,
        squares_final: fin ?? undefined,
      });
      toast({ title: "Final squares saved" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const reported = job
    ? getSquaresReported({
        number_of_squares: (job as { number_of_squares?: number | null }).number_of_squares ?? null,
        squares_estimated: job.squares_estimated ?? null,
        squares_actual_installed: toNum(actualInstalled) ?? job.squares_actual_installed ?? null,
        squares_final: toNum(finalSq) ?? job.squares_final ?? null,
      })
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Planning squares — master */}
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <Calculator className="h-5 w-5 shrink-0" />
            Planning squares (master)
          </CardTitle>
          <p className="text-xs text-emerald-700 dark:text-emerald-400/90">
            Used by War Room, Qualification, job ordering and CSV export. Line quantities stay in the War Room tab.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Length (ft)</Label>
                <Input
                  type="number"
                  min={0}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="e.g. 56"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Width (ft)</Label>
                <Input
                  type="number"
                  min={0}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="e.g. 49"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pitch multiplier</Label>
              <Select value={pitchKey} onValueChange={setPitchKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PITCH_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-white p-4 text-center shadow-sm dark:border-emerald-800 dark:bg-card">
              <p className="text-xs text-muted-foreground">Calculated roofing squares (100 sq ft = 1 SQ)</p>
              <p className="text-5xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {calculatedRoofingSq > 0 ? calculatedRoofingSq : "—"}
              </p>
              {calculatedSqFt > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ {Math.round(calculatedSqFt).toLocaleString()} sq ft footprint × pitch
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void saveMasterSquares()}
              className="w-full"
              disabled={calculatedRoofingSq <= 0 || updateSquares.isPending}
            >
              Save as planning master
            </Button>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
              Footprint × pitch → sq ft, then ÷ 100 for roofing squares.
            </p>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">Import GAF QuickMeasure PDF</Label>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              disabled={importBusy}
              className="cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importQuickMeasurePdf(f);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Roof area is extracted from the PDF text (GAF “Roof Area … sq ft”) and saved as planning squares. The PDF
              is also stored on the job under Documents → Measurements. Other vendors may need manual entry.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actual installed */}
      <Card>
        <CardHeader>
          <CardTitle>Actual installed squares</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">For field / crew verification; used in reports.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={actualInstalled}
            onChange={(e) => setActualInstalled(e.target.value)}
            className="text-center text-5xl font-bold tabular-nums h-auto py-6"
            placeholder="0"
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={updateSquares.isPending}
            onClick={() => void saveActualInstalled()}
          >
            <Save className="mr-2 h-4 w-4" />
            Save actual installed
          </Button>
        </CardContent>
      </Card>

      {/* Final / billed */}
      <Card>
        <CardHeader>
          <CardTitle>Final / billed squares</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">As-built or invoiced total; used in reports.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={finalSq}
            onChange={(e) => setFinalSq(e.target.value)}
            className="text-center text-5xl font-bold tabular-nums h-auto py-6"
            placeholder="0"
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={updateSquares.isPending}
            onClick={() => void saveFinalSquares()}
          >
            <Save className="mr-2 h-4 w-4" />
            Save final squares
          </Button>
          {reported > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Reported total squares: <span className="font-semibold text-foreground">{reported}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resolver summary */}
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-xs text-muted-foreground">Current planning squares (resolver — used everywhere)</p>
          <p className="text-6xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {planningSq > 0 ? planningSq.toLocaleString() : "—"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            War Room · Qualification · Ordering · Reports — prefers <span className="font-medium">squares_estimated</span>{" "}
            when set; otherwise scope or legacy fallbacks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
