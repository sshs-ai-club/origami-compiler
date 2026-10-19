// Hand-checked cases for collapse stage verification.
// Flat-foldability per stage is necessary only; motion is not verified.

import { describe, expect, it } from "vitest";
import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { boxPleatFromGrid } from "../design/boxpleat.ts";
import type { FlapTree } from "../design/tree.ts";
import { type CollapseStage, closeStage, creaseLines, findCollapse, fineGroupsOfBoxPleat, groupsOfBoxPleat, isChain, verifyStage } from "./collapse.ts";

// Lang 6x6 fixture, copied from design/boxpleat.test.ts.
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

/**
 * 2x2 square, centre vertex 8 joined to the four side midpoints. Edges 0-7 are
 * the border, 8..11 are the creases at 0, 90, 180, 270 degrees: M, V, V, V.
 */
const CROSS: FoldFile = {
  file_spec: 1.2,
  file_creator: "test",
  vertices_coords: [[0, 0], [2, 0], [2, 2], [0, 2], [1, 0], [2, 1], [1, 2], [0, 1], [1, 1]],
  edges_vertices: [[0, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3], [3, 7], [7, 0], [8, 5], [8, 4], [8, 7], [8, 6]],
  edges_assignment: ["B", "B", "B", "B", "B", "B", "B", "B", "M", "V", "V", "V"] as Assignment[],
};
const E = 8, N = 9, W = 10, S = 11;

describe("verifyStage", () => {
  it("degree-4 vertex, Maekawa 3:1: the full set is ok", () => {
    expect(verifyStage(CROSS, [E, N, W, S]).ok).toBe(true);
  });

  it("two perpendicular creases at a vertex fail locally", () => {
    const v = verifyStage(CROSS, [E, N]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.stage).toBe("local");
  });

  it("two collinear creases (both V) are ok", () => {
    expect(verifyStage(CROSS, [N, S]).ok).toBe(true);
  });

  it("empty subset is a flat sheet and is ok", () => {
    expect(verifyStage(CROSS, []).ok).toBe(true);
  });

  it("a bad index returns ok:false instead of throwing", () => {
    const v = verifyStage(CROSS, [99]);
    expect(v.ok).toBe(false);
  });

  const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);

  it("Lang 6x6: the full creased set and the empty set are ok", () => {
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    const all = r.cp.edges_assignment!.flatMap((a, i) => (a === "M" || a === "V" ? [i] : []));
    expect(verifyStage(r.cp, all).ok).toBe(true);
    expect(verifyStage(r.cp, []).ok).toBe(true);
  });

  it("Lang 6x6: one lone interior crease is rejected with a reason", () => {
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    const one = r.cp.edges_assignment!.findIndex((a) => a === "M" || a === "V");
    const v = verifyStage(r.cp, [one]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason.length).toBeGreaterThan(0);
  });
});

/**
 * 4x4 square with three full-width parallel creases y=1 (M), y=2 (V), y=3 (M).
 * Hand check: no interior vertex (every crease ends on the border), so Maekawa
 * and Kawasaki do not apply; an alternating accordion M,V,M is flat-foldable
 * with 4 layers, and so is every subset of it (each crease is a full fold line).
 * Edges 10, 11, 12 are the creases.
 */
