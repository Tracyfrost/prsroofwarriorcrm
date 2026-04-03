import type { Qualification } from "@/hooks/useJobProduction";
import type { Draw } from "@/hooks/useDraws";
import { DRAW_TYPES } from "@/hooks/useDraws";
import { resolvePlanningRoofSquares, type PlanningJobSquares } from "@/lib/roofSquares";

/** Job-level financial gate (supplements line-level Go/Hold on production items; does not replace them.) */
export type JobLevelGate = "Go" | "Hold" | "Supplement";

export const GATE_RECOVERABLE_MAX_FOR_GO = 500;
export const GATE_SUPPLEMENT_SHORTFALL_MAX = 10_000;

export function defaultDrawInclusions(): Record<string, boolean> {
  const o: Record<string, boolean> = {};
  for (const t of DRAW_TYPES) o[t] = false;
  return o;
}

/** Sum draw amounts where type is toggled on in qualification.estimated_cost_draw_inclusions */
export function sumDrawsForEstimatedCost(qual: Qualification, draws: Draw[]): number {
  const inc = qual.estimated_cost_draw_inclusions ?? {};
  return draws.reduce((sum, d) => {
    const type = d.type as string;
    if (inc[type]) return sum + (Number(d.amount) || 0);
    return sum;
  }, 0);
}

/**
 * Squares used for $/SQ roof line: put-back overrides; else planning SQ from Measurements / scope / legacy / job columns.
 */
export function qualifyingSquares(job: PlanningJobSquares | null, qual: Qualification): number {
  const put = qual.squares_put_back;
  if (put != null && !Number.isNaN(Number(put))) return Number(put);
  return resolvePlanningRoofSquares(job, qual);
}

export function computePreDrawAmount(qual: Qualification): number {
  if (qual.pre_draw_amount_manual != null && !Number.isNaN(Number(qual.pre_draw_amount_manual))) {
    return Number(qual.pre_draw_amount_manual);
  }
  const first = Number(qual.first_check_funds) || 0;
  return Math.round(first * 0.1 * 100) / 100;
}

export function computeJobLevelGate(difference: number, recoverableDepreciation: number): JobLevelGate {
  const rec = Number(recoverableDepreciation) || 0;
  if (difference > 0 && rec < GATE_RECOVERABLE_MAX_FOR_GO) return "Go";
  if (difference < 0 && Math.abs(difference) < GATE_SUPPLEMENT_SHORTFALL_MAX) return "Supplement";
  return "Hold";
}

export type WarRoomQualificationMetrics = {
  qualifyingSquares: number;
  squaresPullOff: number;
  pricePerSq: number;
  /** Roof line from squares × price/SQ */
  roofLineCost: number;
  drawsSubtotal: number;
  /** Manual job estimate line + draws (when using legacy estimate_cost as additive) */
  manualEstimateCost: number;
  estimatedCostRollup: number;
  preDrawAmount: number;
  eagleviewFee: number;
  estimateLineAmount: number;
  jobCostMisc: number;
  rolledRoofing: number;
  twoStoryFee: number;
  installerPayTotal: number;
  jobCostBaseTotal: number;
  gutters: number;
  patio: number;
  interior: number;
  suppApprFee: number;
  totalJobCost: number;
  fundsReceived: number;
  difference: number;
  recoverableDepreciation: number;
  otherCostProjected: number;
  totalProfitProjected: number;
  jobLevelGate: JobLevelGate;
  /** Legacy trigger: estimate_cost - first_check_funds */
  legacyVariance: number;
};

export function computeWarRoomQualificationMetrics(
  qual: Qualification,
  draws: Draw[],
  receivedChecksTotal: number,
  job: PlanningJobSquares | null,
): WarRoomQualificationMetrics {
  const sq = qualifyingSquares(job, qual);
  const pricePerSq = Number(qual.price_per_sq) || 0;
  const roofLineCost = Math.round(sq * pricePerSq * 100) / 100;

  const drawsSubtotal = sumDrawsForEstimatedCost(qual, draws);
  const manualEstimate = Number(qual.estimate_cost) || 0;
  const estimatedCostRollup = manualEstimate + drawsSubtotal;

  const preDrawAmount = computePreDrawAmount(qual);
  const eagleviewFee = Number(qual.eagleview_fee) || 0;
  const estimateLineAmount = Number(qual.estimate_line) || 0;
  const jobCostMisc = Number(qual.job_cost_misc) || 0;
  const rolledRoofing = Number(qual.rolled_roofing) || 0;
  const twoStoryFee = Number(qual.two_story_fee) || 0;
  const installerPayTotal = Number(qual.installer_pay_total) || 0;

  const jobCostBaseTotal =
    roofLineCost +
    estimateLineAmount +
    eagleviewFee +
    preDrawAmount +
    jobCostMisc +
    rolledRoofing +
    twoStoryFee +
    installerPayTotal;

  const gutters = Number(qual.gutters) || 0;
  const patio = Number(qual.patio) || 0;
  const interior = Number(qual.interior) || 0;
  const suppApprFee = Number(qual.supp_appr_fee) || 0;

  const totalJobCost = jobCostBaseTotal + gutters + patio + interior + suppApprFee;

  const fundsReceived = receivedChecksTotal;
  const difference = Math.round((fundsReceived - totalJobCost) * 100) / 100;

  const recoverableDepreciation = Number(qual.recoverable_depreciation) || 0;
  const otherCostProjected = Number(qual.other_cost_projected) || 0;
  const totalProfitProjected = Math.round((difference - recoverableDepreciation - otherCostProjected) * 100) / 100;

  const jobLevelGate = computeJobLevelGate(difference, recoverableDepreciation);

  const firstCheck = Number(qual.first_check_funds) || 0;
  const legacyVariance = Math.round(((Number(qual.estimate_cost) || 0) - firstCheck) * 100) / 100;

  return {
    qualifyingSquares: sq,
    squaresPullOff: Number(qual.squares_pull_off) || 0,
    pricePerSq,
    roofLineCost,
    drawsSubtotal,
    manualEstimateCost: manualEstimate,
    estimatedCostRollup,
    preDrawAmount,
    eagleviewFee,
    estimateLineAmount,
    jobCostMisc,
    rolledRoofing,
    twoStoryFee,
    installerPayTotal,
    jobCostBaseTotal: Math.round(jobCostBaseTotal * 100) / 100,
    gutters,
    patio,
    interior,
    suppApprFee,
    totalJobCost: Math.round(totalJobCost * 100) / 100,
    fundsReceived,
    difference,
    recoverableDepreciation,
    otherCostProjected,
    totalProfitProjected,
    jobLevelGate,
    legacyVariance,
  };
}
