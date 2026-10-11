// Grid packing for uniaxial box pleating (PLANS.md Plan B, step 2).
//
// Box pleating is the grid analogue of Lang's circle packing: flaps become
// squares instead of circles, because paper is measured along 0°/90° hinges.
// The condition is the tree condition in the L∞ metric: for every pair of
// flap tips i, j placed at grid points p_i, p_j,
//
//     max(|x_i − x_j|, |y_i − y_j|)  ≥  s · d_tree(i, j)
//
// where s is the scale (grid squares per tree unit). We maximise s.
//
// This is a NECESSARY condition for a base to exist. It is not sufficient and
// it does not produce a crease pattern: molecule filling (turning the packing
// into creases) is not implemented. Candidates say so.

import { type FlapTree, flapLength, leafDistances } from "./tree.ts";

export type Symmetry = "book" | "diagonal" | "none";

export interface Packing {
  grid_n: number;
  symmetry: Symmetry;
  /** Grid squares per tree unit. Larger means longer, thicker flaps from the same sheet. */
  scale: number;
  /** Flap tip positions, grid coordinates in [0, N]². */
  positions: Record<string, [number, number]>;
  /** Half-side, in grid squares, of each flap's square (s × flap length). */
  flap_radius: Record<string, number>;
  /** Search nodes expanded, for honesty about effort. */
  nodes: number;
  /** True if some feasibility check ran out of budget: a larger scale may exist. */
  budget_hit: boolean;
}

export interface Slot {
  leaves: [number] | [number, number];
  weight: number;
}

/**
 * Placement slots for a tree's leaves: mirror pairs (if the symmetry uses them)
 * and singles, heaviest first. `len` is the flap length used for the ordering.
 * Null when the symmetry cannot place the axis flaps on this grid: book
 * symmetry puts them on x = N/2, a grid line only for even N.
 */
export function leafSlots(tree: FlapTree, symmetry: Symmetry, N: number, len: (leaf: string) => number = (l) => flapLength(tree, l)): { leaves: string[]; d: number[][]; slots: Slot[] } | null {
  const { leaves, d } = leafDistances(tree);
  const idx = new Map(leaves.map((l, i) => [l, i]));
  const paired = new Set<number>();
  const slots: Slot[] = [];
  if (symmetry !== "none") {
    for (const [a, b] of tree.mirror) {
      const i = idx.get(a), j = idx.get(b);
      if (i === undefined || j === undefined) continue;
      paired.add(i).add(j);
      slots.push({ leaves: [i, j], weight: len(a) * 2 });
    }
  }
  leaves.forEach((l, i) => {
    if (!paired.has(i)) slots.push({ leaves: [i], weight: len(l) });
  });
  const hasAxisFlaps = slots.some((sl) => sl.leaves.length === 1);
  if (symmetry === "book" && hasAxisFlaps && N % 2 === 1) return null;
  slots.sort((a, b) => b.weight - a.weight);
  return { leaves, d, slots };
}

/**
 * Feasibility search: place every slot's tips on grid points of [0, N]² so that
 * all L∞ distances are at least s × d (tree distance). First solution in the
 * fixed point order, or null. `stats`, if given, receives the nodes expanded
 * and whether the node budget ran out (then null means "not found", not
 * "impossible").
 */
