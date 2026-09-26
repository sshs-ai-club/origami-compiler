// Geometry half of diagrams/ (diagrams/README.md): project a step onto the
// page. Exact — computed from the engine state, never drawn by a model.
//
// Hidden-line removal uses the engine's layer order directly: faces are
// emitted bottom-to-top with their outlines, so painting them in order hides
// exactly what the layers above cover.

import { type Line, type Vec, add, affineEqual, dot, lineThrough, mid, onSegment, reflectPoint, scale, side, sub } from "../engine/geom.ts";
import { type Face, type FlatState, foldedPolygon, isFlipped } from "../engine/state.ts";
import type { Frame, Step } from "../sequencer/plan.ts";

export type LineKind = "edge" | "crease" | "valley" | "mountain" | "pinch" | "xray";

export interface DiagramFace {
  id: number;
  pts: Vec[];
  /** Shows the back (coloured) side of the paper. */
  back: boolean;
  /** Outline segments, drawn right after the fill. */
  edges: { a: Vec; b: Vec; kind: "edge" | "crease" }[];
}

export interface DiagramGeometry {
  /** Bottom to top. */
  faces: DiagramFace[];
  /** Fold lines and pinch marks for this step, drawn on top of everything. */
  polylines: { pts: Vec[]; kind: LineKind; visible: boolean }[];
  arrows: { from: Vec; to: Vec; kind: "fold" | "fold-behind" | "fold-unfold" | "rotate" | "flip"; bend: number }[];
  /** Reference marks made in earlier steps (pinches). */
  marks: Vec[];
  view: { rotate_deg: number; flip: boolean };
  bbox: [number, number, number, number];
}

export function stateFaces(state: FlatState): DiagramFace[] {
  const byMid = new Map<string, Face[]>();
  const key = (p: Vec) => `${Math.round(p[0] * 1e6)},${Math.round(p[1] * 1e6)}`;
  for (const f of state.faces) {
    for (let i = 0; i < f.paper.length; i++) {
      const k = key(mid(f.paper[i]!, f.paper[(i + 1) % f.paper.length]!));
      byMid.set(k, [...(byMid.get(k) ?? []), f]);
    }
  }
  const neighbour = (f: Face, a: Vec, b: Vec): Face | undefined => {
    const m = mid(a, b);
    const hit = byMid.get(key(m))?.find((g) => g.id !== f.id);
    if (hit) return hit;
    // T-junction: the neighbour's edge is longer than ours.
    return state.faces.find((g) => g.id !== f.id && g.paper.some((p, j) => onSegment(p, g.paper[(j + 1) % g.paper.length]!, m)));
  };
  return [...state.faces]
    .sort((a, b) => a.z - b.z)
    .map((f) => {
      const pts = foldedPolygon(f);
      const edges = f.paper.map((a, i) => {
        const b = f.paper[(i + 1) % f.paper.length]!;
        const tag = f.tags[i]!;
        let kind: "edge" | "crease" = "edge";
        if (tag.kind === "crease") {
          const g = neighbour(f, a, b);
          // A crease between two faces lying flat together is drawn as a thin line; a folded one is a paper edge.
          if (g && affineEqual(g.T, f.T)) kind = "crease";
        }
        return { a: pts[i]!, b: pts[(i + 1) % pts.length]!, kind };
      });
      return { id: f.id, pts, back: isFlipped(f), edges };
    });
}

/** The part of `line` that crosses the given polygons, as one segment. */
function clipLine(line: Line, polys: readonly (readonly Vec[])[]): [Vec, Vec] | null {
  let lo = Infinity, hi = -Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      const sa = side(line, a), sb = side(line, b);
      const hits: Vec[] = [];
      if (Math.abs(sa) < 1e-9) hits.push(a);
      if (sa * sb < 0) hits.push(add(a, scale(sub(b, a), sa / (sa - sb))));
      for (const h of hits) {
        const t = dot(sub(h, line.p), line.d);
        lo = Math.min(lo, t);
        hi = Math.max(hi, t);
      }
    }
  }
  if (!(hi > lo)) return null;
  return [add(line.p, scale(line.d, lo)), add(line.p, scale(line.d, hi))];
}

