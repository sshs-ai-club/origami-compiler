// Apply one simple fold to a flat state.
//
// A simple fold rotates a set of layers 180° about a line. Two scopes:
// - "all":  every layer on the moving side (the classical simple fold).
// - seed:   one flap — the top (valley) or bottom (mountain) layer under a
//           point, plus everything rigidly attached to it on the moving side.
//
// Paper connectivity is respected by construction: faces joined along an edge
// that is not on the fold line cannot bend relative to each other, so they
// move together.
//
// Layers resting on the flap (above it for a valley fold, below it for a
// mountain fold) cannot stay put while the flap swings away — they are
// carried along, with everything rigidly attached to them, exactly as a
// person folding the flap would carry them. Carried faces are reported. With
// `strict`, carrying is refused instead and the fold is rejected as pinned.
// After carrying, no layer that stays put lies above (valley) / below
// (mountain) a moving layer where they overlap, which is the validity
// condition for a flap fold.
//
// Non-simple operations (reverse, squash, sink, petal, collapse) are not
// representable here. They are exactly where v0 stops — see sequencer/README.md.

import {
  type Affine,
  type Line,
  type Vec,
  applyAffine,
  compose,
  convexOverlap,
  cross,
  det,
  dot,
  len,
  reflection,
  side,
  splitConvex,
  sub,
} from "./geom.ts";
import type { EdgeTag, Face, FlatState } from "./state.ts";

export type Sense = "valley" | "mountain";

export interface SimpleFold {
  /** The fold line, in folded (current view) coordinates. */
  readonly line: Line;
  /** Seen from the viewer: valley brings the flap up toward the viewer, mountain takes it behind. */
  readonly sense: Sense;
  /** Which side of `line` moves: the left or the right of its direction. */
  readonly moving: "left" | "right";
  /** "all" layers, or the flap found under a folded-coordinate point. */
  readonly scope: "all" | { readonly seed: Vec };
  /** Crease and unfold: record the crease, leave the geometry and layers as they were. */
  readonly unfold?: boolean;
  /** Reject instead of carrying layers that rest on the flap. */
  readonly strict?: boolean;
}

export type FoldResult =
  | {
      readonly ok: true;
      readonly state: FlatState;
      /** Ids (in the new state) of faces that rotated. Empty for crease-and-unfold. */
      readonly moved: readonly number[];
      /** Ids of faces (in the new state) on the moving side that took part, including when unfolded. */
      readonly flap: readonly number[];
      /** Parent face id -> child ids, for faces that were creased by this fold. */
      readonly split: ReadonlyMap<number, readonly number[]>;
      /** Ids (in the old state) of faces that moved only because they rested on the flap. */
      readonly carried: readonly number[];
    }
  | { readonly ok: false; readonly reason: string };

interface Piece {
  parent: Face;
  paper: Vec[];
  tags: EdgeTag[];
  /** +1 left of the line, -1 right. */
  sideSign: 1 | -1;
  split: boolean;
  /** The tag object used for the edge created by this cut. */
  cut: EdgeTag;
}

const invert = (m: Affine): Affine => {
  const d = det(m);
  const a = m[4] / d, b = -m[1] / d, c = -m[3] / d, e = m[0] / d;
  return [a, b, -(a * m[2] + b * m[5]), c, e, -(c * m[2] + e * m[5])];
};

