// Hand-checked cases for collapse stage verification.
// Flat-foldability per stage is necessary only; motion is not verified.

import { describe, expect, it } from "vitest";
import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { boxPleatFromGrid } from "../design/boxpleat.ts";
import type { FlapTree } from "../design/tree.ts";
import { type CollapseStage, isChain, verifyStage } from "./collapse.ts";

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
