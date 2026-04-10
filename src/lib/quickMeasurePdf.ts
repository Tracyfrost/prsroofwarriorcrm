import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseGafRoofAreaSqFt, sqFtToRoofingSquares } from "./quickMeasureParse";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Concatenates text from all pages (GAF QuickMeasure / similar).
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item && typeof item === "object" && "str" in item && typeof (item as { str?: string }).str === "string") {
        parts.push((item as { str: string }).str);
      }
    }
    parts.push("\n");
  }
  return parts.join(" ");
}

export { parseGafRoofAreaSqFt, sqFtToRoofingSquares };
