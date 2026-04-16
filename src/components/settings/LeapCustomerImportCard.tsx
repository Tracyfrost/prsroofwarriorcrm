import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useLeadSources } from "@/hooks/useCustomizations";
import { normalizeLeadSourceKey } from "@/lib/intake/normalizeLeadSourceKey";
import { mapLeapRowsToCustomers, LEAP_CUSTOMER_HEADERS } from "@/lib/leapCustomerCsv";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

const BATCH_SIZE = 50;

export function LeapCustomerImportCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: leadSources = [] } = useLeadSources(true);

  const importableSources = useMemo(
    () =>
      leadSources.filter(
        (s) => s.active && s.name && String(s.name).trim() !== "" && !s.requires_pool,
      ),
    [leadSources],
  );

  const [leadSourceName, setLeadSourceName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    processed: number;
    errors: number;
  } | null>(null);

  const selectValue = importableSources.some((s) => s.name === leadSourceName)
    ? leadSourceName
    : undefined;

  const normalizedLeadSource =
    (normalizeLeadSourceKey(leadSourceName) ?? leadSourceName) || null;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setImportResult(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[];
          setParsedRows(data);
          toast({
            title: "CSV parsed",
            description: `${data.length} data row(s) in ${file.name}`,
          });
        },
        error: (err) => {
          toast({ title: "Parse error", description: err.message, variant: "destructive" });
        },
      });
      e.target.value = "";
    },
    [toast],
  );

  const handleImport = async () => {
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to import customers.",
        variant: "destructive",
      });
      return;
    }
    if (!leadSourceName || !normalizedLeadSource) {
      toast({
        title: "Lead source required",
        description: "Choose a lead source for imported customers.",
        variant: "destructive",
      });
      return;
    }
    const sourceValid = importableSources.some((s) => s.name === normalizedLeadSource);
    if (!sourceValid) {
      toast({
        title: "Invalid lead source",
        description: "Pick an active source from the list (pooled sources are not available for bulk import).",
        variant: "destructive",
      });
      return;
    }
    if (parsedRows.length === 0) {
      toast({ title: "No rows", description: "Select a LEAP customer export CSV first.", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const { records, rowErrors } = mapLeapRowsToCustomers(parsedRows, {
      leadSourceKey: normalizedLeadSource,
      createdBy: user.id,
    });

    let processed = 0;
    let insertErrors = 0;
    const batchErrorMessages: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;

      const { error } = await supabase.from("customers").insert(batch as any);
      if (error) {
        insertErrors += batch.length;
        batchErrorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        processed += batch.length;
      }

      setImportProgress(
        Math.min(100, Math.round(((i + batch.length) / Math.max(records.length, 1)) * 100)),
      );
    }

    if (records.length === 0) setImportProgress(100);

    const skipErrors = rowErrors.length;
    const totalErrorCount = skipErrors + insertErrors;

    const logErrors = [
      ...rowErrors.slice(0, 80).map((r) => `Row ${r.rowIndex}: ${r.reason}`),
      ...batchErrorMessages,
    ];

    if (user.id) {
      await supabase.from("import_logs").insert({
        user_id: user.id,
        file_name: fileName || "leap-customers.csv",
        status: totalErrorCount > 0 ? "partial" : "completed",
        total_rows: parsedRows.length,
        processed_count: processed,
        error_count: totalErrorCount,
        errors: logErrors,
        completed_at: new Date().toISOString(),
      });
    }

    setImporting(false);
    setImportResult({ processed, errors: totalErrorCount });
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["customer-count"] });

    toast({
      title: totalErrorCount > 0 ? "Import finished with issues" : "LEAP import complete",
      description: `${processed} customer(s) imported${totalErrorCount > 0 ? `, ${totalErrorCount} row(s) skipped or failed` : ""}`,
      variant: totalErrorCount > 0 ? "destructive" : "default",
    });
  };

  return (
    <Card className="shadow-card border-muted">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">Import LEAP customers</CardTitle>
            <CardDescription>
              Upload a LEAP <span className="font-medium">Customer Listing</span> CSV. Records
              are added as PRS <span className="font-medium">customers</span> (not vendor allies).
              Choose a lead source to tag them for assignment and reporting.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Expected columns include: {LEAP_CUSTOMER_HEADERS.slice(0, 6).join(", ")}, and mailing
          address fields. Pooled lead sources are excluded here; add those customers from the
          Customers screen if a package must be consumed.
        </p>

        <div className="space-y-2">
          <Label className="text-xs">Lead source for imported customers</Label>
          <Select
            value={selectValue}
            onValueChange={setLeadSourceName}
            disabled={importableSources.length === 0}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select lead source…" />
            </SelectTrigger>
            <SelectContent>
              {importableSources.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.display_name || s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {importableSources.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              No eligible lead sources. Add one under Settings → Customizations, or disable
              &quot;requires pool&quot; for a source you want to use here.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose CSV
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-[44px]"
            disabled={
              importing ||
              parsedRows.length === 0 ||
              !selectValue ||
              importableSources.length === 0
            }
            onClick={handleImport}
          >
            {importing ? "Importing…" : "Import to CRM"}
          </Button>
          {fileName ? (
            <span className="text-xs text-muted-foreground">
              {fileName} — {parsedRows.length} row(s)
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{importing ? "Importing…" : importResult ? "Done" : "Idle"}</span>
            {parsedRows.length > 0 ? <span>{parsedRows.length} rows in file</span> : null}
          </div>
          <Progress value={importing ? importProgress : importResult ? 100 : 0} className="h-2" />
        </div>

        {importResult ? (
          <div
            className={`flex items-center gap-2 p-3 rounded-md text-sm ${
              importResult.errors > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {importResult.errors > 0 ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>
              {importResult.processed} imported
              {importResult.errors > 0 ? `, ${importResult.errors} skipped or failed` : ""}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
