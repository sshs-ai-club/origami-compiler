import { describe, expect, it } from "vitest";
import { type SequenceRecord, validateRecord } from "../sequencer/corpus.ts";
import { evaluate, fitCostModel, lstsq, phaseCounts, predict } from "./costmodel.ts";
import { MIN_FIT_MODELS, selectConstants, CONSTANTS } from "./estimate.ts";

/** Synthetic record: phase panel counts are given explicitly. Not a published model. */
function synth(name: string, N: number, F: number, S: number, counts: [number, number, number], published = true): SequenceRecord {
  const steps: any[] = [];
  const phases = ["precrease", "collapse", "shaping"] as const;
  counts.forEach((n, pi) => {
    for (let i = 0; i < n; i++) steps.push({ panel: steps.length + 1, phase: phases[pi], batch: "single", primitive_folds: 1, op: "valley", line: "x", reference: "exact" });
  });
  const j = { model: name, source: "synthetic test data", paper: { size_cm: 15, shape: "square", duo: false }, total_panels: steps.length, grid_n: N, flaps: F, shaping_ops: S, published, steps };
  const v = validateRecord(j);
  if (!v.ok) throw new Error(v.errors.join("; "));
  return v.record;
}

const A = 2, B = 1, BASE = 10, C1 = 6, C2 = 2;
const Ns = [8, 16, 32, 64, 8, 16, 32, 64];
const Fs = [3, 5, 7, 10, 9, 4, 6, 8];
const Ss = [0, 2, 4, 6, 1, 3, 5, 0];
function corpus(noise: number[][] | null, mult: (i: number) => number = () => 1): SequenceRecord[] {
  return Ns.map((N, i) => {
    const nz = noise?.[i] ?? [0, 0, 0];
    const F = Fs[i]!, S = Ss[i]!;
    const p = A * Math.log2(N) + B + nz[0]!;
    const c = BASE + C1 * F + nz[1]!;
    const s = C2 * S + nz[2]!;
    return synth(`m${i}`, N, F, S, [p, Math.round(c * mult(i)), s]);
  });
}

describe("lstsq", () => {
  it("recovers y = 3x + 2", () => {
    const X = [0, 1, 2, 3, 4].map((x) => [1, x]);
    const { coef, residualSS } = lstsq(X, [2, 5, 8, 11, 14]);
    expect(coef[0]).toBeCloseTo(2, 9);
    expect(coef[1]).toBeCloseTo(3, 9);
    expect(residualSS).toBeLessThan(1e-12);
  });
  it("throws on singular and underdetermined input", () => {
    expect(() => lstsq([[1, 2], [2, 4], [3, 6]], [1, 2, 3])).toThrow();
    expect(() => lstsq([[1, 2]], [1])).toThrow();
  });
});

describe("fitCostModel", () => {
  it("recovers known constants exactly", () => {
    const c = fitCostModel(corpus(null));
    expect(c.a).toBeCloseTo(A, 9);
    expect(c.b).toBeCloseTo(B, 9);
    expect(c.collapse_base).toBeCloseTo(BASE, 9);
    expect(c.c1).toBeCloseTo(C1, 9);
    expect(c.c2).toBeCloseTo(C2, 9);
    expect(c.n_models).toBe(8);
  });

  it("with +-1 noise stays within 0.5 and LOO within 15%", () => {
    const sg = (i: number, k: number) => ((i + k) % 2 === 0 ? 1 : -1);
    const noise = Ns.map((_, i) => [i % 4 === 0 || i % 4 === 3 ? 1 : -1, i < 4 ? 1 : -1, sg(i, 2)]); // collapse noise balanced against F
    const recs = corpus(noise);
    const c = fitCostModel(recs);
    expect(Math.abs(c.a - A)).toBeLessThan(0.5);
    expect(Math.abs(c.b - B)).toBeLessThan(0.5);
    expect(Math.abs(c.collapse_base - BASE)).toBeLessThan(0.5);
    expect(Math.abs(c.c1 - C1)).toBeLessThan(0.5);
    expect(Math.abs(c.c2 - C2)).toBeLessThan(0.5);
    const r = evaluate(recs);
    expect(r.status).toBe("ok");
    for (const row of r.loo) expect(Math.abs(row.err_pct)).toBeLessThanOrEqual(15);
    expect(r.in_sample_label).toBe("in-sample (optimistic)");
  });

  it("a planted wrong record fails and is counted", () => {
    const recs = corpus(null, (i) => (i === 3 ? 2 : 1));
    const r = evaluate(recs);
    expect(r.loo.find((x) => x.model === "m3")!.pass).toBe(false);
    expect(r.failed).toBeGreaterThanOrEqual(1);
    expect(r.exit_test).toBe("not yet runnable (8/20)");
  });

  it("predict and phaseCounts agree on exact data", () => {
    const recs = corpus(null);
    const c = fitCostModel(recs);
    for (const rec of recs) {
      const pc = phaseCounts(rec);
      expect(predict(c, rec)).toBeCloseTo(pc.precrease + pc.collapse + pc.shaping, 6);
    }
  });
});

describe("evaluate on thin corpora", () => {
  it("empty corpus", () => {
    const r = evaluate([]);
    expect(r.published_count).toBe(0);
    expect(r.target).toBe(20);
    expect(r.exit_test).toBe("not yet runnable (0/20)");
    expect(r.status).toBe("insufficient data");
  });
  it("unpublished records never count", () => {
    const r = evaluate(corpus(null).map((x) => ({ ...x, published: false })));
    expect(r.published_count).toBe(0);
    expect(r.exit_test).toBe("not yet runnable (0/20)");
  });
});

describe("selectConstants", () => {
  const fitted = (n: number) => ({ a: 2, b: 1, collapse_base: 11, c1: 5, c2: 3, n_models: n, fitted_on: [], date: "2027-01-01" });
  it("null -> placeholder", () => {
    const s = selectConstants(null);
    expect(s.basis).toMatch(/placeholder/);
    expect(s.c1).toBe(CONSTANTS.c1_per_flap);
  });
  it("11 models -> placeholder, 12 -> fitted", () => {
    expect(MIN_FIT_MODELS).toBe(12);
    expect(selectConstants(fitted(11)).basis).toMatch(/placeholder/);
    const s = selectConstants(fitted(12));
    expect(s.basis).toMatch(/fitted on 12 published sequences \(2027-01-01\)/);
    expect(s.basis).toMatch(/unvalidated/);
    expect(selectConstants(fitted(20)).basis).not.toMatch(/unvalidated/);
    expect(s.collapse_base).toBe(11);
    expect(s.c1).toBe(5);
    expect(s.c2).toBe(3);
  });
});
