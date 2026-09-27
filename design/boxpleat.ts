// Uniaxial box pleating: grid packing -> complete crease pattern.
//
// Source: Lang, Origami Design Secrets, 2nd ed., §13.3–13.5 (polygon
// packing, ridge creases, axis-parallel creases and elevation). The steps:
//
//  1. Hinge polygons (§13.3). Every flap gets the square that encloses its
//     packing circle; every branch edge of the tree gets a hinge river of
//     constant width. All paper must end up in some polygon: unused paper is
//     absorbed by expanding flap polygons (rivers may not expand). Polygon
//     boundaries are the hinge creases.
//  2. Ridges (§13.4). In a flap polygon: its straight skeleton. In a river: a
//     45° crease across every bend, corner to corner.
//  3. Contours (§13.5). Axis-parallel creases run perpendicular to the hinges.
//     Axial (elevation 0) contours start at every flap tip, cross hinges, and
//     reflect across ridges ("bounce") until they leave the paper or close.
//     Between two parallel contours of equal elevation there is a fold
//     halfway, at a higher elevation; repeat until nothing changes. A contour
//     is a crease where the elevation has a local extremum across it.
//
// How it is computed. The square is cut into triangles (each half-grid cell
// by its two diagonals). Every hinge, ridge and contour of a design whose
// polygons lie on the integer grid runs along those triangle sides, because
// skeleton vertices land on the half-grid. Each triangle is labelled with the
// polygon edge that owns it (its skeleton face); faces give the contour
// direction. Contours are then equivalence classes of (face, offset) pairs,
// linked wherever two faces meet: that union IS the bouncing. Elevation is
// the breadth-first distance (in half-grid steps) from the tip classes —
// Lang's "launch the axials, then add midpoints between them" — and must
// change by exactly one half-step between neighbouring contours; where it
// cannot, the design needs a level shifter (§14.1) and is reported, not
// guessed.
//
// Nothing here claims foldability. boxPleatFromGrid hands every result to
// engine/local.ts (Kawasaki) and engine/flatfold.ts (flat-folder); only what
// flat-folder verifies is returned as "verified".

import { type FlatFoldResult, foldFromLines, solveFlatFold } from "../engine/flatfold.ts";
import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { localFlatFoldability } from "../engine/local.ts";
import { type FlapTree, leaves } from "./tree.ts";

export type Pt = [number, number];
export interface Seg {
  a: Pt;
  b: Pt;
}

export type Region =
  | { kind: "flap"; leaf: string; tip: Pt; r: number }
  | {
      kind: "river";
      /** The tree edge child–parent, child on the side the river hugs. */
      child: string;
      parent: string;
      width: number;
      /** Flap tips inside the river, with their tree distance to `child`. */
      inner: { leaf: string; tip: Pt; off: number }[];
    };

export interface RegionMap {
  n: number;
  root: string;
  regions: Region[];
  /** Region index of cell (i, j) at j * n + i; -1 for paper no polygon uses yet. */
  cell: Int32Array;
}

export type LineRole = "hinge" | "ridge" | "contour";
export interface CPLine extends Seg {
  role: LineRole;
  /** Contours only: elevation above the axis, in grid units (0 = axial). */
  elevation?: number;
  /** Contours only: true where the elevation peaks (paper lower on both sides), false at a trough. */
  peak?: boolean;
}

export interface Conflict {
  at: Pt;
  reason: string;
}

export interface Completion {
  lines: CPLine[];
  conflicts: Conflict[];
}

// ---------------------------------------------------------------- tree helpers

interface Rooted {
  parent: Map<string, string>;
  /** leaf -> tree distance from every ancestor on the way to the root */
  below: Map<string, { leaf: string; d: number }[]>;
  len: Map<string, number>; // "a|b" and "b|a"
}

function rootTree(tree: FlapTree, root: string): Rooted {
  const len = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const e of tree.edges) {
    len.set(`${e.a}|${e.b}`, e.length);
    len.set(`${e.b}|${e.a}`, e.length);
    adj.set(e.a, [...(adj.get(e.a) ?? []), e.b]);
    adj.set(e.b, [...(adj.get(e.b) ?? []), e.a]);
  }
  const parent = new Map<string, string>();
  const order: string[] = [];
  const stack = [root];
  const seen = new Set([root]);
  while (stack.length) {
    const v = stack.pop()!;
    order.push(v);
    for (const w of adj.get(v) ?? []) {
      if (seen.has(w)) continue;
      seen.add(w);
      parent.set(w, v);
      stack.push(w);
    }
  }
  const below = new Map<string, { leaf: string; d: number }[]>();
  const lv = new Set(leaves(tree));
  for (const v of order.reverse()) {
    const list = lv.has(v) ? [{ leaf: v, d: 0 }] : [];
    for (const w of adj.get(v) ?? []) {
      if (parent.get(w) !== v) continue;
      const l = len.get(`${v}|${w}`)!;
      for (const x of below.get(w)!) list.push({ leaf: x.leaf, d: x.d + l });
    }
    below.set(v, list);
  }
  return { parent, below, len };
}