export function placeTips(
  leaves: readonly string[],
  d: number[][],
  slots: readonly Slot[],
  s: number,
  N: number,
  symmetry: Symmetry,
  nodeBudget: number,
  stats?: { nodes: number; hit: boolean },
): [number, number][] | null {
  const points = gridPointsByPreference(N);
  const mirror = (p: [number, number]): [number, number] => (symmetry === "book" ? [N - p[0], p[1]] : [p[1], p[0]]);
  const onAxis = (p: [number, number]) => (symmetry === "book" ? 2 * p[0] === N : p[0] === p[1]);
  const pairSide = (p: [number, number]) => (symmetry === "book" ? 2 * p[0] < N : p[0] > p[1]);
  // The square has one more reflection that maps the mirror axis to itself
  // (y -> N - y for book, the anti-diagonal for diagonal). Fixing the first slot
  // to one half of it removes mirror-image duplicates from the search.
  const firstHalf = (p: [number, number]) => (symmetry === "book" ? 2 * p[1] <= N : p[0] + p[1] <= N);

  const pos: ([number, number] | null)[] = leaves.map(() => null);
  const placed: number[] = [];
  let nodes = 0;
  const ok = (i: number, p: [number, number]) => {
    for (const j of placed) {
      const q = pos[j]!;
      if (Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) < s * d[i]![j]! - 1e-9) return false;
    }
    return true;
  };
  const rec = (k: number): boolean => {
    if (k === slots.length) return true;
    if (++nodes > nodeBudget) return false;
    const slot = slots[k]!;
    for (const p of points) {
      if (slot.leaves.length === 1) {
        const i = slot.leaves[0];
        if (symmetry !== "none" && !onAxis(p)) continue;
        if (symmetry !== "none" && k === 0 && !firstHalf(p)) continue;
        if (symmetry === "none" && k === 0 && !(p[0] <= p[1] && 2 * p[1] <= N)) continue; // break the square's symmetry
        if (!ok(i, p)) continue;
        pos[i] = p;
        placed.push(i);
        if (rec(k + 1)) return true;
        placed.pop();
        pos[i] = null;
      } else {
        const [i, j] = slot.leaves;
        if (!pairSide(p)) continue;
        if (k === 0 && !firstHalf(p)) continue;
        const q = mirror(p);
        if (Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) < s * d[i]![j]! - 1e-9) continue;
        if (!ok(i, p) || !ok(j, q)) continue;
        pos[i] = p;
        placed.push(i);
        pos[j] = q;
        placed.push(j);
        if (rec(k + 1)) return true;
        placed.pop();
        placed.pop();
        pos[i] = pos[j] = null;
      }
    }
    return false;
  };
  const found = rec(0);
  if (stats) {
    stats.nodes += nodes;
    if (!found && nodes > nodeBudget) stats.hit = true;
  }
  return found ? (pos as [number, number][]) : null;
}

export function packTree(tree: FlapTree, N: number, symmetry: Symmetry, nodeBudget = 40_000): Packing | null {
  const ls = leafSlots(tree, symmetry, N);
  if (!ls) return null;
  const { leaves, d, slots } = ls;

  const stats = { nodes: 0, hit: false };
  const feasible = (s: number) => placeTips(leaves, d, slots, s, N, symmetry, nodeBudget, stats);

  // The optimum is one of the finitely many values m / d_ij; binary search them.
  const cands = new Set<number>();
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) for (let m = 1; m <= N; m++) cands.add(m / d[i]![j]!);
  const sorted = [...cands].sort((a, b) => a - b);
  let lo = 0, hi = sorted.length - 1, best: { s: number; pos: [number, number][] } | null = null;
  while (lo <= hi) {
    const midI = (lo + hi) >> 1;
    const s = sorted[midI]!;
    const pos = feasible(s);
    if (pos) {
      best = { s, pos };
      lo = midI + 1;
    } else hi = midI - 1;
  }
  if (!best) return null;
  const positions: Record<string, [number, number]> = {};
  const flap_radius: Record<string, number> = {};
  leaves.forEach((l, i) => {
    positions[l] = best!.pos[i]!;
    flap_radius[l] = best!.s * flapLength(tree, l);
  });
  return { grid_n: N, symmetry, scale: best.s, positions, flap_radius, nodes: stats.nodes, budget_hit: stats.hit };
}

// --------------------------------------------------------- integer packing
//
// Lang packs with integer-unit lengths in mind (ODS §13.2–13.3): a box-pleated
// base needs whole-square edges, so choose the integer lengths and the tip
// placement together, then spend any spare room on the flaps that were rounded
// down. The tree condition is then checked at scale 1 on the integer tree.

export interface IntegerPacking extends Packing {
  /** Whole-square edge lengths, aligned with tree.edges. */
  lengths: number[];
  /** The scale at which the integer lengths are rounded-to-nearest (lower end of its band). Equals `scale`. */
  target_scale: number;
  /** Every edge whose integer length differs from `target` (= target_scale × tree length). */
  rounded: { edge: string; target: number; length: number }[];
  /** Edges grown past round-to-nearest into spare room (stage B). */
  inflated: string[];
}

const EPS = 1e-9;

/** The tree with its edge lengths replaced (aligned with tree.edges). */
export function withLengths(tree: FlapTree, lengths: readonly number[]): FlapTree {
  return { ...tree, edges: tree.edges.map((e, i) => ({ ...e, length: lengths[i]! })) };
}

/** Name of an edge in reports: the leaf's name for a flap, else "a–b". */
export function edgeLabel(tree: FlapTree, i: number): string {
  const e = tree.edges[i]!;
  const lv = new Set(leavesOf(tree));
  return lv.has(e.a) ? e.a : lv.has(e.b) ? e.b : `${e.a}–${e.b}`;
}