export function applyFold(state: FlatState, op: SimpleFold): FoldResult {
  const L = op.line;
  const movingSign = op.moving === "left" ? 1 : -1;

  // 1. Cut every face by the line (tentatively; uncreased faces are restored below).
  const pieces: Piece[] = [];
  for (const f of state.faces) {
    const inv = invert(f.T);
    const p0 = applyAffine(inv, L.p);
    const p1 = applyAffine(inv, [L.p[0] + L.d[0], L.p[1] + L.d[1]]);
    const paperLine: Line = { p: p0, d: sub(p1, p0) };
    // The cut tag's assignment is decided once we know whether this face is creased.
    const placeholder: EdgeTag = { kind: "crease", made: "V" };
    const { left, right } = splitConvex(f.paper, f.tags, paperLine, placeholder);
    const parts = [left, right].filter((x) => x !== null);
    for (const part of parts) {
      const folded = part.poly.map((p) => applyAffine(f.T, p));
      const c: Vec = [folded.reduce((s, p) => s + p[0], 0) / folded.length, folded.reduce((s, p) => s + p[1], 0) / folded.length];
      pieces.push({ parent: f, paper: part.poly, tags: part.tags, sideSign: side(L, c) > 0 ? 1 : -1, split: parts.length === 2, cut: placeholder });
    }
  }

  const onMoving = pieces.filter((p) => p.sideSign === movingSign);
  if (onMoving.length === 0) return { ok: false, reason: "no paper on the moving side of the fold line" };

  // 2. Which pieces move.
  let moving: Set<Piece>;
  if (op.scope === "all") {
    moving = new Set(onMoving);
  } else {
    const seed = op.scope.seed;
    const under = onMoving.filter((p) => containsPoint(p.paper.map((q) => applyAffine(p.parent.T, q)), seed));
    if (under.length === 0) return { ok: false, reason: "no flap under the seed point on the moving side" };
    under.sort((a, b) => a.parent.z - b.parent.z);
    const start = op.sense === "valley" ? under[under.length - 1]! : under[0]!;
    moving = rigidComponent(start, onMoving, L);
  }

  // 3. Carry layers resting on the flap (or reject, in strict mode).
  const carried = new Set<number>();
  const polyOf = new Map(onMoving.map((p) => [p, p.paper.map((q) => applyAffine(p.parent.T, q))]));
  const rests = (a: Piece, b: Piece) => (op.sense === "valley" ? b.parent.z > a.parent.z : b.parent.z < a.parent.z) && convexOverlap(polyOf.get(a)!, polyOf.get(b)!);
  if (!op.strict) {
    for (let grew = true; grew; ) {
      grew = false;
      for (const b of onMoving) {
        if (moving.has(b)) continue;
        if (![...moving].some((a) => rests(a, b))) continue;
        for (const c of rigidComponent(b, onMoving, L)) {
          if (!moving.has(c)) {
            moving.add(c);
            carried.add(c.parent.id);
          }
        }
        grew = true;
      }
    }
  }

  // 4. Layer check: nothing that stays may pin the flap.
  for (const a of moving) {
    const pa = a.paper.map((q) => applyAffine(a.parent.T, q));
    for (const b of onMoving) {
      if (moving.has(b)) continue;
      const pb = b.paper.map((q) => applyAffine(b.parent.T, q));
      if (!convexOverlap(pa, pb)) continue;
      const blocked = op.sense === "valley" ? b.parent.z > a.parent.z : b.parent.z < a.parent.z;
      if (blocked) {
        return {
          ok: false,
          reason: `flap is pinned: face ${b.parent.id} lies ${op.sense === "valley" ? "on top of" : "under"} moving face ${a.parent.id}`,
        };
      }
    }
  }

  // 5. Commit. A face is creased iff it was cut and its moving-side piece moves.
  const creasedParents = new Set<number>();
  for (const p of moving) if (p.split) creasedParents.add(p.parent.id);

  const R = reflection(L);
  let nextId = state.nextId;
  const out: Face[] = [];
  const movedIds: number[] = [];
  const flapIds: number[] = [];
  const split = new Map<number, number[]>();
  const movingZ = [...moving].map((p) => p.parent.z);
  const allZ = state.faces.map((f) => f.z);
  const zMaxMoving = Math.max(...movingZ);
  const zMinMoving = Math.min(...movingZ);
  const zTop = Math.max(...allZ) + 1;
  const zBottom = Math.min(...allZ) - 1;

  const handled = new Set<number>();
  for (const p of pieces) {
    const f = p.parent;
    if (!creasedParents.has(f.id)) {
      if (handled.has(f.id)) continue;
      handled.add(f.id);
      const moves = [...moving].some((m) => m.parent.id === f.id);
      out.push(moves ? movedFace(f, f.id, f.paper, f.tags) : f);
      if (moves) {
        flapIds.push(f.id);
        if (!op.unfold) movedIds.push(f.id);
      }
      continue;
    }
    // Creased face: emit this piece as a new face with the cut edge tagged.
    const made = creaseAssignment(op.sense, det(f.T) < 0);
    const tags = p.tags.map((t) => (t === p.cut ? { kind: "crease" as const, made } : t));
    const id = nextId++;
    const kids = split.get(f.id) ?? [];
    kids.push(id);
    split.set(f.id, kids);
    if (moving.has(p)) {
      out.push(movedFace(f, id, p.paper, tags));
      flapIds.push(id);
      if (!op.unfold) movedIds.push(id);
    } else {
      out.push({ id, paper: p.paper, tags, T: f.T, z: f.z });
    }
  }

  function movedFace(f: Face, id: number, paper: readonly Vec[], tags: readonly EdgeTag[]): Face {
    if (op.unfold) return { id, paper, tags, T: f.T, z: f.z };
    const z = op.sense === "valley" ? zTop + (zMaxMoving - f.z) : zBottom - (f.z - zMinMoving);
    return { id, paper, tags, T: compose(R, f.T), z };
  }

  return { ok: true, state: { faces: normalizeRanks(out), nextId }, moved: movedIds, flap: flapIds, split, carried: [...carried] };
}

