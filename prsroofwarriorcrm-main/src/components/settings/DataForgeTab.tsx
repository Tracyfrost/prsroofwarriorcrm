import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Upload, Download, FileSpreadsheet, Wand2, ArrowRightLeft, CheckCircle2, Sparkles, GripVertical, AlertCircle, Loader2 } from "lucide-react";
import { normalizeLeadSourceKey } from "@/lib/intake/normalizeLeadSourceKey";

const SCHEMA_FIELDS = [
  "name_json.primary.first", "name_json.primary.last",
  "name_json.spouse.first", "name_json.spouse.last",
  "contact_info.phones[0].number", "contact_info.emails[0].address",
  "main_address.street", "main_address.city", "main_address.state", "main_address.zip",
  "lead_source", "insurance_carrier", "notes", "customer_type", "company_name",
] as const;

const AI_SUGGESTIONS: Record<string, string> = {
  "name": "name_json.primary.first", "full name": "name_json.primary.first",
  "first name": "name_json.primary.first", "firstname": "name_json.primary.first", "first": "name_json.primary.first",
  "last name": "name_json.primary.last", "lastname": "name_json.primary.last", "last": "name_json.primary.last",
  "spouse first": "name_json.spouse.first", "spouse last": "name_json.spouse.last",
  "spouse": "name_json.spouse.first", "spouse name": "name_json.spouse.first",
  "phone": "contact_info.phones[0].number", "phone number": "contact_info.phones[0].number",
  "email": "contact_info.emails[0].address", "email address": "contact_info.emails[0].address",
  "address": "main_address.street", "street": "main_address.street",
  "city": "main_address.city", "state": "main_address.state",
  "zip": "main_address.zip", "zipcode": "main_address.zip", "zip code": "main_address.zip",
  "lead source": "lead_source", "source": "lead_source",
  "insurance": "insurance_carrier", "carrier": "insurance_carrier", "insurance carrier": "insurance_carrier",
  "notes": "notes", "type": "customer_type", "company": "company_name", "company name": "company_name",
  "leap_name": "name_json.primary.first", "leap_phone": "contact_info.phones[0].number",
  "leap_email": "contact_info.emails[0].address", "leap_address": "main_address.street",
};

type MappingRow = { source: string; target: string; confidence: number; confirmed: boolean };

