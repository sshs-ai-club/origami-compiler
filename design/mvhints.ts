// Graded mountain/valley hints for flat-folder on box-pleated crease patterns.
//
// Uniaxial bases are flat-folder's worst case (every face overlaps every
// other). A per-edge M/V hint prunes the search enormously, but assigned edges
// are HARD constraints, so a wrong hint refutes a pattern that is in fact
// foldable. The ladder here tries the strongest hint first and falls back to
// weaker ones. Hints only ever speed flat-folder up: a result is verified by
// flat-folder (and uniaxialDeviation in boxPleatFromGrid), never by the hint.
//
// What is PROVED and what is EMPIRICAL:
//  - "one" fixes EXACTLY ONE planar FOLD edge to M (cpFor builds the unhinted
//    crease pattern, then sets edges_assignment[k] for a single non-boundary
//    edge k; a CPLine is not used because planarisation splits it at every
//    crossing and each piece would inherit the assignment). That is lossless:
//    turning a flat folding over swaps every M and V and reverses the layer
//    order without moving any crease, so the folded geometry (hence
//    uniaxialDeviation) is unchanged. Hence if any valid folding exists, one
//    exists in which edge k is M, provided k is folded in every valid folding.
//    It is: solveFlatFold treats "U" as "M or V" and only drops edges the caller
//    marks "F", which we never do. Fixing TWO edges is not covered (a valid
//    folding may flip M/V along a straight line at a degree-4 vertex).
//  - "lang", "peaks", "troughs", "flaptroughs" assign whole CPLines, i.e. every
//    planar piece of them. They are heuristics (Lang, ODS 2nd ed. §13.5 p. 599,
//    calls the contour rule an approximation); their speed and safety are
//    empirical: see app/hintbench.ts.

import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { type FlatFoldResult, solveFlatFold } from "../engine/flatfold.ts";
import type { CPLine, RegionMap } from "./boxpleat.ts";
import { toFold } from "./boxpleat.ts";

export type HintStrategy = "lang" | "peaks" | "troughs" | "flaptroughs" | "one" | "none";
export type Hint = "M" | "V" | "U";

/**
 * The planar FOLD edge fixed by "one": the longest non-boundary edge (ties:
 * first). Any non-boundary edge is valid (see the proof above); the longest
 * touches the most faces, so it prunes best. -1 if there is none.
 */
export function oneEdge(cp: FoldFile): number {
  let best = -1, bestLen = -1;
  cp.edges_vertices.forEach(([u, v], i) => {
    if (cp.edges_assignment?.[i] === "B") return;
    const a = cp.vertices_coords[u!]!, b = cp.vertices_coords[v!]!;
    const len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    if (len > bestLen + 1e-12) {
      best = i;
      bestLen = len;
    }
  });
  return best;
}

/** The FOLD crease pattern a strategy hands to flat-folder (see the header for "one"). */
export function cpFor(lines: readonly CPLine[], n: number, strategy: HintStrategy, map?: RegionMap): FoldFile {
  if (strategy !== "one") return toFold(lines, n, hintFor(lines, strategy, map));
  const cp = toFold(lines, n);
  const k = oneEdge(cp);
  if (k >= 0) cp.edges_assignment![k] = "M";
  return cp;
}

/** True when both cells beside a line (that lie on the sheet) belong to flap regions. */
function insideFlaps(l: CPLine, map: RegionMap): boolean {
  const mx = (l.a[0] + l.b[0]) / 2, my = (l.a[1] + l.b[1]) / 2;
  const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  let seen = 0;
  for (const s of [-1, 1]) {
    const i = Math.floor(mx + s * 0.25 * nx), j = Math.floor(my + s * 0.25 * ny);
    if (i < 0 || j < 0 || i >= map.n || j >= map.n) continue;
    const r = map.cell[j * map.n + i]!;
    if (r < 0 || map.regions[r]!.kind !== "flap") return false;
    seen++;
  }
  return seen > 0;
}

/** One hint per line (every planar piece of a line inherits it). "one" is edge-level: see cpFor. */
export function hintFor(lines: readonly CPLine[], strategy: HintStrategy, map?: RegionMap): Hint[] {
  const out: Hint[] = lines.map(() => "U");
  switch (strategy) {
    case "none":
      break;
    case "lang":
      lines.forEach((l, i) => {
        if (l.role === "contour") out[i] = l.peak ? "V" : "M";
      });
      break;
    case "peaks":
      lines.forEach((l, i) => {
        if (l.role === "contour" && l.peak) out[i] = "V";
      });
      break;
    case "troughs":
      lines.forEach((l, i) => {
        if (l.role === "contour" && !l.peak) out[i] = "M";
      });
      break;
    case "flaptroughs":
      lines.forEach((l, i) => {
        if (l.role === "contour" && !l.peak && (!map || insideFlaps(l, map))) out[i] = "M";
      });
      break;
    case "one":
      // Edge-level, not line-level: see cpFor. Nothing is assigned per line.
      break;
  }
  return out;
}

