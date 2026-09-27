// Fixtures for uniaxial box-pleat completion, from Lang, Origami Design
// Secrets 2nd ed., ch. 13. Coordinates were read off the printed figures by
// hand (grid units, origin at the top-left corner of the square, y down, as
// in the book).
//
// The 6×6 example (Figs 13.12–13.24): five flaps and one river.
//   left node L:  TL (length 2, tip at the left edge), TM (1, top edge), BL (1, bottom edge)
//   right node R: TR (1, right edge), BR (2, interior)
//   river L–R, width 1.

import { describe, expect, it } from "vitest";
import { localFlatFoldability } from "../engine/local.ts";
import { type Seg, boxPleatFromGrid, buildRegions, completeRegions, fillGaps, gapComponents, mergeSegments, skeletonOfCells, uniaxialDeviation } from "./boxpleat.ts";
import { LIBRARY } from "./library.ts";
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

/** Canonical text form of a segment set, for order-free comparison. */
const key = (s: Seg) => {
  const [p, q] = [s.a, s.b].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  return `${p![0]},${p![1]}-${q![0]},${q![1]}`;
};
/** Order-free, and collinear touching pieces joined (so a straight ridge is one segment). */
const keys = (ss: readonly Seg[]) => mergeSegments(ss.map((x) => ({ ...x, role: "ridge" as const }))).map(key).sort();
const seg = (ax: number, ay: number, bx: number, by: number): Seg => ({ a: [ax, ay], b: [bx, by] });

/** Cells of a region as a sorted list of "i,j". */
function cellsOf(map: ReturnType<typeof buildRegions>, name: string): string[] {
  const ri = map.regions.findIndex((r) => (r.kind === "flap" ? r.leaf : `river ${r.child}`) === name);
  const out: string[] = [];
  for (let j = 0; j < map.n; j++) for (let i = 0; i < map.n; i++) if (map.cell[j * map.n + i] === ri) out.push(`${i},${j}`);
  return out.sort();
}
const rect = (x0: number, y0: number, x1: number, y1: number) => {
  const out: string[] = [];
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) out.push(`${i},${j}`);
  return out.sort();
};

describe("straight skeleton of rectilinear hinge polygons (§13.4)", () => {
  it("square: the two diagonals (Fig 13.16 left)", () => {
    expect(keys(skeletonOfCells(rect(0, 0, 4, 4)))).toEqual(keys([seg(0, 0, 4, 4), seg(0, 4, 4, 0)]));
  });

  it("rectangle: the sawhorse, diagonals joined by a ridge parallel to the long side (Fig 13.16 right)", () => {
    expect(keys(skeletonOfCells(rect(0, 0, 6, 2)))).toEqual(
      keys([seg(0, 0, 1, 1), seg(0, 2, 1, 1), seg(1, 1, 5, 1), seg(5, 1, 6, 0), seg(5, 1, 6, 2)]),
    );
  });

  it("L-shape: the reflex corner sends a diagonal inward (checked by hand)", () => {
    const L = [...rect(0, 0, 4, 2), ...rect(0, 2, 2, 4)];
    expect(keys(skeletonOfCells(L))).toEqual(
      keys([seg(0, 0, 1, 1), seg(2, 2, 1, 1), seg(1, 1, 3, 1), seg(3, 1, 4, 0), seg(3, 1, 4, 2), seg(1, 1, 1, 3), seg(1, 3, 0, 4), seg(1, 3, 2, 4)]),
    );
  });
});