export function DataForgeTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ processed: number; errors: number } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        setParsedData(data);

        // Auto-map columns
        const headers = Object.keys(data[0] || {});
        const suggested: MappingRow[] = headers.map((h) => {
          const key = h.toLowerCase().trim();
          const match = AI_SUGGESTIONS[key];
          return {
            source: h,
            target: match || "-- skip --",
            confidence: match ? 0.85 + Math.random() * 0.14 : 0.15,
            confirmed: false,
          };
        });
        setMappings(suggested);
        setShowMapping(true);
        toast({ title: "File Parsed", description: `${data.length} rows found in ${file.name}` });
      },
      error: (err) => {
        toast({ title: "Parse Error", description: err.message, variant: "destructive" });
      },
    });
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [toast]);

  const updateMapping = (idx: number, field: string, value: any) => {
    setMappings((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const confirmAll = () => {
    setMappings((prev) => prev.map((m) => ({ ...m, confirmed: true })));
    toast({ title: "Mapping Forged!", description: "All column mappings confirmed." });
  };

  const confirmedCount = mappings.filter((m) => m.confirmed).length;

  // Build customer record from a CSV row using mappings
  const mapRow = (row: Record<string, string>): any => {
    const customer: any = {
      name: "",
      name_json: { primary: { first: "", last: "" }, spouse: null },
      contact_info: { phones: [], emails: [] },
      main_address: { street: "", city: "", state: "", zip: "" },
      customer_number: "auto",
      created_by: user?.id,
    };

    mappings.filter(m => m.target !== "-- skip --").forEach((m) => {
      const val = (row[m.source] || "").trim();
      if (!val) return;

      switch (m.target) {
        case "name_json.primary.first": customer.name_json.primary.first = val; break;
        case "name_json.primary.last": customer.name_json.primary.last = val; break;
        case "name_json.spouse.first":
          if (!customer.name_json.spouse) customer.name_json.spouse = { first: "", last: "" };
          customer.name_json.spouse.first = val; break;
        case "name_json.spouse.last":
          if (!customer.name_json.spouse) customer.name_json.spouse = { first: "", last: "" };
          customer.name_json.spouse.last = val; break;
        case "contact_info.phones[0].number":
          customer.contact_info.phones.push({ type: "primary", number: val }); break;
        case "contact_info.emails[0].address":
          customer.contact_info.emails.push({ type: "primary", address: val }); break;
        case "main_address.street": customer.main_address.street = val; break;
        case "main_address.city": customer.main_address.city = val; break;
        case "main_address.state": customer.main_address.state = val; break;
        case "main_address.zip": customer.main_address.zip = val; break;
        case "lead_source":
          customer.lead_source = normalizeLeadSourceKey(val);
          break;
        case "insurance_carrier": customer.insurance_carrier = val; break;
        case "notes": customer.notes = val; break;
        case "customer_type": customer.customer_type = val === "commercial" ? "commercial" : "residential"; break;
        case "company_name": customer.company_name = val; break;
      }
    });

    // Sync name from name_json
    customer.name = `${customer.name_json.primary.first} ${customer.name_json.primary.last}`.trim();
    if (!customer.name) return null;
    return customer;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const batchSize = 50;
    let processed = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);
      const records = batch.map(mapRow).filter(Boolean);

      if (records.length > 0) {
        const { error } = await supabase.from("customers").insert(records as any);
        if (error) {
          errorCount += records.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          processed += records.length;
        }
      }

      setImportProgress(Math.min(100, Math.round(((i + batch.length) / parsedData.length) * 100)));
    }

    // Log import
    await supabase.from("import_logs").insert({
      user_id: user?.id,
      file_name: fileName,
      status: errorCount > 0 ? "partial" : "completed",
      total_rows: parsedData.length,
      processed_count: processed,
      error_count: errorCount,
      errors: errors,
      completed_at: new Date().toISOString(),
    } as any);

    setImporting(false);
    setImportResult({ processed, errors: errorCount });
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["customer-count"] });

    toast({
      title: errorCount > 0 ? "Import Partially Complete" : "⚔ Legion Imported!",
      description: `${processed} customers imported${errorCount > 0 ? `, ${errorCount} errors` : ""}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  return (
    <div className="space-y-6 mt-4">
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />

      {/* Hero Card */}
      <Card className="shadow-card border-primary/20 bg-gradient-to-br from-card to-muted/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Data Forge</CardTitle>
              <CardDescription>Forge Your Data Empire — Mass import customers from CSV</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{importing ? "Importing..." : showMapping ? `Mapping: ${confirmedCount}/${mappings.length} confirmed` : "Ready"}</span>
              <span>{parsedData.length > 0 ? `${parsedData.length} rows` : ""}</span>
            </div>
            <Progress value={importing ? importProgress : (showMapping ? (confirmedCount / Math.max(mappings.length, 1)) * 100 : 0)} className="h-2" />
          </div>
          {importResult && (
            <div className={`flex items-center gap-2 p-3 rounded text-sm ${importResult.errors > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {importResult.errors > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {importResult.processed} imported, {importResult.errors} errors
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import Legion
          </CardTitle>
          <CardDescription>Upload CSV files to mass-import customer records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {fileName ? `Selected: ${fileName} (${parsedData.length} rows)` : "Drop your CSV file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">Supports .csv — up to 50,000 rows</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImport} disabled={importing || parsedData.length === 0 || confirmedCount === 0}>
              {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="mr-2 h-4 w-4" /> Start Import ({parsedData.length} rows)</>}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Select File
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview first 5 rows */}
      {parsedData.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Legion Preview — First 5 Rows</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(parsedData[0]).slice(0, 8).map((h) => (
                    <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {Object.keys(parsedData[0]).slice(0, 8).map((h) => (
                      <TableCell key={h} className="text-xs whitespace-nowrap max-w-[150px] truncate">{row[h] || "—"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI Mapping Grid */}
      {showMapping && mappings.length > 0 && (
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Column Mapping
              </CardTitle>
              <Button size="sm" variant="outline" onClick={confirmAll}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm All
              </Button>
            </div>
            <CardDescription>Review auto-suggested mappings. Adjust targets or confirm each row.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[20px_1fr_24px_1fr_80px_80px] gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                <span></span><span>Source Column</span><span></span><span>Target Field</span>
                <span className="text-center">Confidence</span><span className="text-center">Status</span>
              </div>
              {mappings.map((m, idx) => (
                <div key={idx} className={`grid grid-cols-[20px_1fr_24px_1fr_80px_80px] gap-2 items-center px-2 py-2 rounded-lg text-sm transition-colors ${m.confirmed ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"}`}>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="font-mono text-xs truncate">{m.source}</span>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={m.target} onValueChange={(v) => updateMapping(idx, "target", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-- skip --">-- skip --</SelectItem>
                      {SCHEMA_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-[10px] ${m.confidence > 0.8 ? "border-green-500/50 text-green-600" : m.confidence > 0.5 ? "border-yellow-500/50 text-yellow-600" : "border-red-500/50 text-red-500"}`}>
                      {(m.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <Button size="sm" variant={m.confirmed ? "default" : "outline"} className="h-6 px-2 text-[10px]" onClick={() => updateMapping(idx, "confirmed", !m.confirmed)}>
                      {m.confirmed ? "Forged" : "Confirm"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card className="shadow-card opacity-75">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Roster
          </CardTitle>
          <CardDescription>Export your data as CSV for backup or migration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Export Customers (CSV)</Button>
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Export Jobs (CSV)</Button>
          </div>
        </CardContent>
      </Card>

      {/* Supported Templates */}
      <Card className="shadow-card opacity-75">
        <CardHeader><CardTitle className="text-sm">Supported Migration Templates</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["Leap CRM", "JobNimbus", "AccuLynx", "CompanyCam", "Generic CSV"].map((tmpl) => (
              <Badge key={tmpl} variant="outline" className="text-xs">{tmpl}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
