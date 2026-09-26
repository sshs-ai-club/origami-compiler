// StepPlan: the contract from sequencer/ to diagrams/ and motion/
// (ARCHITECTURE.md §3). A step is one diagram panel; it may batch several
// primitive operations. cost(plan) = number of steps.
//
// before/after states are not serialised: they are recomputed by replaying
// the plan through the engine, which doubles as verification.

import { applyFold, type SimpleFold } from "../engine/fold.ts";
import { type Vec, lineThrough } from "../engine/geom.ts";
import { type FlatState, squareSheet } from "../engine/state.ts";

export type Batch =
  | { kind: "single" }
  /** "Repeat behind", "rotate and repeat" — one panel, many mirrored/rotated ops. */
  | { kind: "symmetry"; group: string }
  /** "Fold each edge to the nearest crease" — n analogous ops in one panel. */
  | { kind: "repeat"; n: number; along: string }
  | { kind: "precrease"; region: string }
  | { kind: "collapse"; region: string };

export type FoldOp =
  | {
      kind: "valley" | "mountain";
      /** Two points on the fold line, folded coordinates. The line is directed a -> b. */
      line: [Vec, Vec];
      /** Side of the directed line that moves. */
      moving: "left" | "right";
      /** "all" layers, or the flap under this folded-coordinate point. */
      scope: "all" | { seed: Vec };
      unfold: boolean;
      /** Where the moving paper lands, in words, for the step text. */
      reference: string;
    }
  | {
      /** A short crease at one spot, used only to mark a reference point. No face is split. */
      kind: "pinch";
      line: [Vec, Vec];
      at: Vec;
      /** The two points brought together to make the pinch, if it is a point-to-point fold. */
      bring?: [Vec, Vec];
      reference: string;
    };

export interface Step {
  id: number;
  phase: "precrease" | "collapse" | "shaping";
  ops: FoldOp[];
  batch: Batch;
  /** View change before this step. */
  view: { rotate_deg: number; flip: boolean };
  text: string;
}

export interface StepPlan {
  title: string;
  /** "partial" when the sequencer stopped before the finished model (it must say so — sequencer/README.md). */
  status: "complete" | "partial";
  /** The phase at which a partial plan stops, and why. */
  stalled_at: { phase: string; reason: string } | null;
  steps: Step[];
  /** Panels still to come after a partial plan, as estimated by design/. */
  remaining_estimate: { collapse: number; shaping: number } | null;
}

export const cost = (plan: StepPlan): number => plan.steps.length;

export function toSimpleFold(op: Extract<FoldOp, { kind: "valley" | "mountain" }>): SimpleFold {
  return { line: lineThrough(op.line[0], op.line[1]), sense: op.kind, moving: op.moving, scope: op.scope, unfold: op.unfold };
}

export interface Frame {
  /** State before the step. */
  before: FlatState;
  after: FlatState;
  /** Per primitive op: the state it acted on and the faces that rotated. */
  ops: {
    op: FoldOp;
    state: FlatState;
    /** Result-state ids of faces that took part (see FoldResult.flap). */
    flap: readonly number[];
    /** Parent id (in `state`) -> child ids (in `result`) for faces creased by this op. */
    split: ReadonlyMap<number, readonly number[]>;
    result: FlatState;
  }[];
  /** Reference points marked so far (from pinches). */
  landmarks: Vec[];
}

/** Replay a plan through the engine. Throws on the first invalid op, naming the step. */
export function replay(plan: StepPlan, start: FlatState = squareSheet()): Frame[] {
  let s = start;
  const frames: Frame[] = [];
  const landmarks: Vec[] = [];
  for (const step of plan.steps) {
    const before = s;
    const ops: Frame["ops"] = [];
    for (const op of step.ops) {
      if (op.kind === "pinch") {
        landmarks.push(op.at);
        ops.push({ op, state: s, flap: [], split: new Map(), result: s });
        continue;
      }
      const r = applyFold(s, toSimpleFold(op));
      if (!r.ok) throw new Error(`step ${step.id}: ${r.reason}`);
      ops.push({ op, state: s, flap: r.flap, split: r.split, result: r.state });
      s = r.state;
    }
    frames.push({ before, after: s, ops, landmarks: [...landmarks] });
  }
  return frames;
}
