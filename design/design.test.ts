import { describe, expect, it } from "vitest";
import { parseRequest } from "../intent/rules.ts";
import { generateCandidates } from "./candidates.ts";
import { estimateSteps } from "./estimate.ts";
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

  it("the reference request yields in-budget dragon candidates on a 21 grid", () => {
    const spec = parseRequest("I want to make a realistic dragon, with 21x21 paper, with about ~ 200 steps or less.");
    const res = generateCandidates(spec, variantsFor("dragon", spec.detail));
    expect(res.candidates.length).toBeGreaterThan(0);
    const top = res.candidates[0]!;
    expect(top.variant).toBe("realistic");
    expect(top.paper_spec.grid_n).toBe(21);
    expect(top.within_budget).toBe(true);
    expect(top.base_cp).toBeNull();
    expect(top.cp_status).toMatch(/not generated/);
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