const leavesOf = (t: FlapTree) => leafDistances(t).leaves;

/**
 * Check integer lengths and tips against the L∞ tree condition at scale 1.
 * Independent of the search, for tests.
 */
export function verifyIntegerPacking(tree: FlapTree, lengths: readonly number[], positions: Record<string, [number, number]>, N: number): string[] {
  const errs: string[] = [];
  if (lengths.length !== tree.edges.length) return [`${lengths.length} lengths for ${tree.edges.length} edges`];
  lengths.forEach((l, i) => {
    if (!Number.isInteger(l) || l < 1) errs.push(`${edgeLabel(tree, i)}: length ${l} is not a whole number of squares`);
  });
  for (const [a, b] of tree.mirror) {
    const ia = tree.edges.findIndex((e) => e.a === a || e.b === a), ib = tree.edges.findIndex((e) => e.a === b || e.b === b);
    if (ia >= 0 && ib >= 0 && lengths[ia] !== lengths[ib]) errs.push(`${a}/${b}: mirror flaps have different lengths ${lengths[ia]} and ${lengths[ib]}`);
  }
  const { leaves, d } = leafDistances(withLengths(tree, lengths));
  for (let i = 0; i < leaves.length; i++) {
    const a = positions[leaves[i]!];
    if (!a || !Number.isInteger(a[0]) || !Number.isInteger(a[1]) || a[0] < 0 || a[1] < 0 || a[0] > N || a[1] > N) {
      errs.push(`${leaves[i]} is not on a grid point of the sheet`);
      continue;
    }
    for (let j = i + 1; j < leaves.length; j++) {
      const b = positions[leaves[j]!];
      if (!b) continue;
      const linf = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
      if (linf < d[i]![j]! - EPS) errs.push(`${leaves[i]}–${leaves[j]}: L∞ ${linf} < ${d[i]![j]!}`);
    }
  }
  return errs;
}

/**
 * Integer-aware packing. Stage A scans the scales at which some edge's
 * round-to-nearest length changes, from twice the real-valued optimum down to
 * three quarters of it; the first whose integer tree places on the grid wins.
 * Stage B grows edges that were rounded down, into room the placement leaves,
 * never past the ceiling. If no band places, the lengths are the legacy
 * round-down lengths at the real-valued optimum. Every change from the ideal
 * length is listed in `rounded`.
 */
