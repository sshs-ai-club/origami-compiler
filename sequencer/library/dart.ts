// A complete, human-authored sequence: a dart plane from a square (Plan A
// "library" model). Every step is a simple fold, so the engine verifies it
// end to end, including the two single-flap wing folds.

import { type Vec, add, normalize, scale, sub } from "../../engine/geom.ts";
import type { FoldOp, StepPlan } from "../plan.ts";

/** Fold line through `apex` that lays the edge toward `p` onto the edge toward `q`. */
function bisectorThrough(apex: Vec, p: Vec, q: Vec): [Vec, Vec] {
  const u = normalize(sub(p, apex));
  const v = normalize(sub(q, apex));
  const d = normalize(add(u, v));
  return [apex, add(apex, scale(d, 1))];
}

const valley = (line: [Vec, Vec], moving: "left" | "right", reference: string, extra: Partial<Extract<FoldOp, { kind: "valley" | "mountain" }>> = {}): FoldOp => ({
  kind: "valley",
  line,
  moving,
  scope: "all",
  unfold: false,
  reference,
  ...extra,
});

export function dartPlan(): StepPlan {
  const top: Vec = [0.5, 1];
  const centre: Vec = [0.5, 0];
  // Steps 4–5: the slanted edges from step 2–3 onto the centre line.
  const leftSlant = bisectorThrough(top, [0, 0.5], centre);
  const rightSlant = bisectorThrough(top, [1, 0.5], centre);
  return {
    title: "Dart plane (square)",
    status: "complete",
    stalled_at: null,
    remaining_estimate: null,
    steps: [
      { id: 1, phase: "precrease", view: { rotate_deg: 0, flip: false }, batch: { kind: "single" }, ops: [valley([[0.5, 0], [0.5, 1]], "right", "the left edge", { unfold: true })], text: "Valley-fold in half, right edge to left edge. Unfold." },
      {
        id: 2,
        phase: "collapse",
        view: { rotate_deg: 0, flip: false },
        batch: { kind: "symmetry", group: "mirror" },
        ops: [valley([top, [0, 0.5]], "right", "the centre crease"), valley([[1, 0.5], top], "right", "the centre crease")],
        text: "Fold both top corners to the centre crease.",
      },
      {
        id: 3,
        phase: "collapse",
        view: { rotate_deg: 0, flip: false },
        batch: { kind: "symmetry", group: "mirror" },
        ops: [valley([top, leftSlant[1]], "right", "the centre crease"), valley([rightSlant[1], top], "right", "the centre crease")],
        text: "Fold both slanted edges to the centre crease again.",
      },
      { id: 4, phase: "collapse", view: { rotate_deg: 0, flip: false }, batch: { kind: "single" }, ops: [valley([[0.5, 0], [0.5, 1]], "left", "the right side")], text: "Valley-fold in half along the centre crease, left over right, flaps inside." },
      {
        id: 5,
        phase: "shaping",
        view: { rotate_deg: 0, flip: false },
        batch: { kind: "symmetry", group: "repeat behind" },
        ops: [
          { kind: "valley", line: [[0.6, 0], [0.6, 1]], moving: "right", scope: { seed: [0.64, 0.5] }, unfold: false, reference: "the keel" },
          { kind: "mountain", line: [[0.6, 0], [0.6, 1]], moving: "right", scope: { seed: [0.64, 0.5] }, unfold: false, reference: "the keel, behind" },
        ],
        text: "Fold the top wing down, parallel to the keel. Repeat behind.",
      },
    ],
  };
}
