// Graded M/V hints (design/mvhints.ts). Fixtures are Lang's 6x6 example
// (ODS ch. 13), duplicated from design/boxpleat.test.ts.

import { describe, expect, it } from "vitest";
import { solveFlatFold } from "../engine/flatfold.ts";
import { boxPleatFromGrid, toFold, uniaxialDeviation } from "./boxpleat.ts";
import { LIBRARY } from "./library.ts";
import { agreement, assignmentOf, cpFor, hintFor, oneEdge, solveGraded } from "./mvhints.ts";
import { packTree } from "./packing.ts";
import type { FlapTree } from "./tree.ts";

const SIX: FlapTree = {
  subject: "lang-6x6",
  variant: "fig13.17",
  nodes: ["L", "R", "TL", "TM", "BL", "TR", "BR"],
  edges: [
    { a: "L", b: "R", length: 1 },
    { a: "L", b: "TL", length: 2 },
    { a: "L", b: "TM", length: 1 },
    { a: "L", b: "BL", length: 1 },
    { a: "R", b: "TR", length: 1 },
    { a: "R", b: "BR", length: 2 },
  ],
  mirror: [],
  shaping: [],
};
const SIX_TIPS: Record<string, [number, number]> = { TL: [0, 1], TM: [3, 0], BL: [1, 6], TR: [6, 1], BR: [5, 4] };
const tipList = Object.values(SIX_TIPS);

const sixResult = boxPleatFromGrid(SIX, SIX_TIPS, 6);
if (sixResult.status !== "verified") throw new Error("SIX fixture must verify");
const lines = sixResult.lines;

describe("hintFor", () => {
  it("lang: peak contours V, trough contours M, hinges and ridges unassigned", () => {
    const h = hintFor(lines, "lang");
    expect(h).toHaveLength(lines.length);
    expect(lines.some((l) => l.role === "contour" && l.peak)).toBe(true);
    expect(lines.some((l) => l.role === "contour" && !l.peak)).toBe(true);
    lines.forEach((l, i) => {
      if (l.role === "contour") expect(h[i]).toBe(l.peak ? "V" : "M");
      else expect(h[i]).toBe("U");
    });
  });

  it("peaks / troughs / none assign the respective subsets", () => {
    const peaks = hintFor(lines, "peaks"), troughs = hintFor(lines, "troughs");
    lines.forEach((l, i) => {
      expect(peaks[i]).toBe(l.role === "contour" && l.peak ? "V" : "U");
      expect(troughs[i]).toBe(l.role === "contour" && !l.peak ? "M" : "U");
    });
    expect(hintFor(lines, "none").every((x) => x === "U")).toBe(true);
  });

  it("one: the FOLD handed to flat-folder has exactly one assigned non-boundary edge", () => {
    const cp = cpFor(lines, 6, "one");
    const assigned = cp.edges_assignment!.filter((a) => a === "M" || a === "V");
    expect(assigned).toEqual(["M"]);
    expect(cp.edges_assignment![oneEdge(cp)]).toBe("M");
    expect(hintFor(lines, "one").every((x) => x === "U")).toBe(true);
    // a heuristic strategy, by contrast, assigns every planar piece of its lines
    expect(cpFor(lines, 6, "troughs").edges_assignment!.filter((a) => a === "M").length).toBeGreaterThan(1);
  });

  it("an explicit per-line assignment reaches the FOLD file; booleans behave as before", () => {
    const asg = hintFor(lines, "troughs");
    const cp = toFold(lines, 6, asg);
    expect(cp.edges_assignment!.filter((a) => a === "M" || a === "V").length).toBeGreaterThanOrEqual(1);
    const lang = toFold(lines, 6, true).edges_assignment!.filter((a) => a === "M" || a === "V").length;
    expect(lang).toBeGreaterThan(1);
    expect(toFold(lines, 6).edges_assignment!.some((a) => a === "M" || a === "V")).toBe(false);
  });
});

