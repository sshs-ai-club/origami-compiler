// Contour parity (box-pleat completion, step 3).
//
// With integer tips and lengths, every contour crease has elevation - u an
// integer (u = y for a horizontal line, x for a vertical one), so the
// "level shifter" branches of completeRegions are unreachable. These tests
// pin the invariant on Lang's 6x6 example, on the whole library and on random
// two-hub trees, and test the elevation function on hand-built graphs.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type CPLine, buildRegions, completeRegions, contourElevations, fillGaps, gapComponents } from "./boxpleat.ts";
import { LIBRARY } from "./library.ts";
import { type Symmetry, packTree } from "./packing.ts";
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

const contours = (lines: readonly CPLine[]) => lines.filter((l) => l.role === "contour");
/** The invariant: elevation - u is an integer for every contour crease. */
function parityOk(lines: readonly CPLine[]): boolean {
  return contours(lines).every((l) => {
    const u = l.a[1] === l.b[1] ? l.a[1] : l.a[0];
    return Number.isInteger(l.elevation! - u);
  });
}
/** Elevation of the contour crease containing the axis-parallel segment a-b, if any. */
function elevationAt(lines: readonly CPLine[], a: [number, number], b: [number, number]): number | undefined {
  const horiz = a[1] === b[1];
  const i = horiz ? 0 : 1, j = horiz ? 1 : 0;
  return contours(lines).find(
    (l) =>
      l.a[j] === a[j] && l.b[j] === a[j] &&
      Math.min(l.a[i], l.b[i]) <= Math.min(a[i], b[i]) && Math.max(a[i], b[i]) <= Math.max(l.a[i], l.b[i]),
  )?.elevation;
}

/** Fill every gap by the first (or "grow") choice and complete; null when the layout does not build. */
function complete(tree: FlapTree, tips: Record<string, [number, number]>, n: number, root: string, grow: boolean) {
  try {
    const map = buildRegions(tree, tips, n, root);
    const comps = gapComponents(map);
    if (comps.some((c) => c.flaps.length === 0)) return null;
    const filled = fillGaps(map, comps.map((c) => ({ into: grow && c.flaps.length > 1 ? "grow" : c.flaps[0]! })));
    return completeRegions(filled);
  } catch {
    return null;
  }
}

describe("Lang's 6x6 example", () => {
  const done = completeRegions(fillGaps(buildRegions(SIX, SIX_TIPS, 6, "L"), [{ into: "BL" }]));

  it("has no conflicts and satisfies the parity invariant", () => {
    expect(done.conflicts).toEqual([]);
    expect(contours(done.lines).length).toBeGreaterThan(0);
    expect(parityOk(done.lines)).toBe(true);
  });

  it("elevations match values checked by hand from the tips", () => {
    expect(elevationAt(done.lines, [0, 4], [6, 4])).toBe(0);
    expect(elevationAt(done.lines, [5, 2], [5, 6])).toBe(0);
    expect(elevationAt(done.lines, [0, 5], [4, 5])).toBe(1);
    expect(elevationAt(done.lines, [0.5, 1.5], [0.5, 3.5])).toBe(0.5);
  });
});