const linf = (p: Pt, q: Pt) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]));

// ------------------------------------------------------- step 1: hinge polygons

/**
 * Minimum hinge polygons for a packing on an n×n grid, with the tree rooted at
 * `root`: each flap's square (half-side = flap length, clipped to the paper)
 * and, for every branch edge, the river of that width hugging the side away
 * from the root. Lengths and tips must be integers (grid units). Paper beyond
 * the reach of the root is left as -1 for fillGaps.
 *
 * Throws if two polygons overlap, which only happens for an invalid packing.
 */
export function buildRegions(tree: FlapTree, tips: Record<string, Pt>, n: number, root: string): RegionMap {
  const T = rootTree(tree, root);
  const regions: Region[] = [];
  const lv = leaves(tree);
  for (const leaf of lv) {
    const tip = tips[leaf];
    if (!tip) throw new Error(`no tip position for ${leaf}`);
    regions.push({ kind: "flap", leaf, tip, r: T.len.get(`${leaf}|${T.parent.get(leaf)}`)! });
  }
  for (const v of tree.nodes) {
    const p = T.parent.get(v);
    if (p === undefined || lv.includes(v)) continue;
    regions.push({
      kind: "river",
      child: v,
      parent: p,
      width: T.len.get(`${v}|${p}`)!,
      inner: T.below.get(v)!.map((x) => ({ leaf: x.leaf, tip: tips[x.leaf]!, off: x.d })),
    });
  }
  const cell = new Int32Array(n * n).fill(-1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c: Pt = [i + 0.5, j + 0.5];
      regions.forEach((r, ri) => {
        let inside: boolean;
        if (r.kind === "flap") inside = linf(c, r.tip) < r.r;
        else {
          const g = Math.min(...r.inner.map((x) => linf(c, x.tip) - x.off));
          inside = g > 0 && g < r.width;
        }
        if (!inside) return;
        const prev = cell[j * n + i]!;
        if (prev !== -1) throw new Error(`hinge polygons overlap at cell (${i}, ${j}): ${regionName(regions[prev]!)} and ${regionName(r)} (invalid packing)`);
        cell[j * n + i] = ri;
      });
    }
  }
  return { n, root, regions, cell };
}

export const regionName = (r: Region) => (r.kind === "flap" ? r.leaf : `river ${r.child}`);

export interface GapComponent {
  cells: Pt[];
  /** Flaps whose polygons touch this unused paper (rivers cannot absorb it). */
  flaps: string[];
}

export function gapComponents(map: RegionMap): GapComponent[] {
  const { n, cell } = map;
  const seen = new Uint8Array(n * n);
  const out: GapComponent[] = [];
  for (let s = 0; s < n * n; s++) {
    if (cell[s] !== -1 || seen[s]) continue;
    const cells: Pt[] = [];
    const flaps = new Set<string>();
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      const i = k % n, j = (k - i) / n;
      cells.push([i, j]);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const m = b * n + a;
        const r = cell[m]!;
        if (r === -1) {
          if (!seen[m]) {
            seen[m] = 1;
            stack.push(m);
          }
        } else if (map.regions[r]!.kind === "flap") flaps.add(regionName(map.regions[r]!));
      }
    }
    out.push({ cells, flaps: [...flaps].sort() });
  }
  return out;
}

/**
 * Absorb each unused component (in gapComponents order) into one adjacent
 * flap polygon, or "grow" all adjacent flap polygons into it at equal speed.
 */
export function fillGaps(map: RegionMap, choices: { into: string }[]): RegionMap {
  const comps = gapComponents(map);
  if (choices.length !== comps.length) throw new Error(`${comps.length} gap components, ${choices.length} choices`);
  const cell = map.cell.slice();
  const index = (name: string) => map.regions.findIndex((r) => r.kind === "flap" && r.leaf === name);
  const n = map.n;
  comps.forEach((comp, k) => {
    const into = choices[k]!.into;
    if (into !== "grow") {
      const ri = index(into);
      if (ri < 0 || !comp.flaps.includes(into)) throw new Error(`${into} does not touch gap component ${k}`);
      for (const [i, j] of comp.cells) cell[j * n + i] = ri;
      return;
    }
    // multi-source BFS from the flap polygons around the component
    const inComp = new Set(comp.cells.map(([i, j]) => j * n + i));
    let frontier = [...inComp].filter((s) => neighbours(s, n).some((m) => cell[m]! >= 0 && map.regions[cell[m]!]!.kind === "flap"));
    while (frontier.length) {
      const claims = new Map<number, number>();
      for (const s of frontier) {
        const owners = neighbours(s, n).map((m) => cell[m]!).filter((r) => r >= 0 && map.regions[r]!.kind === "flap");
        if (owners.length) claims.set(s, Math.min(...owners));
      }
      for (const [s, r] of claims) {
        cell[s] = r;
        inComp.delete(s);
      }
      frontier = [...inComp].filter((s) => neighbours(s, n).some((m) => cell[m]! >= 0 && map.regions[cell[m]!]!.kind === "flap"));
      if (claims.size === 0) break;
    }
  });
  return { ...map, cell };
}

