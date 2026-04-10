import { describe, expect, it } from "vitest";
import { buildJobOrderingWorksheetCsv, csvEscape } from "@/lib/orderFormCsv";
import type { JobOrderingLine } from "@/lib/jobOrderingTemplate";

describe("orderFormCsv", () => {
  it("csvEscape quotes commas and newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("buildJobOrderingWorksheetCsv includes metadata, planning SQ, and flag", () => {
    const orderingLines: JobOrderingLine[] = [
      {
        key: "x",
        q1: "1",
        label: "Mat,erial",
        q2: "2",
        q3: "",
        valley50ft: "",
        valley25ft: "",
        flag: true,
      },
    ];
    const exportedAt = new Date("2026-01-15T10:30:00.000Z");
    const { csv, filename } = buildJobOrderingWorksheetCsv({
      jobDisplayId: "J1",
      jobId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      planningSq: 42,
      orderingLines,
      exportedAt,
    });
    expect(filename).toBe("J1-order-form.csv");
    expect(csv).toContain("J1");
    expect(csv).toContain("42");
    expect(csv).toContain("TRUE");
    expect(csv).toContain('"Mat,erial"');
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(6);
  });
});
