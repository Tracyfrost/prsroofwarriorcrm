import { format } from "date-fns";
import type { JobOrderingLine } from "@/lib/jobOrderingTemplate";

export function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildJobOrderingWorksheetCsv(params: {
  jobDisplayId?: string;
  jobId: string;
  planningSq: number;
  orderingLines: JobOrderingLine[];
  exportedAt?: Date;
}): { csv: string; filename: string } {
  const idLabel = params.jobDisplayId || params.jobId.slice(0, 8);
  const planningLabel = params.planningSq > 0 ? String(params.planningSq) : "";
  const exported = params.exportedAt ?? new Date();
  const headerRows: string[][] = [
    ["Job", idLabel],
    ["Exported", format(exported, "yyyy-MM-dd HH:mm")],
    ["Planning roof SQ", planningLabel],
    [],
    ["Q1", "Material", "Q2", "Q3", "SQ", "Valley50ft", "Valley25ft", "Flag"],
  ];
  const dataRows = params.orderingLines.map((r) => [
    r.q1,
    r.label,
    r.q2,
    r.q3,
    planningLabel,
    r.valley50ft,
    r.valley25ft,
    r.flag ? "TRUE" : "FALSE",
  ]);
  const lines = [
    ...headerRows.map((r) => r.map((c) => csvEscape(String(c))).join(",")),
    ...dataRows.map((r) => r.map((c) => csvEscape(String(c))).join(",")),
  ];
  const csv = lines.join("\n");
  return { csv, filename: `${idLabel}-order-form.csv` };
}