/** Seen from the paper's front: a valley fold on a face-up layer is a valley crease. */
function creaseAssignment(sense: Sense, flipped: boolean): "M" | "V" {
  const valley = sense === "valley";
  return valley !== flipped ? "V" : "M";
}

function containsPoint(poly: readonly Vec[], x: Vec): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const c = cross(sub(b, a), sub(x, a));
    if (Math.abs(c) < 1e-12) continue;
    const s = Math.sign(c);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Pieces joined to `start` through shared edges that do not lie on the fold line. */
function rigidComponent(start: Piece, candidates: readonly Piece[], L: Line): Set<Piece> {
  const comp = new Set<Piece>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const a = queue.pop()!;
    for (const b of candidates) {
      if (comp.has(b)) continue;
      const shared = sharedEdge(a, b);
      if (!shared) continue;
      const fa = applyAffine(a.parent.T, shared[0]);
      const fb = applyAffine(a.parent.T, shared[1]);
      const onLine = Math.abs(side(L, fa)) < 1e-7 && Math.abs(side(L, fb)) < 1e-7;
      if (!onLine) {
        comp.add(b);
        queue.push(b);
      }
    }
  }
  return comp;
}

/** A positive-length segment common to the boundaries of two pieces, in paper coordinates. */
function sharedEdge(a: Piece, b: Piece): [Vec, Vec] | null {
  for (let i = 0; i < a.paper.length; i++) {
    const a0 = a.paper[i]!;
    const a1 = a.paper[(i + 1) % a.paper.length]!;
    const d = sub(a1, a0);
    const l = len(d);
    for (let j = 0; j < b.paper.length; j++) {
      const b0 = b.paper[j]!;
      const b1 = b.paper[(j + 1) % b.paper.length]!;
      if (Math.abs(cross(d, sub(b0, a0))) / l > 1e-7 || Math.abs(cross(d, sub(b1, a0))) / l > 1e-7) continue;
      const t0 = dot(sub(b0, a0), d) / (l * l);
      const t1 = dot(sub(b1, a0), d) / (l * l);
      const lo = Math.max(0, Math.min(t0, t1));
      const hi = Math.min(1, Math.max(t0, t1));
      if ((hi - lo) * l > 1e-7) {
        return [
          [a0[0] + d[0] * lo, a0[1] + d[1] * lo],
          [a0[0] + d[0] * hi, a0[1] + d[1] * hi],
        ];
      }
    }
  }
  return null;
}

function normalizeRanks(faces: Face[]): Face[] {
  const order = [...faces].sort((a, b) => a.z - b.z || a.id - b.id);
  const rank = new Map(order.map((f, i) => [f.id, i]));
  return faces.map((f) => ({ ...f, z: rank.get(f.id)! })).sort((a, b) => a.id - b.id);
}

/** Convenience: throw on an invalid fold. */
export function fold(state: FlatState, op: SimpleFold): FlatState {
  const r = applyFold(state, op);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