export function stepGeometry(step: Step, frame: Frame): DiagramGeometry {
  const faces = stateFaces(frame.before);
  const polylines: DiagramGeometry["polylines"] = [];
  const arrows: DiagramGeometry["arrows"] = [];
  const pinchesHere = step.ops.filter((o) => o.kind === "pinch").length;
  const marks = frame.landmarks.slice(0, frame.landmarks.length - pinchesHere);
  // A batched panel shows every fold line but one representative arrow, as human diagrams do.
  const oneArrow = step.batch.kind === "repeat" || (step.batch.kind === "symmetry" && step.ops.length > 2);
  const sameSeg = (a: readonly Vec[], b: readonly Vec[]) => a.length === b.length && a.every((p, i) => Math.hypot(p[0] - b[i]![0], p[1] - b[i]![1]) < 1e-6);
  for (const rec of frame.ops) {
    const op = rec.op;
    const line = lineThrough(op.line[0], op.line[1]);
    if (op.kind === "pinch") {
      const h = scale(line.d, 0.035);
      polylines.push({ pts: [sub(op.at, h), add(op.at, h)], kind: "pinch", visible: true });
      if (op.bring && arrows.length === 0) {
        // Bring one mark to the other: draw it beside the edge so it does not hide the paper.
        const off: Vec = [0.06, 0];
        arrows.push({ from: add(op.bring[0], off), to: add(op.bring[1], off), kind: "fold-unfold", bend: -1 });
      }
      continue;
    }
    // "Repeat behind": the panel shows the front fold; the text says to repeat it.
    if (step.batch.kind === "symmetry" && step.batch.group === "repeat behind" && rec !== frame.ops[0]) continue;
    // The flap as it lay before folding. `flap` names faces of the result state;
    // for a real fold those have been reflected, so reflect them back.
    const flapPolys = rec.result.faces
      .filter((f) => rec.flap.includes(f.id))
      .map((f) => (op.unfold ? foldedPolygon(f) : foldedPolygon(f).map((p) => reflectPoint(line, p))));
    const allPolys = rec.state.faces.map(foldedPolygon);
    // Draw the fold line across the paper it creases (the whole stack for "all").
    const seg = clipLine(line, op.scope === "all" || flapPolys.length === 0 ? allPolys : flapPolys) ?? [op.line[0], op.line[1]];
    if (polylines.some((pl) => sameSeg(pl.pts, seg))) continue;
    polylines.push({ pts: seg, kind: op.kind, visible: true });
    if (oneArrow && arrows.length > 0) continue;
    // Arrow: from a point on the moving paper to where it lands.
    const moving = op.moving === "left" ? 1 : -1;
    const movingPts = (flapPolys.length ? flapPolys : allPolys).flat().filter((p) => side(line, p) * moving > 1e-9);
    if (movingPts.length === 0) continue;
    const far = movingPts.reduce((best, p) => (Math.abs(side(line, p)) > Math.abs(side(line, best)) ? p : best));
    const m = mid(seg[0], seg[1]);
    const along = dot(sub(far, m), line.d);
    const start = add(m, add(scale(line.d, along * 0.3), scale([-line.d[1], line.d[0]], side(line, far) * 0.75)));
    arrows.push({
      from: start,
      to: reflectPoint(line, start),
      kind: op.unfold ? "fold-unfold" : op.kind === "mountain" ? "fold-behind" : "fold",
      bend: moving,
    });
  }
  const all = [...faces.flatMap((f) => f.pts), ...polylines.flatMap((p) => p.pts), ...arrows.flatMap((a) => [a.from, a.to]), ...marks];
  const bbox: [number, number, number, number] = [
    Math.min(...all.map((p) => p[0])),
    Math.min(...all.map((p) => p[1])),
    Math.max(...all.map((p) => p[0])),
    Math.max(...all.map((p) => p[1])),
  ];
  return { faces, polylines, arrows, marks, view: step.view, bbox };
}

/** Geometry of a finished state, for the final panel. */
export function resultGeometry(state: FlatState): DiagramGeometry {
  const faces = stateFaces(state);
  const all = faces.flatMap((f) => f.pts);
  return {
    faces,
    polylines: [],
    arrows: [],
    marks: [],
    view: { rotate_deg: 0, flip: false },
    bbox: [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))],
  };
}
