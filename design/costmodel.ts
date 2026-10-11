// Step-cost model fitted against the published corpus (ARCHITECTURE.md §5, M2).
//
//   precrease = a * log2(N) + b          (records with a grid_n only)
//   collapse  = collapse_base + c1 * F
//   shaping   = c2 * S                   (no intercept)
//
// Three independent least-squares fits on per-phase panel counts. This
// predicts PUBLISHED panel counts; design/estimate.ts keeps the planner's
// exact count for precrease because it predicts OUR plan.
//
// Only records with `published: true` are used. For a record with no grid_n
// the precrease phase is not modelled: predict() takes the observed precrease
// count for it, so those records only test the collapse and shaping terms.

import type { SequenceRecord } from "../sequencer/corpus.ts";

export const TARGET_PUBLISHED = 20;
export const PASS_TOLERANCE = 0.15;

export interface FittedConstants {
  a: number;
  b: number;
  collapse_base: number;
  c1: number;
  c2: number;
  n_models: number;
  fitted_on: string[];
  date: string;
}

export function phaseCounts(rec: SequenceRecord): { precrease: number; collapse: number; shaping: number } {
  const c = { precrease: 0, collapse: 0, shaping: 0 };
  for (const s of rec.steps) c[s.phase]++;
  return c;
}

/** Least squares via normal equations and Gaussian elimination with partial pivoting. */
export function lstsq(X: number[][], y: number[]): { coef: number[]; residualSS: number } {
  const n = X.length;
  if (n === 0 || n !== y.length) throw new Error("lstsq: empty or mismatched input");
  const k = X[0]!.length;
  if (n < k) throw new Error(`lstsq: underdetermined (${n} rows, ${k} unknowns)`);
  const M: number[][] = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  let scale = 0;
  for (let r = 0; r < n; r++) {
    const x = X[r]!;
    for (let i = 0; i < k; i++) {
      const Mi = M[i]!;
      for (let j = 0; j < k; j++) Mi[j]! += x[i]! * x[j]!;
      Mi[k]! += x[i]! * y[r]!;
      scale = Math.max(scale, Math.abs(Mi[i]!));
    }
  }
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) <= 1e-10 * Math.max(scale, 1)) throw new Error("lstsq: singular system");
    const tmp = M[c]!;
    M[c] = M[p]!;
    M[p] = tmp;
    const Mc = M[c]!;
    for (let r = c + 1; r < k; r++) {
      const Mr = M[r]!;
      const f = Mr[c]! / Mc[c]!;
      for (let j = c; j <= k; j++) Mr[j]! -= f * Mc[j]!;
    }
  }
  const coef = new Array<number>(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    const Mi = M[i]!;
    let s = Mi[k]!;
    for (let j = i + 1; j < k; j++) s -= Mi[j]! * coef[j]!;
    coef[i] = s / Mi[i]!;
  }
  let residualSS = 0;
  for (let r = 0; r < n; r++) {
    let f = 0;
    for (let i = 0; i < k; i++) f += X[r]![i]! * coef[i]!;
    residualSS += (y[r]! - f) ** 2;
  }
  return { coef, residualSS };
}

/** Fit on the given records (the caller filters to published ones). Throws when underdetermined. */
export function fitCostModel(recs: SequenceRecord[], date: string = new Date().toISOString().slice(0, 10)): FittedConstants {
  const grid = recs.filter((r) => r.grid_n !== null);
  const pre = lstsq(grid.map((r) => [Math.log2(r.grid_n as number), 1]), grid.map((r) => phaseCounts(r).precrease));
  const col = lstsq(recs.map((r) => [1, r.flaps]), recs.map((r) => phaseCounts(r).collapse));
  const sha = lstsq(recs.map((r) => [r.shaping_ops]), recs.map((r) => phaseCounts(r).shaping));
  return {
    a: pre.coef[0]!,
    b: pre.coef[1]!,
    collapse_base: col.coef[0]!,
    c1: col.coef[1]!,
    c2: sha.coef[0]!,
    n_models: recs.length,
    fitted_on: recs.map((r) => r.model),
    date,
  };
}

export function predict(c: FittedConstants, rec: SequenceRecord): number {
  const pre = rec.grid_n === null ? phaseCounts(rec).precrease : c.a * Math.log2(rec.grid_n) + c.b;
  return pre + c.collapse_base + c.c1 * rec.flaps + c.c2 * rec.shaping_ops;
}

export interface ReportRow {
  model: string;
  published: number;
  predicted: number;
  err_pct: number;
  pass: boolean;
}

export interface Report {
  status: "ok" | "insufficient data";
  published_count: number;
  target: number;
  exit_test: string;
  /** Leave-one-out: each model predicted from a fit on the other n-1. */
  loo: ReportRow[];
  in_sample_label: "in-sample (optimistic)";
  in_sample: ReportRow[];
  failed: number;
  tolerance_pct: number;
  note: string;
}

function row(rec: SequenceRecord, predicted: number): ReportRow {
  const published = rec.steps.length;
  const err_pct = (100 * (predicted - published)) / published;
  return { model: rec.model, published, predicted, err_pct, pass: Math.abs(err_pct) <= PASS_TOLERANCE * 100 };
}

export function evaluate(all: SequenceRecord[]): Report {
  const recs = all.filter((r) => r.published && r.steps.length > 0);
  const k = recs.length;
  const base = { published_count: k, target: TARGET_PUBLISHED, in_sample_label: "in-sample (optimistic)" as const, tolerance_pct: PASS_TOLERANCE * 100 };
  const waiting = `not yet runnable (${k}/${TARGET_PUBLISHED})`;
  const insufficient = (why: string): Report => ({ ...base, status: "insufficient data", exit_test: waiting, loo: [], in_sample: [], failed: 0, note: why });
  if (k === 0) return insufficient(`0 of ${TARGET_PUBLISHED} published sequences; nothing to fit`);
  let full: FittedConstants;
  const loo: ReportRow[] = [];
  try {
    full = fitCostModel(recs);
    for (let i = 0; i < k; i++) loo.push(row(recs[i]!, predict(fitCostModel(recs.filter((_, j) => j !== i)), recs[i]!)));
  } catch (e) {
    return insufficient(`fit underdetermined: ${e instanceof Error ? e.message : String(e)}`);
  }
  const in_sample = recs.map((r) => row(r, predict(full, r)));
  const failed = loo.filter((r) => !r.pass).length;
  const exit_test = k < TARGET_PUBLISHED ? waiting : failed === 0 ? "pass" : "fail";
  return { ...base, status: "ok", exit_test, loo, in_sample, failed, note: `${failed} of ${k} leave-one-out predictions outside +-${PASS_TOLERANCE * 100}%` };
}