function neighbours(s: number, n: number): number[] {
  const i = s % n, j = (s - i) / n;
  const out: number[] = [];
  if (i > 0) out.push(s - 1);
  if (i < n - 1) out.push(s + 1);
  if (j > 0) out.push(s - n);
  if (j < n - 1) out.push(s + n);
  return out;
}

// --------------------------------------------------------------- the triangle mesh

// Half-cell (a, b) is [a/2, (a+1)/2] × [b/2, (b+1)/2], cut by its diagonals into
// four triangles k = 0..3 (the sides y = b/2, x = (a+1)/2, y = (b+1)/2, x = a/2).
// Triangle vertices: two half-cell corners, then the centre.

interface Mesh {
  /** Half-cells span [a0, a1) × [b0, b1). */
  a0: number;
  b0: number;
  w: number;
  h: number;
  /** Per triangle: region index (-1 = not part of the mesh), face label, face id. */
  region: Int32Array;
  label: string[];
  face: Int32Array;
}

const triId = (m: Mesh, a: number, b: number, k: number) => ((b - m.b0) * m.w + (a - m.a0)) * 4 + k;

function triVerts(a: number, b: number, k: number): [Pt, Pt, Pt] {
  const x0 = a / 2, y0 = b / 2, x1 = (a + 1) / 2, y1 = (b + 1) / 2;
  const c: Pt = [(x0 + x1) / 2, (y0 + y1) / 2];
  switch (k) {
    case 0: return [[x0, y0], [x1, y0], c];
    case 1: return [[x1, y0], [x1, y1], c];
    case 2: return [[x1, y1], [x0, y1], c];
    default: return [[x0, y1], [x0, y0], c];
  }
}

/** Every pair of triangles sharing a side, with the side. */
function* adjacentPairs(m: Mesh): Generator<[number, number, Pt, Pt]> {
  for (let b = m.b0; b < m.b0 + m.h; b++) {
    for (let a = m.a0; a < m.a0 + m.w; a++) {
      const [c0, c1, c2, c3] = [triVerts(a, b, 0), triVerts(a, b, 1), triVerts(a, b, 2), triVerts(a, b, 3)];
      const ctr = c0[2];
      yield [triId(m, a, b, 0), triId(m, a, b, 1), c0[1], ctr];
      yield [triId(m, a, b, 1), triId(m, a, b, 2), c1[1], ctr];
      yield [triId(m, a, b, 2), triId(m, a, b, 3), c2[1], ctr];
      yield [triId(m, a, b, 3), triId(m, a, b, 0), c3[1], ctr];
      if (a + 1 < m.a0 + m.w) yield [triId(m, a, b, 1), triId(m, a + 1, b, 3), c1[0], c1[1]];
      if (b + 1 < m.b0 + m.h) yield [triId(m, a, b, 2), triId(m, a, b + 1, 0), c2[0], c2[1]];
    }
  }
}

/**
 * Face label of a point in a flap polygon: which polygon edge's wavefront
 * reaches it first. For rectilinear polygons the wavefront at time t is the
 * erosion by the L∞ ball of radius t, so the owner is the edge touched by the
 * largest square around p inside the polygon. `member` says whether a unit
 * cell belongs to the polygon (cells beyond the paper included).
 */
function flapLabel(member: (i: number, j: number) => boolean, p: Pt): string {
  const ci = Math.floor(p[0]), cj = Math.floor(p[1]);
  let best = Infinity;
  let label = "";
  let tie = false;
  for (let k = 0; k - 1 < best; k++) {
    for (let j = cj - k; j <= cj + k; j++) {
      for (let i = ci - k; i <= ci + k; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== k || member(i, j)) continue;
        const dx = Math.max(i - p[0], 0, p[0] - (i + 1));
        const dy = Math.max(j - p[1], 0, p[1] - (j + 1));
        const d = Math.max(dx, dy);
        const lab =
          Math.abs(dx - dy) < 1e-9 ? "tie"
          : dx > dy ? `x${p[0] > i ? i + 1 : i}${p[0] > i ? "+" : "-"}`
          : `y${p[1] > j ? j + 1 : j}${p[1] > j ? "+" : "-"}`;
        if (d < best - 1e-9) {
          best = d;
          label = lab;
          tie = lab === "tie";
        } else if (Math.abs(d - best) < 1e-9 && lab !== label) tie = true;
      }
    }
    if (k > 4096) throw new Error("flap polygon is unbounded");
  }
  if (tie) throw new Error(`skeleton face undecided at (${p[0]}, ${p[1]}): the polygon is not on the half-grid`);
  return label;
}

