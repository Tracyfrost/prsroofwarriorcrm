import type { ProductionItem } from "@/hooks/useProduction";

export type QualificationGate = "Pending" | "Go" | "Hold" | "Supplement";

const GATE_SEVERITY: Record<string, number> = {
  Hold: 0,
  Supplement: 1,
  Pending: 2,
  Go: 3,
};

/** Lower severity = worse for job health (Hold blocks hardest). */
export function worstQualificationStatus(items: Pick<ProductionItem, "qualification_status">[]): QualificationGate | null {
  if (!items.length) return null;
  let worst: QualificationGate = "Go";
  let worstSev = 99;
  for (const i of items) {
    const s = (i.qualification_status || "Pending") as QualificationGate;
    const sev = GATE_SEVERITY[s] ?? 2;
    if (sev < worstSev) {
      worstSev = sev;
      worst = s;
    }
  }
  return worst;
}

export function lineEstimatedExposure(item: ProductionItem): number {
  const q = Number(item.quantity) || 0;
  const perSq = item.estimate_per_sq != null ? Number(item.estimate_per_sq) : NaN;
  if (!Number.isNaN(perSq) && q > 0) return perSq * q;
  return (Number(item.labor_cost) || 0) + (Number(item.material_cost) || 0);
}

export function sumLineEstimatedExposure(items: ProductionItem[]): number {
  return items.reduce((s, i) => s + lineEstimatedExposure(i), 0);
}

export function sumPreDrawAmounts(items: ProductionItem[]): number {
  return items.reduce((s, i) => s + (Number(i.pre_draw_amount) || 0), 0);
}

export function sumRecoverableDepreciation(items: ProductionItem[]): number {
  return items.reduce((s, i) => s + (Number(i.recoverable_depreciation) || 0), 0);
}

export function materialOrderReadinessPct(items: ProductionItem[]): number {
  if (!items.length) return 0;
  const scores = items.map((i) => {
    const m = i.material_order_status || "Not Ordered";
    if (m === "Delivered") return 100;
    if (m === "Ordered") return 66;
    return 0;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / items.length);
}

export function anyLineQualificationHold(items: ProductionItem[]): boolean {
  return items.some((i) => (i.qualification_status || "") === "Hold");
}

export function aggregateProductionCosts(items: ProductionItem[]): { labor: number; material: number; total: number } {
  const labor = items.reduce((s, i) => s + (Number(i.labor_cost) || 0), 0);
  const material = items.reduce((s, i) => s + (Number(i.material_cost) || 0), 0);
  return { labor, material, total: labor + material };
}