const PLEATS: FoldFile = {
  file_spec: 1.2,
  file_creator: "test",
  vertices_coords: [[0, 0], [4, 0], [4, 4], [0, 4], [0, 1], [0, 2], [0, 3], [4, 1], [4, 2], [4, 3]],
  edges_vertices: [[0, 4], [4, 5], [5, 6], [6, 3], [1, 7], [7, 8], [8, 9], [9, 2], [0, 1], [3, 2], [4, 7], [5, 8], [6, 9]],
  edges_assignment: ["B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "M", "V", "M"] as Assignment[],
};

describe("findCollapse", () => {
  it("three independent full-width pleats: a 3-stage chain is found", () => {
    const res = findCollapse(PLEATS, [
      { label: "y1", edges: [10] },
      { label: "y2", edges: [11] },
      { label: "y3", edges: [12] },
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.stages.length).toBe(3);
    expect(res.stages.map((s) => s.creases.length)).toEqual([1, 2, 3]);
    expect(isChain(res.stages)).toBe(true);
    expect(res.stages[2]!.creases).toEqual([10, 11, 12]);
    expect(res.stats.search).toBe("exhaustive");
    expect(res.stats.complete).toBe(true);
  });

  it("only the full set as a group: reported as one-shot, not success", () => {
    const res = findCollapse(PLEATS, []);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("only the one-shot collapse verifies");
  });

  it("a budget of 1 check stops with a budget reason", () => {
    const res = findCollapse(PLEATS, [{ label: "y1", edges: [10] }, { label: "y2", edges: [11] }], { maxChecks: 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/^budget exhausted after 1 stage checks/);
  });

  it("many groups switch to beam search and still return a valid chain", () => {
    const res = findCollapse(PLEATS, [{ label: "y1", edges: [10] }, { label: "y2", edges: [11] }, { label: "y3", edges: [12] }], { exhaustiveLimit: 2 });
    expect(res.stats.search).toBe("beam");
    expect(res.ok).toBe(true);
    if (res.ok) expect(isChain(res.stages)).toBe(true);
  });

  it("Lang 6x6: cp edge to line mapping is one-to-one per M/V edge, counts match r.lines", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    const map = creaseLines(r.cp, r.lines, 6);
    const asg = r.cp.edges_assignment!;
    expect(map.size).toBe(asg.filter((a) => a === "M" || a === "V").length);
    for (const ls of map.values()) expect(ls.length).toBe(1);
    // every line owns at least one cp edge; per-role line counts match
    const used = new Set([...map.values()].map((l) => l[0]!));
    expect(used.size).toBe(r.lines.length);
    for (const role of ["hinge", "ridge", "contour"] as const) {
      expect(new Set([...map.values()].map((l) => l[0]!).filter((k) => r.lines[k]!.role === role)).size).toBe(r.lines.filter((l) => l.role === role).length);
    }
  });

  it("Lang 6x6: result is independently valid (ok:true chain or ok:false verified stoppedAt)", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    const groups = groupsOfBoxPleat(r, 6);
    const res = findCollapse(r.cp, groups);
    const all = r.cp.edges_assignment!.flatMap((a, i) => (a === "M" || a === "V" ? [i] : []));
    console.info(
      "SIX collapse:",
      res.ok ? `ok, ${res.stages.length} stages, sizes ${res.stages.map((s) => s.creases.length).join("/")}` : `not ok: ${res.reason}; stoppedAt ${res.stoppedAt ? res.stoppedAt.creases.length + " creases" : "null"}`,
      "groups",
      groups.map((g) => `${g.label}:${g.edges.length}`).join(" "),
      "stats",
      JSON.stringify(res.stats),
    );
    if (res.ok) {
      expect(res.stages.length).toBeGreaterThanOrEqual(2);
      expect(isChain(res.stages)).toBe(true);
      expect(res.stages[res.stages.length - 1]!.creases).toEqual(all);
      for (const s of res.stages) expect(verifyStage(r.cp, s.creases).ok).toBe(true);
      for (let i = 1; i < res.stages.length; i++) expect(res.stages[i]!.creases.length).toBeGreaterThan(res.stages[i - 1]!.creases.length);
    } else if (res.stoppedAt) {
      expect(verifyStage(r.cp, res.stoppedAt.creases).ok).toBe(true);
    }
  }, 60_000);
});

describe("closeStage", () => {
  const all = new Set([E, N, W, S]);
  it("{E,N} closes to all four; {N,S} stays; {} stays", () => {
    expect([...closeStage(CROSS, new Set([E, N]), all)!].sort((a, b) => a - b)).toEqual([E, N, W, S]);
    expect([...closeStage(CROSS, new Set([N, S]), all)!].sort((a, b) => a - b)).toEqual([N, S]);
    expect(closeStage(CROSS, new Set(), all)!.size).toBe(0);
  });
  it("is a superset of the input, a subset of `all`, and its result verifies", () => {
    for (const sub of [[E], [N], [E, W], [E, N, W], [N, S], [E, N, W, S]]) {
      const c = closeStage(CROSS, new Set(sub), all);
      expect(c).not.toBeNull();
      for (const e of sub) expect(c!.has(e)).toBe(true);
      for (const e of c!) expect(all.has(e)).toBe(true);
      expect(verifyStage(CROSS, [...c!]).ok).toBe(true);
    }
  });
  it("returns null when `all` cannot repair the vertex, or the input is outside `all`", () => {
    expect(closeStage(CROSS, new Set([E]), new Set([E, N]))).toBeNull();
    expect(closeStage(CROSS, new Set([E, W]), new Set([E, N]))).toBeNull();
  });
  // Case (c) (a 4x4 grid with a perpendicular crease) is skipped: a full-width
  // crossing of collinear creases gives 2:2 M/V at the vertex, which violates
  // Maekawa, so no hand-checkable flat-foldable fixture of that shape exists.
});

describe("fineGroupsOfBoxPleat + closeUnions on Lang 6x6", () => {
  it("result is independently valid (ok:true chain or ok:false verified stoppedAt)", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    const groups = fineGroupsOfBoxPleat(r, 6);
    const res = findCollapse(r.cp, groups, { closeUnions: true });
    const all = r.cp.edges_assignment!.flatMap((a, i) => (a === "M" || a === "V" ? [i] : []));
    // diagnostic: closure size of each single line (null = cannot close)
    const lm = creaseLines(r.cp, r.lines, 6);
    const allSet = new Set(all);
    const per = r.lines.map((_, k) => {
      const es = [...lm].filter(([, ls]) => ls[0] === k).map(([e]) => e);
      const c = closeStage(r.cp, new Set(es), allSet);
      return c ? `${es.length}->${c.size}` : `${es.length}->null`;
    });
    console.info("SIX per-line closure (own->closed):", per.join(" "));
    console.info(
      "SIX fine collapse:",
      res.ok ? `ok, ${res.stages.length} stages, sizes ${res.stages.map((s) => s.creases.length).join("/")}` : `not ok: ${res.reason}; stoppedAt ${res.stoppedAt ? res.stoppedAt.creases.length + " creases" : "null"}`,
      "of",
      all.length,
      "creases; groups",
      groups.length,
      groups.map((g) => g.edges.length).join("/"),
      "stats",
      JSON.stringify(res.stats),
    );
    for (const g of groups) expect(g.edges.length).toBeLessThan(all.length);
    if (res.ok) {
      expect(res.stages.length).toBeGreaterThanOrEqual(2);
      expect(isChain(res.stages)).toBe(true);
      expect(res.stages[res.stages.length - 1]!.creases).toEqual(all);
      for (const s of res.stages) expect(verifyStage(r.cp, s.creases).ok).toBe(true);
      for (let i = 1; i < res.stages.length; i++) expect(res.stages[i]!.creases.length).toBeGreaterThan(res.stages[i - 1]!.creases.length);
    } else if (res.stoppedAt) {
      expect(verifyStage(r.cp, res.stoppedAt.creases).ok).toBe(true);
    }
  }, 85_000);
});

describe("isChain", () => {
  const st = (creases: number[]): CollapseStage => ({ creases, verdict: { ok: true, states: 1n } });
  it("accepts nested stages", () => {
    expect(isChain([st([]), st([1]), st([1, 2]), st([1, 2, 3])])).toBe(true);
    expect(isChain([])).toBe(true);
  });
  it("rejects non-nested stages", () => {
    expect(isChain([st([1]), st([2, 3])])).toBe(false);
    expect(isChain([st([1, 2]), st([1])])).toBe(false);
  });
});