/** Face label of a point in a river: which bank segment it measures its width from. */
function riverLabel(r: Extract<Region, { kind: "river" }>, p: Pt): string {
  let best = Infinity;
  let label = "";
  let tie = false;
  for (const x of r.inner) {
    const dx = Math.abs(p[0] - x.tip[0]), dy = Math.abs(p[1] - x.tip[1]);
    const g = Math.max(dx, dy) - x.off;
    const sx = p[0] > x.tip[0] ? 1 : -1, sy = p[1] > x.tip[1] ? 1 : -1;
    const lab = Math.abs(dx - dy) < 1e-9 ? "tie" : dx > dy ? `x${x.tip[0] + sx * x.off}${sx > 0 ? "+" : "-"}` : `y${x.tip[1] + sy * x.off}${sy > 0 ? "+" : "-"}`;
    if (g < best - 1e-9) {
      best = g;
      label = lab;
      tie = lab === "tie";
    } else if (Math.abs(g - best) < 1e-9 && lab !== label) tie = true;
  }
  if (tie) throw new Error(`river face undecided at (${p[0]}, ${p[1]})`);
  return label;
}

const centroid = (v: [Pt, Pt, Pt]): Pt => [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3];

/** Label every triangle and group equal-label neighbours into faces. */
function buildMesh(a0: number, b0: number, w: number, h: number, regionOf: (i: number, j: number) => number, labelOf: (ri: number, p: Pt) => string): Mesh {
  const m: Mesh = { a0, b0, w, h, region: new Int32Array(w * h * 4), label: [], face: new Int32Array(w * h * 4) };
  for (let b = b0; b < b0 + h; b++) {
    for (let a = a0; a < a0 + w; a++) {
      const ri = regionOf(Math.floor(a / 2), Math.floor(b / 2));
      for (let k = 0; k < 4; k++) {
        const t = triId(m, a, b, k);
        m.region[t] = ri;
        m.label[t] = ri < 0 ? "" : labelOf(ri, centroid(triVerts(a, b, k)));
      }
    }
  }
  const uf = new UnionFind(w * h * 4);
  for (const [s, t] of adjacentPairs(m)) {
    if (m.region[s]! >= 0 && m.region[s] === m.region[t] && m.label[s] === m.label[t]) uf.union(s, t);
  }
  for (let t = 0; t < m.face.length; t++) m.face[t] = m.region[t]! < 0 ? -1 : uf.find(t);
  return m;
}

// ------------------------------------------------------------ step 2: ridges only

/**
 * Straight skeleton of a rectilinear polygon given as unit cells "i,j"
 * (for tests and inspection; completeRegions uses the same machinery).
 */
export function skeletonOfCells(cells: readonly string[]): Seg[] {
  const set = new Set(cells);
  const xy = cells.map((c) => c.split(",").map(Number) as Pt);
  const i0 = Math.min(...xy.map((p) => p[0])), j0 = Math.min(...xy.map((p) => p[1]));
  const i1 = Math.max(...xy.map((p) => p[0])) + 1, j1 = Math.max(...xy.map((p) => p[1])) + 1;
  const member = (i: number, j: number) => set.has(`${i},${j}`);
  const m = buildMesh(2 * i0, 2 * j0, 2 * (i1 - i0), 2 * (j1 - j0), (i, j) => (member(i, j) ? 0 : -1), (_, p) => flapLabel(member, p));
  const out: Seg[] = [];
  for (const [s, t, p, q] of adjacentPairs(m)) if (m.region[s]! >= 0 && m.region[t]! >= 0 && m.face[s] !== m.face[t]) out.push({ a: p, b: q });
  return mergeSegments(out.map((s) => ({ ...s, role: "ridge" as const }))).map(({ a, b }) => ({ a, b }));
}

// -------------------------------------------------- step 3: contours and elevation