export interface Rung {
  strategy: HintStrategy;
  /** Skip the rung when the crease pattern has more edges than this. */
  edgeLimit?: number;
  /** An explicit per-line assignment overriding hintFor (tests, experiments). */
  hint?: readonly Assignment[];
}

export interface Tried {
  strategy: HintStrategy;
  ok: boolean;
  stage?: string;
  ms: number;
}

export interface GradedOptions {
  map?: RegionMap;
  /** Edge limit of the rungs that carry no (or a lossless-only) hint; default 200. */
  unhintedEdgeLimit?: number;
}

/** lang -> one -> none: the strongest hint first, the lossless rungs as fallbacks. */
export const DEFAULT_LADDER: readonly Rung[] = [{ strategy: "lang" }, { strategy: "one" }, { strategy: "none" }];

/**
 * EMPIRICAL, not the default: peaks was refuted on 2 of 13 benchmark patterns
 * (both fish), so it fails the "never refuted" promotion rule. A refutation
 * costs ~10-35 ms. Whether it beats the single-edge `one` on the slow bird
 * cases is unmeasured (earlier figures used a line-level `one`; re-run
 * `app/hintbench.ts --slow`). Opt in via boxPleatFromGrid's `ladder`.
 */
export const PEAKS_LADDER: readonly Rung[] = [{ strategy: "lang" }, { strategy: "peaks" }, { strategy: "one" }, { strategy: "none" }];

/**
 * Solve with each rung in turn until flat-folder finds a layer order. A rung
 * whose hint is refuted costs its time and falls through; a rung over its edge
 * limit is skipped (listed in `skipped`, not `tried`). `none` (and `one`, unless given an
 * explicit limit) keep `unhintedEdgeLimit`.
 */
export function solveGraded(
  lines: readonly CPLine[],
  n: number,
  ladder: readonly (Rung | HintStrategy)[] = DEFAULT_LADDER,
  opts: GradedOptions = {},
): { r: FlatFoldResult; used: HintStrategy; tried: Tried[]; skipped: HintStrategy[]; limit: number } {
  const tried: Tried[] = [];
  const skipped: HintStrategy[] = [];
  const free = opts.unhintedEdgeLimit ?? 200;
  let r: FlatFoldResult = { ok: false, stage: "input", reason: "no rung of the ladder applies at this size" };
  let used: HintStrategy = "none";
  for (const raw of ladder) {
    const rung: Rung = typeof raw === "string" ? { strategy: raw } : raw;
    const cp = rung.hint ? toFold(lines, n, rung.hint) : cpFor(lines, n, rung.strategy, opts.map);
    const limit = rung.edgeLimit ?? (rung.strategy === "none" || rung.strategy === "one" ? free : Infinity);
    if (cp.edges_vertices.length > limit) {
      skipped.push(rung.strategy);
      continue;
    }
    const t0 = performance.now();
    r = solveFlatFold(cp);
    used = rung.strategy;
    tried.push({ strategy: rung.strategy, ok: r.ok, stage: r.ok ? undefined : r.stage, ms: performance.now() - t0 });
    if (r.ok) break;
  }
  return { r, used, tried, skipped, limit: free };
}

/**
 * The M/V a solved crease pattern gives each line (taken a quarter grid unit
 * along it, which is never a vertex), for comparing hints with solutions.
 */
export function assignmentOf(lines: readonly CPLine[], n: number, cp: { vertices_coords: number[][]; edges_vertices: number[][]; edges_assignment?: string[] }): Hint[] {
  return lines.map((l) => {
    const len = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]);
    const px = (l.a[0] + ((l.b[0] - l.a[0]) / len) * 0.25) / n, py = (l.a[1] + ((l.b[1] - l.a[1]) / len) * 0.25) / n;
    for (let e = 0; e < cp.edges_vertices.length; e++) {
      const [u, v] = cp.edges_vertices[e]!;
      const [ux, uy] = cp.vertices_coords[u!]!, [vx, vy] = cp.vertices_coords[v!]!;
      if (Math.abs((vx! - ux!) * (py - uy!) - (vy! - uy!) * (px - ux!)) > 1e-9) continue;
      if (Math.min(ux!, vx!) - 1e-9 > px || px > Math.max(ux!, vx!) + 1e-9 || Math.min(uy!, vy!) - 1e-9 > py || py > Math.max(uy!, vy!) + 1e-9) continue;
      const a = cp.edges_assignment?.[e];
      return a === "M" || a === "V" ? a : "U";
    }
    return "U";
  });
}

/**
 * How many of a hint's assigned creases a solution agrees with, after
 * mirror-normalising (flipping the solution over swaps every M and V, which is
 * the same folding). Returns the better of the two orientations.
 */
export function agreement(hint: readonly Hint[], solution: readonly Hint[]): { agree: number; of: number } {
  let same = 0, flip = 0, of = 0;
  hint.forEach((h, i) => {
    const s = solution[i]!;
    if (h === "U" || s === "U") return;
    of++;
    if (h === s) same++;
    else flip++;
  });
  return { agree: Math.max(same, flip), of };
}