describe("Lang's 6×6 example (ODS ch. 13)", () => {
  const map = buildRegions(SIX, SIX_TIPS, 6, "L");

  it("hinge polygons and the river, rooted at L (Fig 13.14 left)", () => {
    expect(cellsOf(map, "TL")).toEqual(rect(0, 0, 2, 3));
    expect(cellsOf(map, "TM")).toEqual(rect(2, 0, 4, 1));
    expect(cellsOf(map, "TR")).toEqual(rect(5, 0, 6, 2));
    expect(cellsOf(map, "BR")).toEqual(rect(3, 2, 6, 6));
    expect(cellsOf(map, "BL")).toEqual(rect(0, 5, 2, 6));
    // width-1 river hugging R's flaps: down from the top edge, left, down to the bottom edge
    expect(cellsOf(map, "river R")).toEqual([...rect(4, 0, 5, 1), ...rect(2, 1, 5, 2), ...rect(2, 2, 3, 6)].sort());
    // the unused paper Lang absorbs by expanding a square into a rectangle
    expect(gapComponents(map).map((c) => c.cells.map(([i, j]) => `${i},${j}`).sort())).toEqual([rect(0, 3, 2, 5)]);
  });

  it("hinges and ridges match Fig 13.17 exactly when BL is expanded (Fig 13.14 right)", () => {
    const filled = fillGaps(map, [{ into: "BL" }]);
    expect(cellsOf(filled, "BL")).toEqual(rect(0, 3, 2, 6));
    const done = completeRegions(filled);
    expect(done.conflicts).toEqual([]);
    const role = (r: string) => done.lines.filter((l) => l.role === r);
    expect(keys(role("hinge"))).toEqual(
      keys([seg(2, 0, 2, 6), seg(0, 3, 2, 3), seg(2, 1, 4, 1), seg(4, 0, 4, 1), seg(5, 0, 5, 2), seg(3, 2, 6, 2), seg(3, 2, 3, 6)]),
    );
    expect(keys(role("ridge"))).toEqual(
      keys([
        seg(0, 1, 1, 0), seg(0, 1, 2, 3), // TL
        seg(2, 1, 3, 0), seg(3, 0, 4, 1), // TM
        seg(5, 0, 6, 1), seg(6, 1, 5, 2), // TR
        seg(4, 1, 5, 2), // river bend: straight continuation of TM's ridge (§13.4)
        seg(2, 1, 6, 5), // river bend continuing BR's diagonal through its tip
        seg(3, 6, 6, 3), // BR
        seg(0, 3, 1, 4), seg(2, 3, 1, 4), seg(1, 4, 1, 6), // BL sawhorse
      ]),
    );
  });

  it("axial contours launched from the flap tips and bounced (Figs 13.23–13.24)", () => {
    const done = completeRegions(fillGaps(map, [{ into: "BL" }]));
    const axial = done.lines.filter((l) => l.role === "contour" && l.elevation === 0);
    const covered = (s: Seg) =>
      axial.some((l) => {
        // s lies within l (both axis-parallel)
        const h = s.a[1] === s.b[1] && l.a[1] === l.b[1] && l.a[1] === s.a[1];
        const v = s.a[0] === s.b[0] && l.a[0] === l.b[0] && l.a[0] === s.a[0];
        const lo = (i: 0 | 1) => Math.min(l.a[i], l.b[i]), hi = (i: 0 | 1) => Math.max(l.a[i], l.b[i]);
        if (h) return lo(0) <= Math.min(s.a[0], s.b[0]) && Math.max(s.a[0], s.b[0]) <= hi(0);
        if (v) return lo(1) <= Math.min(s.a[1], s.b[1]) && Math.max(s.a[1], s.b[1]) <= hi(1);
        return false;
      });
    for (const s of [
      seg(0, 1, 2, 1), // from TL's tip to its hinge
      seg(3, 0, 3, 2), // from TM's tip, across the river, to BR's corner
      seg(4, 1, 6, 1), // from TR's tip into the river, ending on the bend ridge
      seg(1, 4, 6, 4), // through BR's tip, across the river, to BL's ridge junction
      seg(5, 2, 5, 6), // through BR's tip, hinge to paper edge
    ]) {
      expect(covered(s), `axial ${key(s)}`).toBe(true);
    }
  });

  it("the completed pattern folds flat into Lang's base: Kawasaki, flat-folder, and the folded geometry", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    expect(localFlatFoldability(r.cp)).toEqual([]);
    // tips and axials on one line, every contour at its elevation
    expect(uniaxialDeviation(r.lines, 6, Object.values(SIX_TIPS), r.cp, r.folded)).toBeLessThan(1e-9);
  });

  it("the base check rejects a pattern that folds flat but is not what we claim", () => {
    const r = boxPleatFromGrid(SIX, SIX_TIPS, 6);
    if (r.status !== "verified") throw new Error("fixture must verify");
    // same creases (so the same flat folding), wrong claim about the elevations
    const lying = r.lines.map((l) => (l.role === "contour" ? { ...l, elevation: l.elevation! + 1 } : l));
    expect(uniaxialDeviation(lying, 6, Object.values(SIX_TIPS), r.cp, r.folded)).toBeGreaterThan(0.5);
    // a "tip" claimed on a raised contour, which the pattern holds off the axis
    const raised = r.lines.filter((l) => l.role === "contour").reduce((a, b) => (b.elevation! > a.elevation! ? b : a));
    expect(raised.elevation).toBeGreaterThan(0);
    expect(uniaxialDeviation(r.lines, 6, [...Object.values(SIX_TIPS), raised.a], r.cp, r.folded)).toBeCloseTo(raised.elevation!, 9);
  });
});

describe("box-pleat completion on library designs", () => {
  it("crane on the bird-base packing: exactly the preliminary base, verified", () => {
    const crane = LIBRARY.crane![0]!;
    const p = packTree(crane, 16, "diagonal")!;
    const tips = p.positions;
    const r = boxPleatFromGrid(crane, tips, 16, p.scale);
    expect(r.status).toBe("verified");
    if (r.status !== "verified") return;
    // 2 diagonals + 2 midlines, split at the centre; no contour creases
    expect(r.lines.filter((l) => l.role === "contour")).toEqual([]);
    expect(r.cp.edges_assignment!.filter((a) => a === "M" || a === "V")).toHaveLength(8);
  });
});
