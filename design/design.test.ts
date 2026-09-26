import { describe, expect, it } from "vitest";
import { parseRequest } from "../intent/rules.ts";
import { generateCandidates } from "./candidates.ts";
import { layoutBlueprint } from "./blueprint.ts";
import { creasePatternFromBlueprint } from "./complete.ts";
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
    // Honest current state: the dragon layout needs completion, which does not exist yet.
    expect(top.base_cp).toBeNull();
    expect(top.crease_pattern.status).toBe("incomplete");
    expect(top.cp_status).toMatch(/incomplete/);
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

describe("BP Studio layout -> crease pattern", () => {
  it("crane on a diagonal packing: the blueprint is already complete (preliminary base) and verifies", () => {
    const crane = LIBRARY.crane![0]!;
    const bp = layoutBlueprint(crane, packTree(crane, 16, "diagonal")!);
    expect(bp.diagnostics.invalidJunctions).toBe(0);
    const r = creasePatternFromBlueprint(bp);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    // two diagonals + two midlines, each split at the centre: 8 creases, Maekawa-valid
    expect(r.cp.edges_assignment!.filter((a) => a === "M" || a === "V")).toHaveLength(8);
    expect(localFlatFoldability(r.cp)).toEqual([]);
  });

  it("dragon: reports exactly which vertices still need creases instead of guessing", () => {
    const dragon = LIBRARY.dragon!.find((t) => t.variant === "simple")!;
    const r = creasePatternFromBlueprint(layoutBlueprint(dragon, packTree(dragon, 16, "diagonal")!));
    expect(r.status).toBe("incomplete");
    if (r.status === "incomplete") expect(r.violations.length).toBeGreaterThan(0);
  });

  it("the crane request gets a candidate with a verified crease pattern", () => {
    const spec = parseRequest("a traditional crane");
    const res = generateCandidates(spec, variantsFor("crane", spec.detail));
    const verified = res.candidates.filter((c) => c.base_cp !== null);
    expect(verified.length).toBeGreaterThan(0);
    expect(verified[0]!.cp_status).toMatch(/verified by flat-folder/);
  });
});