export function packTreeInteger(tree: FlapTree, N: number, symmetry: Symmetry, nodeBudget = 40_000): IntegerPacking | null {
  const legacy = packTree(tree, N, symmetry, nodeBudget);
  if (!legacy) return null;
  const sStar = legacy.scale;
  const ell = tree.edges.map((e) => e.length);
  const leafEdge = new Map<string, number>();
  const lv = leavesOf(tree);
  tree.edges.forEach((e, i) => {
    if (lv.includes(e.a)) leafEdge.set(e.a, i);
    if (lv.includes(e.b)) leafEdge.set(e.b, i);
  });
  let nodes = legacy.nodes;
  let budgetHit = legacy.budget_hit;

  // ---- Stage A
  const lengthsAt = (s: number) => ell.map((l) => Math.max(1, Math.floor(s * l + 0.5 + EPS)));
  const thresholds = new Set<number>();
  for (const l of ell) for (let k = 2; (k - 0.5) / l <= 2 * sStar + EPS; k++) thresholds.add(Math.round(((k - 0.5) / l) * 1e9) / 1e9);
  const lowers = [...thresholds].sort((a, b) => b - a);
  const scan: number[] = [];
  for (const t of lowers) {
    scan.push(t);
    if (t < 0.75 * sStar) break; // the band containing 0.75 s* is the last one tried
  }
  const BAND_BUDGET = 6000;
  let chosen: { s: number; lengths: number[]; pos: Record<string, [number, number]> } | null = null;
  for (const s of scan) {
    const lengths = lengthsAt(s);
    const t = withLengths(tree, lengths);
    const ls = leafSlots(t, symmetry, N, (l) => lengths[leafEdge.get(l)!]!);
    if (!ls) continue;
    if (ls.d.some((row) => row.some((x) => x > N))) continue; // two tips can never be that far apart
    const stats = { nodes: 0, hit: false };
    const pos = placeTips(ls.leaves, ls.d, ls.slots, 1, N, symmetry, BAND_BUDGET, stats);
    nodes += stats.nodes;
    if (stats.hit) budgetHit = true;
    if (pos) {
      const p: Record<string, [number, number]> = {};
      ls.leaves.forEach((l, i) => (p[l] = pos[i]!));
      chosen = { s, lengths, pos: p };
      break;
    }
  }
  let target = sStar;
  let lengths: number[];
  let positions: Record<string, [number, number]>;
  if (chosen) {
    target = chosen.s;
    lengths = chosen.lengths;
    positions = chosen.pos;
  } else {
    lengths = ell.map((l) => Math.max(1, Math.floor(sStar * l + EPS)));
    positions = legacy.positions;
    if (verifyIntegerPacking(tree, lengths, positions, N).length) return null;
  }

  // ---- Stage B: grow the edges that were rounded down, into the room that is left.
  const ceil = ell.map((l) => Math.ceil(target * l - EPS));
  const mirrorOf = new Map<number, number>();
  for (const [a, b] of tree.mirror) {
    const ia = leafEdge.get(a), ib = leafEdge.get(b);
    if (ia !== undefined && ib !== undefined && ia !== ib) {
      mirrorOf.set(ia, ib);
      mirrorOf.set(ib, ia);
    }
  }
  const symmetricDistances = (ls: number[]) => {
    const { leaves, d } = leafDistances(withLengths(tree, ls));
    const at = new Map(leaves.map((l, i) => [l, i]));
    const img = (l: string) => {
      for (const [a, b] of tree.mirror) {
        if (a === l) return b;
        if (b === l) return a;
      }
      return l;
    };
    for (let i = 0; i < leaves.length; i++) for (let j = 0; j < leaves.length; j++) if (d[i]![j] !== d[at.get(img(leaves[i]!))!]![at.get(img(leaves[j]!))!]) return false;
    return true;
  };
  const grew = new Set<number>();
  for (let again = true; again; ) {
    again = false;
    const order = ell.map((_, i) => i).filter((i) => lengths[i]! < target * ell[i]! - EPS && lengths[i]! < ceil[i]!);
    order.sort((i, j) => (target * ell[j]! - lengths[j]!) / (target * ell[j]!) - (target * ell[i]! - lengths[i]!) / (target * ell[i]!));
    for (const i of order) {
      const group = [i];
      const m = mirrorOf.get(i);
      if (m !== undefined) group.push(m);
      if (group.some((g) => lengths[g]! >= ceil[g]!)) continue;
      const trial = lengths.slice();
      for (const g of group) trial[g] = trial[g]! + 1;
      if (verifyIntegerPacking(tree, trial, positions, N).length || !symmetricDistances(trial)) continue;
      lengths = trial;
      group.forEach((g) => grew.add(g));
      again = true;
    }
  }

  const rounded: IntegerPacking["rounded"] = [];
  const inflated: string[] = [];
  lengths.forEach((l, i) => {
    const want = target * ell[i]!;
    if (Math.abs(l - want) > 1e-6) rounded.push({ edge: edgeLabel(tree, i), target: want, length: l });
    if (grew.has(i)) inflated.push(edgeLabel(tree, i));
  });
  const flap_radius: Record<string, number> = {};
  for (const l of lv) flap_radius[l] = lengths[leafEdge.get(l)!]!;
  return { grid_n: N, symmetry, scale: target, positions, flap_radius, nodes, budget_hit: budgetHit, lengths, target_scale: target, rounded, inflated };
}

/** All grid points, corners first, then edges, then inward — flap tips are cheapest on the boundary. */
function gridPointsByPreference(N: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) pts.push([x, y]);
  const rank = (p: [number, number]) => {
    const edge = Math.min(p[0], p[1], N - p[0], N - p[1]);
    const corner = (p[0] === 0 || p[0] === N) && (p[1] === 0 || p[1] === N) ? -1 : 0;
    return edge * 2 + corner;
  };
  return pts.sort((a, b) => rank(a) - rank(b));
}

/** Check a packing against the L∞ tree condition. Independent of the search, for tests. */
export function verifyPacking(tree: FlapTree, p: Packing): string[] {
  const { leaves, d } = leafDistances(tree);
  const errs: string[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const a = p.positions[leaves[i]!]!;
    if (a[0] < 0 || a[1] < 0 || a[0] > p.grid_n || a[1] > p.grid_n) errs.push(`${leaves[i]} is off the sheet`);
    for (let j = i + 1; j < leaves.length; j++) {
      const b = p.positions[leaves[j]!]!;
      const linf = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
      if (linf < p.scale * d[i]![j]! - 1e-9) errs.push(`${leaves[i]}–${leaves[j]}: L∞ ${linf} < ${(p.scale * d[i]![j]!).toFixed(3)}`);
    }
  }
  return errs;
}