/** Hinges, ridges and contours of a map whose paper is fully assigned. */
export function completeRegions(map: RegionMap): Completion {
  const { n, cell, regions } = map;
  if (cell.includes(-1)) throw new Error("unused paper left: call fillGaps first");
  // A flap polygon extends beyond the paper exactly as far as its minimum
  // square does; Lang draws edge and corner flaps with the skeleton of the
  // whole square (Fig 13.17), so the off-paper sides count as polygon edges.
  const member = (ri: number) => (i: number, j: number) => {
    if (i >= 0 && j >= 0 && i < n && j < n) return cell[j * n + i] === ri;
    const r = regions[ri]!;
    return r.kind === "flap" && linf([i + 0.5, j + 0.5], r.tip) < r.r;
  };
  const members = regions.map((_, ri) => member(ri));
  const m = buildMesh(0, 0, 2 * n, 2 * n, (i, j) => cell[j * n + i]!, (ri, p) => {
    const r = regions[ri]!;
    return r.kind === "flap" ? flapLabel(members[ri]!, p) : riverLabel(r, p);
  });

  // Contour coordinate of a face: along its owning edge. An edge label "x…" is a
  // vertical edge, whose contours are horizontal lines y = const.
  const uAxis = (t: number): 0 | 1 => (m.label[t]!.startsWith("x") ? 1 : 0);
  const conflicts: Conflict[] = [];

  // contour nodes: (face, u) for u on the half-grid
  const nodeId = new Map<string, number>();
  const nodeAt: Pt[] = [];
  const faceUs = new Map<number, Set<number>>();
  const node = (f: number, u: number, at: Pt): number => {
    const k = `${f}|${u}`;
    let id = nodeId.get(k);
    if (id === undefined) {
      id = nodeAt.length;
      nodeId.set(k, id);
      nodeAt.push(at);
      if (!faceUs.has(f)) faceUs.set(f, new Set());
      faceUs.get(f)!.add(u);
    }
    return id;
  };
  for (let t = 0; t < m.face.length; t++) {
    const a = m.a0 + ((t >> 2) % m.w), b = m.b0 + Math.floor((t >> 2) / m.w);
    const v = triVerts(a, b, t & 3);
    for (const p of [v[0], v[1]]) node(m.face[t]!, p[uAxis(t)], p);
  }
  // Linking contours where faces meet: this is the bouncing of §13.5.
  const uf = new UnionFind(nodeAt.length);
  for (const [s, t, p, q] of adjacentPairs(m)) {
    if (m.face[s] === m.face[t]) continue;
    for (const P of [p, q]) {
      if ((P[0] * 2) % 1 !== 0 || (P[1] * 2) % 1 !== 0) continue; // triangle centre, not a lattice point
      uf.union(node(m.face[s]!, P[uAxis(s)], P), node(m.face[t]!, P[uAxis(t)], P));
    }
  }
  const cls = (id: number) => uf.find(id);

  // neighbouring contours within each face
  const adj = new Map<number, Set<number>>();
  const link = (x: number, y: number) => {
    if (!adj.has(x)) adj.set(x, new Set());
    if (!adj.has(y)) adj.set(y, new Set());
    adj.get(x)!.add(y);
    adj.get(y)!.add(x);
  };
  const steps: [number, number][] = [];
  for (const [f, us] of faceUs) {
    const sorted = [...us].sort((x, y) => x - y);
    for (let i = 0; i + 1 < sorted.length; i++) {
      if (sorted[i + 1]! - sorted[i]! !== 0.5) continue;
      const x = cls(nodeId.get(`${f}|${sorted[i]}`)!), y = cls(nodeId.get(`${f}|${sorted[i + 1]}`)!);
      if (x === y) {
        conflicts.push({ at: nodeAt[nodeId.get(`${f}|${sorted[i]}`)!]!, reason: "a contour bounces back onto its own neighbour (needs a level shifter)" });
        continue;
      }
      link(x, y);
      steps.push([nodeId.get(`${f}|${sorted[i]}`)!, nodeId.get(`${f}|${sorted[i + 1]}`)!]);
    }
  }

  // axial contours: every contour through a flap tip
  const H = new Map<number, number>(); // class -> elevation in half-grid steps
  let frontier: number[] = [];
  for (let t = 0; t < m.face.length; t++) {
    const r = regions[m.region[t]!]!;
    if (r.kind !== "flap") continue;
    const a = m.a0 + ((t >> 2) % m.w), b = m.b0 + Math.floor((t >> 2) / m.w);
    const v = triVerts(a, b, t & 3);
    for (const p of [v[0], v[1]]) {
      if (p[0] !== r.tip[0] || p[1] !== r.tip[1]) continue;
      const c = cls(nodeId.get(`${m.face[t]}|${p[uAxis(t)]}`)!);
      if (!H.has(c)) {
        H.set(c, 0);
        frontier.push(c);
      }
    }
  }
  // Lang's "add a contour halfway between equal ones, repeat": breadth-first distance.
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const c of frontier) for (const y of adj.get(c) ?? []) if (!H.has(y)) {
      H.set(y, d);
      next.push(y);
    }
    frontier = next;
  }
  for (const [x, y] of steps) {
    const hx = H.get(cls(x)), hy = H.get(cls(y));
    if (hx === undefined || hy === undefined) {
      conflicts.push({ at: nodeAt[x]!, reason: "contour not connected to any flap tip" });
      continue;
    }
    if (Math.abs(hx - hy) !== 1) conflicts.push({ at: nodeAt[x]!, reason: `contours ${hx / 2} and ${hy / 2} are half a unit apart (parity: needs a level shifter, §14.1–14.3)` });
  }

  // creases
  const lines: CPLine[] = [];
  const elev = (f: number, u: number) => {
    const id = nodeId.get(`${f}|${u}`);
    return id === undefined ? undefined : H.get(cls(id));
  };
  for (const [s, t, p, q] of adjacentPairs(m)) {
    if (m.region[s] !== m.region[t]) lines.push({ a: p, b: q, role: "hinge" });
    else if (m.face[s] !== m.face[t]) lines.push({ a: p, b: q, role: "ridge" });
    else {
      const ax = uAxis(s);
      if (p[ax] !== q[ax]) continue; // not a contour-direction side of this face
      const f = m.face[s]!, u = p[ax];
      const h = elev(f, u), lo = elev(f, u - 0.5), hi = elev(f, u + 0.5);
      if (h === undefined || lo === undefined || hi === undefined) continue;
      if ((h < lo && h < hi) || (h > lo && h > hi)) lines.push({ a: p, b: q, role: "contour", elevation: h / 2, peak: h > lo });
    }
  }
  return { lines: mergeSegments(lines), conflicts: dedupeConflicts(conflicts) };
}

