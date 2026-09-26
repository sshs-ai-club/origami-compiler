// Exact precreasing of an N×N grid, as a StepPlan.
//
// For N a power of two this is the familiar halving sequence. For any other
// N it needs one reference that halving can never produce. We use:
//
//   P = the largest power of two ≤ N,   c = (2P − N) / P   (dyadic)
//
//   1. pinch the right edge at height c (by halving — every pinch is exact)
//   2. pinch the diagonal (0,0)–(1,1) and the line (0,1)–(1,c) where they cross.
//      They cross at x = 1 / (2 − c) = P / N.
//   3. crease the vertical through that point: the line x = P/N.
//
// From {0, P/N, 1} every k/N is reachable by folding an edge or crease onto
// another crease (a midpoint), so the rest is "fold to the crease" rounds.
// Each round is one panel (a Repeat batch), which is exactly the batching the
// step-cost model counts (ARCHITECTURE.md §3). Horizontal lines reuse the same
// reference point and are one "rotate and repeat" panel.
//
// Pinches are used instead of full creases so the reference lines do not end
// up in the crease pattern — which is what human folders do.

import type { Vec } from "../engine/geom.ts";
import type { FoldOp, Step, StepPlan } from "./plan.ts";

const frac = (k: number, n: number): string => {
  const g = gcd(k, n);
  return `${k / g}/${n / g}`;
};
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/** Which integer positions (in 1/N units) each round creates, and from which pair. */
export function divisionRounds(N: number, reference: number | null): { m: number; a: number; b: number }[][] {
  const have = new Set<number>([0, N]);
  if (reference !== null) have.add(reference);
  const rounds: { m: number; a: number; b: number }[][] = [];
  while (have.size < N + 1) {
    const cur = [...have].sort((x, y) => x - y);
    const round: { m: number; a: number; b: number }[] = [];
    for (let m = 1; m < N; m++) {
      if (have.has(m)) continue;
      // The shortest fold that lands a known line on another known line with m as the crease.
      let best: { a: number; b: number } | null = null;
      for (const a of cur) {
        const b = 2 * m - a;
        if (b <= a || !have.has(b)) continue;
        if (!best || b - a < best.b - best.a) best = { a, b };
      }
      if (best) round.push({ m, ...best });
    }
    if (round.length === 0) throw new Error(`cannot divide into ${N} from the given reference`);
    for (const r of round) have.add(r.m);
    rounds.push(round);
  }
  return rounds;
}

function edgeName(pos: number, N: number, axis: "x" | "y"): string {
  if (pos === 0) return axis === "x" ? "left edge" : "bottom edge";
  if (pos === N) return axis === "x" ? "right edge" : "top edge";
  return `${pos}/${N} crease`;
}

/** One vertical (axis "x") or horizontal (axis "y") crease-and-unfold at m/N, folding line a onto line b. */
function gridFold(N: number, axis: "x" | "y", m: number, a: number, b: number): FoldOp {
  const t = m / N;
  // Move whichever line is an edge (edges are easier to handle); otherwise the lower/left one.
  const moveFrom = b === N && a !== 0 ? b : a;
  const target = moveFrom === a ? b : a;
  if (axis === "x") {
    // directed upward: left side is x < t
    return { kind: "valley", line: [[t, 0], [t, 1]], moving: moveFrom < m ? "left" : "right", scope: "all", unfold: true, reference: `the ${edgeName(moveFrom, N, "x")} to the ${edgeName(target, N, "x")}` };
  }
  // directed rightward: left side is y > t
  return { kind: "valley", line: [[0, t], [1, t]], moving: moveFrom > m ? "left" : "right", scope: "all", unfold: true, reference: `the ${edgeName(moveFrom, N, "y")} to the ${edgeName(target, N, "y")}` };
}

