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

interface Slot {
  leaves: [number] | [number, number];
  weight: number;
}

export function packTree(tree: FlapTree, N: number, symmetry: Symmetry, nodeBudget = 40_000): Packing | null {
  const { leaves, d } = leafDistances(tree);
  const idx = new Map(leaves.map((l, i) => [l, i]));
  const paired = new Set<number>();
  const slots: Slot[] = [];
  if (symmetry !== "none") {
    for (const [a, b] of tree.mirror) {
      const i = idx.get(a), j = idx.get(b);
      if (i === undefined || j === undefined) continue;
      paired.add(i).add(j);
      slots.push({ leaves: [i, j], weight: flapLength(tree, a) * 2 });
    }
  }
  leaves.forEach((l, i) => {
    if (!paired.has(i)) slots.push({ leaves: [i], weight: flapLength(tree, l) });
  });
  // Book symmetry puts axis flaps on x = N/2, which is a grid line only for even N.
  const hasAxisFlaps = slots.some((sl) => sl.leaves.length === 1);
  if (symmetry === "book" && hasAxisFlaps && N % 2 === 1) return null;
  slots.sort((a, b) => b.weight - a.weight);

  const points = gridPointsByPreference(N);
  const mirror = (p: [number, number]): [number, number] => (symmetry === "book" ? [N - p[0], p[1]] : [p[1], p[0]]);
  const onAxis = (p: [number, number]) => (symmetry === "book" ? 2 * p[0] === N : p[0] === p[1]);
  const pairSide = (p: [number, number]) => (symmetry === "book" ? 2 * p[0] < N : p[0] > p[1]);
  // The square has one more reflection that maps the mirror axis to itself
  // (y -> N - y for book, the anti-diagonal for diagonal). Fixing the first slot
  // to one half of it removes mirror-image duplicates from the search.
  const firstHalf = (p: [number, number]) => (symmetry === "book" ? 2 * p[1] <= N : p[0] + p[1] <= N);

  let totalNodes = 0;
  let budgetHit = false;

  const feasible = (s: number): [number, number][] | null => {
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
    totalNodes += nodes;
    if (!found && nodes > nodeBudget) budgetHit = true;
    return found ? (pos as [number, number][]) : null;
  };

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
  return { grid_n: N, symmetry, scale: best.s, positions, flap_radius, nodes: totalNodes, budget_hit: budgetHit };
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