function dedupeConflicts(cs: Conflict[]): Conflict[] {
  const seen = new Set<string>();
  return cs.filter((c) => {
    const k = `${c.at[0]},${c.at[1]}|${c.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Join collinear touching segments of the same role (and elevation). */
export function mergeSegments(lines: readonly CPLine[]): CPLine[] {
  const groups = new Map<string, { t0: number; t1: number; l: CPLine }[]>();
  for (const l of lines) {
    const dx = Math.sign(l.b[0] - l.a[0]), dy = Math.sign(l.b[1] - l.a[1]);
    // canonical direction: (1,0), (0,1), (1,1), (1,-1)
    const [ux, uy] = dx < 0 || (dx === 0 && dy < 0) ? [-dx, -dy] : [dx, dy];
    const c = uy * l.a[0] - ux * l.a[1]; // constant along the line
    const t = (p: Pt) => ux * p[0] + uy * p[1];
    const k = `${l.role}|${l.elevation ?? ""}|${l.peak ?? ""}|${ux},${uy}|${c}`;
    const [t0, t1] = [t(l.a), t(l.b)].sort((x, y) => x - y) as [number, number];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push({ t0, t1, l });
  }
  const out: CPLine[] = [];
  for (const [, g] of groups) {
    g.sort((x, y) => x.t0 - y.t0);
    const { l } = g[0]!;
    const dx = Math.sign(l.b[0] - l.a[0]), dy = Math.sign(l.b[1] - l.a[1]);
    const [ux, uy] = dx < 0 || (dx === 0 && dy < 0) ? [-dx, -dy] : [dx, dy];
    const c = uy * l.a[0] - ux * l.a[1];
    // point at parameter t on the line: solve ux*x + uy*y = t, uy*x - ux*y = c
    const n2 = ux * ux + uy * uy;
    const at = (t: number): Pt => [(ux * t + uy * c) / n2, (uy * t - ux * c) / n2];
    let cur = { t0: g[0]!.t0, t1: g[0]!.t1 };
    const flush = () => out.push({ a: at(cur.t0), b: at(cur.t1), role: l.role, ...(l.elevation !== undefined ? { elevation: l.elevation, peak: l.peak! } : {}) });
    for (const s of g.slice(1)) {
      if (s.t0 <= cur.t1 + 1e-9) cur.t1 = Math.max(cur.t1, s.t1);
      else {
        flush();
        cur = { t0: s.t0, t1: s.t1 };
      }
    }
    flush();
  }
  return out;
}

// ------------------------------------------------------------- search + verify

export type BoxPleatResult =
  | {
      /**
       * flat-folder found a layer order AND the folded form is the intended
       * uniaxial base (tips and axials on one axis, contours at their elevations).
       */
      status: "verified";
      /** Unit-square crease pattern, every crease assigned by flat-folder. */
      cp: FoldFile;
      folded: FoldFile;
      /** Grid-unit lines with their structural role (Lang's colouring). */
      lines: CPLine[];
      root: string;
      fills: { into: string }[];
      /** Flaps whose polygons absorbed unused paper: more layers, same length. */
      expanded: Record<string, number>;
      states: string;
      attempts: number;
    }
  | {
      status: "incomplete";
      reason: string;
      /** Best attempt's lines (grid units) and problem points, for display. */
      lines: CPLine[];
      problems: Pt[];
      attempts: number;
    };

/**
 * Integer grid lengths for a tree drawn at `scale` grid squares per tree unit:
 * each edge rounded down, which keeps every packing valid (tree distances only
 * shrink). Lengths that round to 0 make the design unusable at this scale.
 */
export function gridTree(tree: FlapTree, scale: number, tips?: Record<string, Pt>): FlapTree | string {
  const edges = tree.edges.map((e) => ({ ...e, length: Math.floor(e.length * scale + 1e-9) }));
  if (tips) {
    // Rounding down wastes paper. Where the packing has room, round up instead
    // (never past ceil(scale × length)): Lang soaks up slack the same way,
    // by enlarging flaps (ODS §13.2). Largest fractional parts first.
    const order = edges.map((_, i) => i).sort((i, j) => frac(tree.edges[j]!.length * scale) - frac(tree.edges[i]!.length * scale));
    for (const i of order) {
      const e = edges[i]!;
      if (e.length >= Math.ceil(tree.edges[i]!.length * scale - 1e-9)) continue;
      e.length++;
      if (!packingHolds({ ...tree, edges }, tips)) e.length--;
    }
  }
  const zero = edges.find((e) => e.length < 1);
  if (zero) return `edge ${zero.a}–${zero.b} is under one grid square at scale ${scale.toFixed(2)}`;
  return { ...tree, edges };
}

const frac = (x: number) => x - Math.floor(x + 1e-9);

/** The L∞ tree condition: no two tips closer on the sheet than on the tree. */
function packingHolds(tree: FlapTree, tips: Record<string, Pt>): boolean {
  const lv = leaves(tree);
  for (let i = 0; i < lv.length; i++) {
    const di = new Map(rootTree(tree, lv[i]!).below.get(lv[i]!)!.map((x) => [x.leaf, x.d]));
    for (let j = i + 1; j < lv.length; j++) if (linf(tips[lv[i]!]!, tips[lv[j]!]!) < di.get(lv[j]!)!) return false;
  }
  return true;
}

/**
 * Complete a grid packing into a crease pattern and verify it. Tries every
 * internal node as the root (which decides the side each river hugs) and
 * every way of absorbing unused paper, up to `maxAttempts`, and returns the
 * first result that flat-folder verifies.
 */
export function boxPleatFromGrid(
  tree: FlapTree,
  tips: Record<string, Pt>,
  n: number,
  scale = 1,
  opts: { maxAttempts?: number; unhintedEdgeLimit?: number } = {},
): BoxPleatResult {
  const fail = (reason: string, attempts = 0, lines: CPLine[] = [], problems: Pt[] = []): BoxPleatResult => ({ status: "incomplete", reason, lines, problems, attempts });
  for (const l of leaves(tree)) {
    const p = tips[l];
    if (!p || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) return fail(`tip of ${l} is not on a grid point`);
  }
  const g = gridTree(tree, scale, tips);
  if (typeof g === "string") return fail(g);
  const lv = leaves(g);
  if (!packingHolds(g, tips)) return fail("two tips are closer on the sheet than on the tree (packing invalid at integer lengths)");

  const maxAttempts = opts.maxAttempts ?? 24;
  const internal = g.nodes.filter((v) => !lv.includes(v));
  type Try = { root: string; map: RegionMap; fills: { into: string }[]; gapCells: number };
  const tries: Try[] = [];
  const reasons: string[] = [];
  for (const root of internal) {
    let map: RegionMap;
    try {
      map = buildRegions(g, tips, n, root);
    } catch (err) {
      reasons.push(`root ${root}: ${(err as Error).message}`);
      continue;
    }
    const comps = gapComponents(map);
    const stuck = comps.find((c) => c.flaps.length === 0);
    if (stuck) {
      reasons.push(`root ${root}: unused paper at (${stuck.cells[0]![0]}, ${stuck.cells[0]![1]}) touches only rivers, which cannot expand`);
      continue;
    }
    const options = comps.map((c) => (c.flaps.length === 1 ? c.flaps.map((into) => ({ into })) : [...c.flaps.map((into) => ({ into })), { into: "grow" }]));
    const gapCells = comps.reduce((s, c) => s + c.cells.length, 0);
    for (const fills of product(options, maxAttempts)) tries.push({ root, map, fills, gapCells });
  }
  tries.sort((x, y) => x.gapCells - y.gapCells);

  let best: { lines: CPLine[]; problems: Pt[]; reason: string } | null = null;
  let attempts = 0;
  for (const t of tries.slice(0, maxAttempts)) {
    attempts++;
    const filled = fillGaps(t.map, t.fills);
    let done: Completion;
    try {
      done = completeRegions(filled);
    } catch (err) {
      reasons.push(`root ${t.root}: ${(err as Error).message}`);
      continue;
    }
    const tag = `root ${t.root}${t.fills.length ? `, unused paper → ${t.fills.map((f) => f.into).join(", ")}` : ""}`;
    if (done.conflicts.length) {
      const reason = `${tag}: ${done.conflicts.length} contour conflict(s), e.g. ${done.conflicts[0]!.reason}`;
      reasons.push(reason);
      if (!best || done.conflicts.length < best.problems.length) best = { lines: done.lines, problems: done.conflicts.map((c) => c.at), reason };
      continue;
    }
    const cp = toFold(done.lines, n, true);
    const local = localFlatFoldability(cp);
    if (local.length) {
      const reason = `${tag}: ${local.length} vertex(es) fail Kawasaki`;
      reasons.push(reason);
      if (!best || local.length < best.problems.length) best = { lines: done.lines, problems: local.map((v) => [v.coords[0] * n, v.coords[1] * n] as Pt), reason };
      continue;
    }
    let r: FlatFoldResult = solveFlatFold(cp);
    // The contour hint is Lang's approximation; without it the search is exact but
    // slow on uniaxial bases (every face overlaps every other), so only small
    // patterns get the unhinted retry.
    if (!r.ok && cp.edges_vertices.length <= (opts.unhintedEdgeLimit ?? 200)) r = solveFlatFold(toFold(done.lines, n));
    if (!r.ok) {
      const reason = `${tag}: flat-folder: ${r.reason}`;
      reasons.push(reason);
      if (!best) best = { lines: done.lines, problems: [], reason };
      continue;
    }
    const deviation = uniaxialDeviation(done.lines, n, lv.map((l) => tips[l]!), r.cp, r.folded);
    if (!(deviation < 1e-6)) {
      reasons.push(`${tag}: folds flat, but not into the intended uniaxial base (off by ${deviation.toFixed(3)} units)`);
      continue;
    }
    const expanded: Record<string, number> = {};
    for (let s = 0; s < n * n; s++) {
      if (t.map.cell[s] === -1) {
        const name = regionName(filled.regions[filled.cell[s]!]!);
        expanded[name] = (expanded[name] ?? 0) + 1;
      }
    }
    return { status: "verified", cp: r.cp, folded: r.folded, lines: done.lines, root: t.root, fills: t.fills, expanded, states: r.states.toString(), attempts };
  }
  const reason = best?.reason ?? reasons[0] ?? "no internal node to root the tree at";
  return fail(reasons.length > 1 ? `${reason} (${attempts} layout${attempts === 1 ? "" : "s"} tried)` : reason, attempts, best?.lines ?? [], best?.problems ?? []);
}

/**
 * How far a flat-folded result is from the intended uniaxial base, in grid
 * units (0 = exact). A flat folding's geometry depends only on where the
 * creases are, not on their mountain/valley assignment, so this checks the
 * construction itself: every flap tip and axial contour must land on one
 * line (the axis), and every contour of elevation e at distance e from it.
 * `cp` and `folded` must share vertex indices, as solveFlatFold's do.
 */
export function uniaxialDeviation(lines: readonly CPLine[], n: number, tips: readonly Pt[], cp: FoldFile, folded: FoldFile): number {
  const V = cp.vertices_coords, F = folded.vertices_coords;
  const on = (l: Seg, v: number[]) => {
    const [ax, ay, bx, by] = [l.a[0] / n, l.a[1] / n, l.b[0] / n, l.b[1] / n];
    if (Math.abs((bx - ax) * (v[1]! - ay) - (by - ay) * (v[0]! - ax)) > 1e-9) return false;
    return Math.min(ax, bx) - 1e-9 <= v[0]! && v[0]! <= Math.max(ax, bx) + 1e-9 && Math.min(ay, by) - 1e-9 <= v[1]! && v[1]! <= Math.max(ay, by) + 1e-9;
  };
  const marks: { f: number[]; e: number }[] = [];
  for (const t of tips) {
    const i = V.findIndex((v) => Math.abs(v[0]! - t[0] / n) < 1e-9 && Math.abs(v[1]! - t[1] / n) < 1e-9);
    if (i < 0) return Infinity; // a tip that is not a vertex cannot be pinned to the axis
    marks.push({ f: F[i]!, e: 0 });
  }
  const contours = lines.filter((l) => l.role === "contour");
  V.forEach((v, i) => {
    for (const l of contours) if (on(l, v)) marks.push({ f: F[i]!, e: l.elevation! / n });
  });
  const axial = marks.filter((m) => m.e === 0).map((m) => m.f);
  const p0 = axial[0]!;
  const far = (q: number[]) => Math.hypot(q[0]! - p0[0]!, q[1]! - p0[1]!);
  const p1 = axial.reduce((b, q) => (far(q) > far(b) ? q : b), p0);
  const len = far(p1);
  // All tips in one place (the preliminary base): trivially uniaxial if nothing is
  // raised off the axis; otherwise there is no axis direction to measure against.
  if (len < 1e-9) return marks.every((m) => m.e === 0) ? 0 : Infinity;
  const dist = (q: number[]) => Math.abs((p1[0]! - p0[0]!) * (q[1]! - p0[1]!) - (p1[1]! - p0[1]!) * (q[0]! - p0[0]!)) / len;
  return n * Math.max(0, ...marks.map((m) => Math.abs(dist(m.f) - m.e)));
}

/**
 * Grid-unit lines -> unit-square FOLD crease pattern. Creases are unassigned,
 * except that with `hint` contours get Lang's elevation rule (§13.5, p. 599;
 * seen from the white side): troughs (axials) mountain, peaks valley. Lang
 * calls it an approximation — some middle-flap axials are valleys — so it is
 * only ever a hint to flat-folder, which proves or refutes it.
 */
export function toFold(lines: readonly CPLine[], n: number, hint = false): FoldFile {
  const L: [Pt, Pt, Assignment][] = lines.map((l) => [[l.a[0] / n, l.a[1] / n], [l.b[0] / n, l.b[1] / n], hint && l.role === "contour" ? (l.peak ? "V" : "M") : "U"]);
  L.push([[0, 0], [1, 0], "B"], [[1, 0], [1, 1], "B"], [[1, 1], [0, 1], "B"], [[0, 1], [0, 0], "B"]);
  return foldFromLines(L);
}

function* product<T>(options: T[][], cap: number): Generator<T[]> {
  if (options.length === 0) {
    yield [];
    return;
  }
  const idx = options.map(() => 0);
  for (let k = 0; k < cap; k++) {
    yield idx.map((i, j) => options[j]![i]!);
    let j = 0;
    while (j < idx.length && ++idx[j]! === options[j]!.length) idx[j++] = 0;
    if (j === idx.length) return;
  }
}

class UnionFind {
  private p: Int32Array;
  constructor(n: number) {
    this.p = new Int32Array(n).map((_, i) => i);
  }
  find(x: number): number {
    while (this.p[x] !== x) {
      this.p[x] = this.p[this.p[x]!]!;
      x = this.p[x]!;
    }
    return x;
  }
  union(a: number, b: number) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p[ra] = rb;
  }
}