export function precreaseGrid(N: number): StepPlan {
  if (!Number.isInteger(N) || N < 2 || N > 128) throw new Error(`grid size ${N} out of range 2..128`);
  const steps: Step[] = [];
  const push = (s: Omit<Step, "id" | "phase" | "view"> & { view?: Step["view"] }) =>
    steps.push({ id: steps.length + 1, phase: "precrease", view: s.view ?? { rotate_deg: 0, flip: false }, ops: s.ops, batch: s.batch, text: s.text });

  let reference: number | null = null;
  let refPoint: Vec | null = null;
  if (!isPow2(N)) {
    const P = 2 ** Math.floor(Math.log2(N));
    reference = P;
    // c = (2P − N)/P as j / P; mark it on the right edge by bisection.
    const j = 2 * P - N;
    let lo = 0, hi = P; // in units of 1/P
    const mark = (v: number) => (v === 0 ? "the bottom corner" : v === P ? "the top corner" : `the ${frac(v, P)} mark`);
    while (true) {
      const m = (lo + hi) / 2;
      const y = m / P;
      push({
        ops: [{ kind: "pinch", line: [[0, y], [1, y]], at: [1, y], bring: [[1, lo / P], [1, hi / P]], reference: `height ${frac(m, P)} on the right edge` }],
        batch: { kind: "single" },
        text: `On the right edge, bring ${mark(lo)} to ${mark(hi)} and pinch only at the edge, marking ${frac(m, P)}. Unfold.`,
      });
      if (m === j) break;
      if (j < m) hi = m;
      else lo = m;
    }
    const c = j / P;
    const x = P / N;
    refPoint = [x, x];
    push({
      ops: [
        { kind: "pinch", line: [[0, 0], [1, 1]], at: refPoint, reference: "the diagonal" },
        { kind: "pinch", line: [[0, 1], [1, c]], at: refPoint, reference: `the line from the top-left corner to the ${frac(j, P)} mark` },
      ],
      batch: { kind: "single" },
      text: `Pinch the diagonal, then pinch the line from the top-left corner to the ${frac(j, P)} mark, both only where they cross. The crossing lies exactly ${P}/${N} of the way across.`,
    });
    push({
      ops: [{ kind: "valley", line: [[x, 0], [x, 1]], moving: "right", scope: "all", unfold: true, reference: "the crossing point" }],
      batch: { kind: "single" },
      text: `Fold the right edge over so the crease passes through the crossing point, perpendicular to the bottom edge. Unfold. This crease is at ${P}/${N}.`,
    });
  }

  const rounds = divisionRounds(N, reference);
  const firstVertical = steps.length + 1;
  for (const round of rounds) {
    const ops = round.map(({ m, a, b }) => gridFold(N, "x", m, a, b));
    push({
      ops,
      batch: ops.length === 1 ? { kind: "single" } : { kind: "repeat", n: ops.length, along: "vertical" },
      text:
        ops.length === 1
          ? `Valley-fold ${(ops[0] as { reference: string }).reference}. Unfold.`
          : `Valley-fold each edge or crease to its partner (${ops.length} folds: ${ops.map((o) => (o as { reference: string }).reference).slice(0, 3).join("; ")}${ops.length > 3 ? "; …" : ""}). Unfold after each.`,
    });
  }
  const lastVertical = steps.length;

  // Horizontal creases: the same folds, rotated a quarter turn. For non-dyadic N the
  // reference point lies on the diagonal, so the horizontal reference needs no new pinches.
  const hops: FoldOp[] = [];
  if (refPoint) {
    const y = refPoint[1];
    // Directed rightward, "left" is above the line: fold the smaller top part down, as with the vertical.
    hops.push({ kind: "valley", line: [[0, y], [1, y]], moving: "left", scope: "all", unfold: true, reference: "the crossing point" });
  }
  for (const round of rounds) for (const { m, a, b } of round) hops.push(gridFold(N, "y", m, a, b));
  push({
    ops: hops,
    batch: { kind: "symmetry", group: "rotate 90°" },
    view: { rotate_deg: 90, flip: false },
    text: `Rotate the paper a quarter turn and repeat steps ${firstVertical}–${lastVertical}${refPoint ? " (the crossing point is already marked, so start from the crease through it)" : ""}. The sheet is now divided into a ${N}×${N} grid.`,
  });

  return { title: `${N}×${N} grid precrease`, status: "complete", stalled_at: null, steps, remaining_estimate: null };
}

/** Panels needed to precrease an N×N grid with this planner. */
export const precreasePanels = (N: number): number => precreaseGrid(N).steps.length;
