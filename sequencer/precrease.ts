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

/**
 * Precreasing for a box-pleated base: the N×N grid, then every other line
 * the base's crease pattern lies on — half-grid lines (fold crease k onto
 * crease k+1) and 45° diagonals (fold a grid line onto a perpendicular one).
 * `lines` are the base's creases in grid units (x right, y up, as in the
 * crease pattern). Each fold is a full crease-and-unfold through the flat
 * sheet, as in Lang's box-pleated diagrams (ODS ch. 13, Bull Moose steps
 * 1–16); some creases run longer than the base needs, and the text says so.
 */
export function precreaseBase(N: number, lines: readonly { a: Vec; b: Vec }[]): StepPlan {
  const plan = precreaseGrid(N);
  const steps = plan.steps;
  const push = (ops: FoldOp[], text: string, batch: Step["batch"]) =>
    steps.push({ id: steps.length + 1, phase: "precrease", view: { rotate_deg: 0, flip: false }, ops, batch, text });

  // --- half-grid lines parallel to the edges
  const half = { x: new Set<number>(), y: new Set<number>() };
  for (const l of lines) {
    if (l.a[0] === l.b[0] && !Number.isInteger(l.a[0])) half.x.add(l.a[0]);
    if (l.a[1] === l.b[1] && !Number.isInteger(l.a[1])) half.y.add(l.a[1]);
  }
  for (const axis of ["x", "y"] as const) {
    const vals = [...half[axis]].sort((p, q) => p - q);
    if (!vals.length) continue;
    const ops: FoldOp[] = vals.map((v) => {
      if (!Number.isInteger(2 * v)) throw new Error(`a crease at ${v} is not on the half-grid`);
      const [lo, hi] = [Math.floor(v), Math.ceil(v)];
      const t = v / N;
      const reference = `the ${lo}/${N} crease to the ${hi}/${N} crease`;
      return axis === "x"
        ? { kind: "valley", line: [[t, 0], [t, 1]], moving: v < N / 2 ? "left" : "right", scope: "all", unfold: true, reference }
        : { kind: "valley", line: [[0, t], [1, t]], moving: v > N / 2 ? "left" : "right", scope: "all", unfold: true, reference };
    });
    push(
      ops,
      `${ops.length === 1 ? "Fold" : `Make ${ops.length} half-width creases: fold`} ${ops.map((o) => (o as { reference: string }).reference).join("; ")}, and unfold${ops.length === 1 ? "" : " after each"}. ${axis === "x" ? "Vertical" : "Horizontal"}, halfway between two grid lines.`,
      ops.length === 1 ? { kind: "single" } : { kind: "repeat", n: ops.length, along: axis === "x" ? "vertical" : "horizontal" },
    );
  }

  // --- 45° diagonals: x − y = c ("rising") and x + y = c ("falling")
  const rising = new Set<number>(), falling = new Set<number>();
  for (const l of lines) {
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1];
    if (dx === 0 || dy === 0) continue;
    if (Math.abs(Math.abs(dx) - Math.abs(dy)) > 1e-9) throw new Error("a crease is neither axis-parallel nor at 45°");
    if (Math.sign(dx) === Math.sign(dy)) rising.add(l.a[0] - l.a[1]);
    else falling.add(l.a[0] + l.a[1]);
  }
  const name = (pos: number, axis: "x" | "y") => edgeName(pos, N, axis);
  const diagonal = (kind: "rising" | "falling", c: number): FoldOp => {
    if (!Number.isInteger(2 * c)) throw new Error(`diagonal off the half-grid (${c})`);
    // endpoints of the line inside the square, grid units
    const pts: Vec[] =
      kind === "rising" ? (c >= 0 ? [[c, 0], [N, N - c]] : [[0, -c], [N + c, N]]) : c <= N ? [[c, 0], [0, c]] : [[N, c - N], [c - N, N]];
    // Reflection across the line swaps a vertical line with a horizontal one: that is the reference.
    let reference: string;
    if (kind === "rising") reference = c >= 0 ? `the bottom edge to the ${name(c, "x")}` : `the left edge to the ${name(-c, "y")}`;
    else reference = c <= N ? `the bottom edge to the ${name(c, "x")}` : `the top edge to the ${name(c - N, "x")}`;
    // Move the smaller side (the corner the line cuts off).
    const [a, b] = [pts[0]!, pts[1]!];
    const corner: Vec = kind === "rising" ? (c >= 0 ? [N, 0] : [0, N]) : c <= N ? [0, 0] : [N, N];
    const cross = (b[0] - a[0]) * (corner[1] - a[1]) - (b[1] - a[1]) * (corner[0] - a[0]);
    return { kind: "valley", line: [[a[0] / N, a[1] / N], [b[0] / N, b[1] / N]], moving: cross > 0 ? "left" : "right", scope: "all", unfold: true, reference };
  };
  const PER_PANEL = 6;
  for (const [kind, set] of [["rising", rising], ["falling", falling]] as const) {
    const cs = [...set].sort((p, q) => p - q);
    for (let i = 0; i < cs.length; i += PER_PANEL) {
      const ops = cs.slice(i, i + PER_PANEL).map((c) => diagonal(kind, c));
      push(
        ops,
        `${ops.length === 1 ? "Fold" : `Make ${ops.length} diagonal creases (${kind === "rising" ? "↗" : "↘"}): fold`} ${ops.map((o) => (o as { reference: string }).reference).join("; ")}, and unfold${ops.length === 1 ? "" : " after each"}. Each crease runs edge to edge through grid points; the base uses only parts of it.`,
        ops.length === 1 ? { kind: "single" } : { kind: "repeat", n: ops.length, along: kind === "rising" ? "diagonal ↗" : "diagonal ↘" },
      );
    }
  }
  return { ...plan, title: `${N}×${N} box-pleat precrease` };
}
