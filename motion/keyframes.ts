// Keyframes half of motion/ (motion/README.md): per primitive op, the rigid
// transform from before to after. For a simple fold that is one rotation of
// the moving faces about the fold line — no solver, no physics
// (ARCHITECTURE.md §6). The geometry is the engine's, not an approximation.

import { type Vec, reflectPoint, lineThrough } from "../engine/geom.ts";
import { foldedPolygon, isFlipped } from "../engine/state.ts";
import type { Frame, StepPlan } from "../sequencer/plan.ts";

export interface KeyFace {
  id: number;
  pts: [number, number][];
  back: boolean;
  /** Stack rank at the start of the op. */
  z: number;
}

export interface OpKeyframe {
  /** The paper at the start of the op, already cut along the fold line. */
  faces: KeyFace[];
  /** Ids in `faces` that rotate. */
  moving: number[];
  axis: [[number, number], [number, number]];
  /** Signed: positive lifts the left side of the axis toward the viewer. */
  angle_deg: number;
  /** Fold part-way and return (crease and unfold). */
  unfold: boolean;
  /** A pinch mark instead of a fold. */
  pinch: [number, number] | null;
  duration_ms: number;
}

export interface MotionKeyframes {
  title: string;
  steps: { step_id: number; text: string; ops: OpKeyframe[] }[];
  /** The finished (flat) state, for the last frame. */
  final: KeyFace[];
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const pt = (p: Vec): [number, number] => [r4(p[0]), r4(p[1])];

export function keyframes(plan: StepPlan, frames: Frame[]): MotionKeyframes {
  const steps = plan.steps.map((step, i) => {
    const frame = frames[i]!;
    const ops: OpKeyframe[] = frame.ops.map((rec) => {
      const op = rec.op;
      const axis: [[number, number], [number, number]] = [pt(op.line[0]), pt(op.line[1])];
      if (op.kind === "pinch") {
        return { faces: faceList(rec.state.faces, new Set(), null, new Map()), moving: [], axis, angle_deg: 0, unfold: false, pinch: pt(op.at), duration_ms: 500 };
      }
      const line = lineThrough(op.line[0], op.line[1]);
      const flap = new Set(rec.flap);
      // Start-of-op z for faces created by the cut: their parent's z.
      const parentZ = new Map<number, number>();
      for (const [parent, kids] of rec.split) {
        const z = rec.state.faces.find((f) => f.id === parent)!.z;
        for (const k of kids) parentZ.set(k, z);
      }
      for (const f of rec.state.faces) if (!parentZ.has(f.id)) parentZ.set(f.id, f.z);
      const faces = faceList(rec.result.faces, op.unfold ? new Set() : flap, (p) => reflectPoint(line, p), parentZ);
      const lifts = (op.kind === "valley") === (op.moving === "left");
      return { faces, moving: [...flap], axis, angle_deg: lifts ? 180 : -180, unfold: op.unfold, pinch: null, duration_ms: op.unfold ? 900 : 1200 };
    });
    return { step_id: step.id, text: step.text, ops };
  });
  const last = frames.at(-1)!.after;
  return { title: plan.title, steps, final: faceList(last.faces, new Set(), null, new Map(last.faces.map((f) => [f.id, f.z]))) };
}

function faceList(
  faces: readonly import("../engine/state.ts").Face[],
  reflectIds: Set<number>,
  reflect: ((p: Vec) => Vec) | null,
  z: Map<number, number>,
): KeyFace[] {
  const list = faces.map((f) => {
    const flipBack = reflect !== null && reflectIds.has(f.id);
    const poly = foldedPolygon(f).map((p) => (flipBack ? reflect!(p) : p));
    return { id: f.id, pts: poly.map(pt), back: flipBack ? !isFlipped(f) : isFlipped(f), z: z.get(f.id) ?? f.z };
  });
  // Dense ranks, bottom to top.
  const order = [...list].sort((a, b) => a.z - b.z || a.id - b.id);
  order.forEach((f, i) => (f.z = i));
  return list;
}
