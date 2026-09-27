import { describe, expect, it } from "vitest";
import { parseRequest } from "../intent/rules.ts";
import { completeCandidate, generateCandidates } from "./candidates.ts";
import { layoutBlueprint } from "./blueprint.ts";
import { buildRegions, completeRegions, gridTree, uniaxialDeviation } from "./boxpleat.ts";
import { estimateSteps } from "./estimate.ts";
import { localFlatFoldability } from "../engine/local.ts";
import { LIBRARY, variantsFor } from "./library.ts";
import { packTree, verifyPacking } from "./packing.ts";
import { route } from "./router.ts";
import { leaves, validateTree } from "./tree.ts";

describe("stick-figure library", () => {
  it("every template is a valid metric tree", () => {
    for (const trees of Object.values(LIBRARY)) for (const t of trees) expect(validateTree(t), `${t.subject}/${t.variant}`).toEqual([]);
  });

  it("orders variants by requested detail", () => {
    expect(variantsFor("dragon", "high")[0]!.variant).toBe("realistic");
    expect(variantsFor("dragon", "simple")[0]!.variant).toBe("simple");
  });
});

describe("box-pleat grid packing", () => {
  it("recovers the bird base for the crane: four corner flaps, scale N/2", () => {
    const crane = LIBRARY.crane![0]!;
    const p = packTree(crane, 16, "diagonal")!;
    expect(p.scale).toBe(8);
    const corners = Object.values(p.positions).map(([x, y]) => `${x},${y}`).sort();
    expect(corners).toEqual(["0,0", "0,16", "16,0", "16,16"]);
  });

  it("book symmetry with midline flaps needs an even grid", () => {
    expect(packTree(LIBRARY.dragon![0]!, 21, "book")).toBeNull();
    expect(packTree(LIBRARY.dragon![0]!, 20, "book")).not.toBeNull();
  });

  it("every packing it returns satisfies the L∞ tree condition", () => {
    for (const t of [LIBRARY.dragon![0]!, LIBRARY.quadruped![0]!, LIBRARY.eiffel_tower![0]!]) {
      const p = packTree(t, 21, "diagonal")!;
      expect(verifyPacking(t, p)).toEqual([]);
    }
  });
});

describe("routing and candidates", () => {
  it("routes by tier and refuses what it cannot do, with a reason", () => {
    expect(route(parseRequest("a dragon")).tier).toBe(1);
    const mask = route(parseRequest("a mask of my face"));
    expect(mask.tier).toBe(3);
    expect(mask.supported).toBe(false);
    expect(mask.reason).toMatch(/not a step-by-step|collapse/);
  });

  it("the reference request yields in-budget dragon candidates, grid chosen by design", () => {
    const spec = parseRequest("I want to make a realistic dragon, with 21x21 paper, with about ~ 200 steps or less.");
    const res = generateCandidates(spec, variantsFor("dragon", spec.detail));
    expect(res.candidates.length).toBeGreaterThan(0);
    const top = res.candidates[0]!;
    expect(top.variant).toBe("realistic");
    expect([16, 24, 32]).toContain(top.paper_spec.grid_n);
    expect(top.paper_spec.grid_square_cm).toBeCloseTo(21 / top.paper_spec.grid_n, 2);
    expect(top.within_budget).toBe(true);
    // Completion is a separate, slow step: nothing claims a crease pattern before it runs.
    expect(top.base_cp).toBeNull();
    expect(top.completion).toBeNull();
    expect(top.flaps).toBe(leaves(top.tree).length);
  });

  it("prunes over-budget designs and says why", () => {
    const spec = parseRequest("a realistic dragon on a 32x32 grid in under 60 steps");
    const res = generateCandidates(spec, variantsFor("dragon", spec.detail));
    expect(res.rejected.some((r) => r.reason.includes("> budget"))).toBe(true);
    for (const c of res.candidates) expect(c.est_steps.total).toBeLessThanOrEqual(60);
  });

  it("labels the fitted constants as placeholders", () => {
    const e = estimateSteps(LIBRARY.dragon![0]!, 21);
    expect(e.basis.precrease).toBe("exact (planner)");
    expect(e.basis.collapse).toMatch(/placeholder/);
    expect(e.total).toBe(e.precrease + e.collapse + e.shaping);
  });
});

describe("box-pleat completion inside candidates", () => {
  it("BP Studio (independent oracle) draws the same hinges and ridges for the crane as our completion", () => {
    const crane = LIBRARY.crane![0]!;
    const p = packTree(crane, 16, "diagonal")!;
    const bp = layoutBlueprint(crane, p);
    expect(bp.diagnostics.invalidJunctions).toBe(0);
    const ours = completeRegions(buildRegions(gridTree(crane, p.scale) as typeof crane, p.positions, 16, "body")).lines;
    // compare as sets of unit-grid points covered, so segment splitting does not matter
    const cover = (segs: { a: readonly number[]; b: readonly number[] }[]) => {
      const pts = new Set<string>();
      for (const s of segs) {
        const steps = Math.round(4 * Math.max(Math.abs(s.b[0]! - s.a[0]!), Math.abs(s.b[1]! - s.a[1]!))); // quarter-grid spacing
        for (let k = 0; k <= steps; k++) pts.add(`${(s.a[0]! + ((s.b[0]! - s.a[0]!) * k) / steps).toFixed(4)},${(s.a[1]! + ((s.b[1]! - s.a[1]!) * k) / steps).toFixed(4)}`);
      }
      return [...pts].sort();
    };
    const theirs = bp.lines.filter((l) => l.role !== "border").map((l) => ({ a: [l.a[0] * 16, l.a[1] * 16], b: [l.b[0] * 16, l.b[1] * 16] }));
    expect(cover(ours.filter((l) => l.role !== "contour"))).toEqual(cover(theirs));
  });

  it("the crane request gets a candidate with a verified crease pattern", () => {
    const spec = parseRequest("a traditional crane");
    const res = generateCandidates(spec, variantsFor("crane", spec.detail));
    const c = completeCandidate(res.candidates[0]!);
    expect(c.base_cp).not.toBeNull();
    expect(c.cp_status).toMatch(/verified by flat-folder/);
    expect(localFlatFoldability(c.base_cp!)).toEqual([]);
  });

  it("the realistic dragon (10 flaps) completes on 16×16 into a verified uniaxial base", () => {
    const spec = parseRequest("a realistic dragon on a 16x16 grid");
    const res = generateCandidates(spec, variantsFor("dragon", spec.detail));
    const c = completeCandidate(res.candidates.find((x) => x.variant === "realistic")!);
    expect(c.cp_status).toMatch(/verified by flat-folder/);
    const r = c.completion!;
    if (r.status !== "verified") return;
    expect(localFlatFoldability(r.cp)).toEqual([]);
    expect(uniaxialDeviation(r.lines, 16, Object.values(c.packing.positions), r.cp, r.folded)).toBeLessThan(1e-9);
  }, 60_000);

  it("a flap under one grid square is reported, not completed", () => {
    const crane = LIBRARY.crane![0]!;
    expect(gridTree(crane, 0.5)).toMatch(/under one grid square/);
  });
});
