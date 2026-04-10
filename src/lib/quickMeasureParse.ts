/** Returns total sq ft from a phrase like "Roof Area 12,345 sq ft". */
export function parseGafRoofAreaSqFt(text: string): number | null {
  const sqMatch = text.match(/Roof Area\s+([\d,]+)\s*sq\s*ft/i);
  if (!sqMatch) return null;
  const n = parseFloat(sqMatch[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function sqFtToRoofingSquares(sqFt: number): number {
  return Math.round((sqFt / 100) * 100) / 100;
}
