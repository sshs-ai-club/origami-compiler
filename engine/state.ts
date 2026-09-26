// FoldedState for the flat regime (ARCHITECTURE.md §4).
//
// Representation:
// - The paper is cut, in *paper coordinates*, into convex faces along every
//   crease made so far. A crease that has been unfolded still separates faces.
// - Each face carries an affine map `T` from paper coordinates to folded
//   coordinates (a composition of reflections, so det(T) = ±1). det < 0 means
//   the face shows its back side.
// - Each face carries a stacking rank `z`: higher is closer to the viewer.
//
// Layer order is stored as a single global rank. For states produced by simple
// folds this is always sufficient: a global total order restricted to the
// overlapping pairs is a valid partial order, and every simple fold moves a
// block of faces to the very top (valley) or very bottom (mountain) of the
// region it lands on. It is NOT a general layer solver — crease patterns that
// were not produced by a known fold sequence need the flat-folder port
// (DEPENDENCIES.md §3). That limitation is deliberate for v0.

import { type Affine, IDENTITY, type Vec, applyAffine, det } from "./geom.ts";

/** Per-edge tag of a face polygon in paper coordinates. */
export type EdgeTag =
  | { kind: "boundary" }
  /** A crease. `made` is the assignment it received, seen from the paper's front, when it was first folded. */
  | { kind: "crease"; made: "M" | "V" };

export interface Face {
  readonly id: number;
  /** Convex polygon in paper coordinates, counter-clockwise. */
  readonly paper: readonly Vec[];
  /** tags[i] belongs to edge paper[i] -> paper[i+1]. */
  readonly tags: readonly EdgeTag[];
  readonly T: Affine;
  readonly z: number;
}

export interface FlatState {
  readonly faces: readonly Face[];
  /** Next unused face id. Ids are never reused, so faces can be tracked across steps. */
  readonly nextId: number;
}

/** The unit square, face up, unfolded. */
export function squareSheet(): FlatState {
  const b: EdgeTag = { kind: "boundary" };
  return {
    faces: [
      {
        id: 0,
        paper: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        tags: [b, b, b, b],
        T: IDENTITY,
        z: 0,
      },
    ],
    nextId: 1,
  };
}

export const foldedPolygon = (f: Face): Vec[] => f.paper.map((p) => applyAffine(f.T, p));

export const isFlipped = (f: Face): boolean => det(f.T) < 0;

/** Number of layers at a folded-coordinate point (faces whose folded polygon contains it strictly). */
export function layersAt(state: FlatState, x: Vec): Face[] {
  const out: Face[] = [];
  for (const f of state.faces) {
    const poly = foldedPolygon(f);
    if (strictlyInside(poly, x)) out.push(f);
  }
  return out.sort((a, b) => a.z - b.z);
}

function strictlyInside(poly: readonly Vec[], x: Vec): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const c = (b[0] - a[0]) * (x[1] - a[1]) - (b[1] - a[1]) * (x[0] - a[0]);
    if (Math.abs(c) < 1e-9) return false;
    const s = Math.sign(c);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Maximum layer count over the folded state, sampled at face centroids. */
export function maxLayers(state: FlatState): number {
  let best = 0;
  for (const f of state.faces) {
    const poly = foldedPolygon(f);
    const c: Vec = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
    best = Math.max(best, layersAt(state, c).length);
  }
  return best;
}

/** Folded-coordinate bounding box [x0, y0, x1, y1]. */
export function bbox(state: FlatState): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of state.faces) {
    for (const p of foldedPolygon(f)) {
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
  }
  return [x0, y0, x1, y1];
}