describe("mirror property (why the single-edge rung is lossless)", () => {
  it("SIX: any one planar edge may be forced to the opposite of the unhinted solution; still folds, same geometry", () => {
    const cp0 = toFold(lines, 6);
    const base = solveFlatFold(cp0);
    if (!base.ok) throw new Error("fixture must solve unhinted");
    // the solved assignment of planar edge k, found by its endpoints
    const solved = (k: number) => {
      const [u, v] = cp0.edges_vertices[k]!;
      const pt = (c: number[]) => base.cp.vertices_coords.findIndex((q) => Math.hypot(q[0]! - c[0]!, q[1]! - c[1]!) < 1e-9);
      const [a, b] = [pt(cp0.vertices_coords[u!]!), pt(cp0.vertices_coords[v!]!)];
      const e = base.cp.edges_vertices.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
      return base.cp.edges_assignment![e]!;
    };
    const free = cp0.edges_assignment!.map((a, i) => (a === "B" ? -1 : i)).filter((i) => i >= 0);
    for (const k of [free[0]!, oneEdge(cp0), free[free.length - 1]!]) {
      expect(["M", "V"]).toContain(solved(k));
      const cp = toFold(lines, 6);
      cp.edges_assignment![k] = solved(k) === "M" ? "V" : "M";
      expect(cp.edges_assignment!.filter((a) => a === "M" || a === "V")).toHaveLength(1);
      const r = solveFlatFold(cp);
      expect(r.ok, `edge ${k}`).toBe(true);
      if (r.ok) expect(uniaxialDeviation(lines, 6, tipList, r.cp, r.folded)).toBeLessThan(1e-9);
    }
  });
});

describe("solveGraded", () => {
  it("falls back from a refuted full assignment to a later rung", () => {
    const base = solveFlatFold(toFold(lines, 6, true));
    if (!base.ok) throw new Error("fixture must verify with Lang's hint");
    const good = assignmentOf(lines, 6, base.cp) as ("M" | "V")[];
    const k = lines.findIndex((l) => l.role === "contour");
    const wrong = good.map((a, i) => (i === k ? (a === "M" ? "V" : "M") : a));
    expect(solveFlatFold(toFold(lines, 6, wrong)).ok).toBe(false);
    const g = solveGraded(lines, 6, [{ strategy: "lang", hint: wrong }, "one", "none"]);
    expect(g.r.ok).toBe(true);
    expect(g.used).toBe("one");
    expect(g.tried.map((t) => [t.strategy, t.ok])).toEqual([["lang", false], ["one", true]]);
    expect(["assignment", "layers", "local"]).toContain(g.tried[0]!.stage);
    if (g.r.ok) expect(uniaxialDeviation(lines, 6, tipList, g.r.cp, g.r.folded)).toBeLessThan(1e-9);
  });

  it("stops at the first rung that works, and skips rungs over their edge limit", () => {
    const g = solveGraded(lines, 6, ["lang", "none"]);
    expect(g.tried.map((t) => t.strategy)).toEqual(["lang"]);
    const skipped = solveGraded(lines, 6, [{ strategy: "lang", edgeLimit: 1 }, "none"]);
    expect(skipped.tried.map((t) => t.strategy)).toEqual(["none"]);
    expect(skipped.skipped).toEqual(["lang"]);
  });

  it("a failure says which rungs were skipped for size, so it never reads as exhaustive", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6, 1, { ladder: ["one", "none"], unhintedEdgeLimit: 1 });
    expect(r.status).toBe("incomplete");
    if (r.status === "incomplete") expect(r.reason).toMatch(/not tried \(over 1 edges\): one, none/);
  });

  it("agreement is mirror-normalised", () => {
    expect(agreement(["M", "V", "U"], ["V", "M", "M"])).toEqual({ agree: 2, of: 2 });
  });

  it("boxPleatFromGrid reports the rung it solved with", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    expect(r.status).toBe("verified");
    if (r.status === "verified") expect(r.hint).toBe("lang");
  });

  it("fish 8x8 (diagonal): Lang's hint is refuted, a later rung verifies the base", () => {
    const fish = LIBRARY.fish![0]!;
    const p = packTree(fish, 8, "diagonal")!;
    const r = boxPleatFromGrid(fish, p.positions, 8, p.scale);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    expect(r.hint).not.toBe("lang");
    // the layout that verified is one where Lang's hint alone is refuted (at the assignment stage)
    const lang = solveGraded(r.lines, 8, ["lang"]);
    expect(lang.r.ok).toBe(false);
    expect(lang.tried[0]!.stage).toBe("assignment");
    expect(uniaxialDeviation(r.lines, 8, Object.values(p.positions), r.cp, r.folded)).toBeLessThan(1e-9);
  });
});