describe("parity invariant over layouts", () => {
  it("library, n in 6..12, both symmetries, every root: no conflicts", () => {
    let layouts = 0;
    for (const trees of Object.values(LIBRARY)) {
      for (const tree of trees) {
        const lv = new Set(tree.nodes.filter((v) => tree.edges.filter((e) => e.a === v || e.b === v).length === 1));
        const internal = tree.nodes.filter((v) => !lv.has(v));
        for (const n of [6, 8, 10, 12]) {
          for (const sym of ["diagonal", "book"] as Symmetry[]) {
            const p = packTree(tree, n, sym, 1500);
            if (!p) continue;
            const g = { ...tree, edges: tree.edges.map((e) => ({ ...e, length: Math.max(1, Math.floor(e.length * p.scale + 1e-9)) })) };
            for (const root of internal) for (const grow of [false, true]) {
              const done = complete(g, p.positions, n, root, grow);
              if (!done) continue;
              layouts++;
              expect(done.conflicts, `${tree.subject}/${tree.variant} n=${n} ${sym} root ${root}`).toEqual([]);
              expect(parityOk(done.lines), `${tree.subject}/${tree.variant} n=${n} ${sym} root ${root}`).toBe(true);
            }
          }
        }
      }
    }
    expect(layouts).toBeGreaterThan(0);
    console.log(`library sweep: ${layouts} layouts`);
  });

  it("300 seeded random two-hub trees: no conflicts", () => {
    let s = 7;
    const rnd = (k: number) => {
      s = (s * 1103515245 + 12345) % 2 ** 31;
      return Math.floor((s / 2 ** 31) * k);
    };
    let layouts = 0;
    for (let k = 0; k < 300; k++) {
      const nLeaves = 2 + rnd(5);
      const edges = [{ a: "A", b: "B", length: 1 + rnd(2) }];
      const nodes = ["A", "B"];
      for (let i = 0; i < nLeaves; i++) {
        nodes.push(`l${i}`);
        edges.push({ a: i === 0 ? "A" : i === 1 ? "B" : rnd(2) ? "A" : "B", b: `l${i}`, length: 1 + rnd(2) });
      }
      const tree: FlapTree = { subject: `rand${k}`, variant: "r", nodes, edges, mirror: [], shaping: [] };
      const n = 8 + 2 * rnd(2);
      const p = packTree(tree, n, "none", 400);
      if (!p) continue;
      const g = { ...tree, edges: tree.edges.map((e) => ({ ...e, length: Math.max(1, Math.floor(e.length * p.scale + 1e-9)) })) };
      for (const root of k % 2 ? ["A"] : ["B"]) {
        const done = complete(g, p.positions, n, root, true);
        if (!done) continue;
        layouts++;
        expect(done.conflicts, `tree ${k} root ${root}`).toEqual([]);
        expect(parityOk(done.lines), `tree ${k} root ${root}`).toBe(true);
      }
    }
    expect(layouts).toBeGreaterThan(0);
    console.log(`random sweep: ${layouts} layouts`);
  });
});

describe("contourElevations on hand-built graphs", () => {
  const graph = (edges: [number, number][]) => {
    const adj = new Map<number, Set<number>>();
    for (const [x, y] of edges) {
      if (!adj.has(x)) adj.set(x, new Set());
      if (!adj.has(y)) adj.set(y, new Set());
      adj.get(x)!.add(y);
      adj.get(y)!.add(x);
    }
    return adj;
  };

  it("an odd cycle with one source reports parity", () => {
    const e: [number, number][] = [[0, 1], [1, 2], [2, 0]];
    const r = contourElevations(graph(e), [0], e);
    expect(r.bad.map((b) => b.kind)).toEqual(["parity"]);
    expect(r.bad[0]!.step).toEqual([1, 2]);
  });

  it("an even cycle is consistent", () => {
    const e: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];
    const r = contourElevations(graph(e), [0], e);
    expect(r.bad).toEqual([]);
    expect([...r.H]).toEqual([[0, 0], [1, 1], [3, 1], [2, 2]]);
  });

  it("a class with no path to a source is unreached", () => {
    const e: [number, number][] = [[0, 1], [2, 3]];
    const r = contourElevations(graph(e), [0], e);
    expect(r.bad.map((b) => [b.kind, b.step])).toEqual([["unreached", [2, 3]]]);
  });
});

describe("no level-shifter excuse", () => {
  it("boxpleat.ts has no conflict reason mentioning a level shifter", () => {
    const src = readFileSync(new URL("./boxpleat.ts", import.meta.url), "utf8");
    const reasons = src.split("\n").filter((l) => /reason|PARITY_BROKEN =/.test(l));
    expect(reasons.length).toBeGreaterThan(0);
    for (const l of reasons) expect(l).not.toMatch(/level shifter/i);
  });
});
