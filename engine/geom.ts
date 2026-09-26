// 2D geometry primitives for the engine.
//
// Everything here works on convex polygons. That is not a simplification we
// hope holds: a square cut by straight fold lines always yields convex pieces
// (each piece is an intersection of half-planes), so convexity is invariant
// for every state the engine can produce.

export type Vec = readonly [number, number];

/** Geometric tolerance, in paper units (the sheet is the unit square). */
export const EPS = 1e-9;

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
export const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1];
export const cross = (a: Vec, b: Vec): number => a[0] * b[1] - a[1] * b[0];
export const len = (a: Vec): number => Math.hypot(a[0], a[1]);
export const dist = (a: Vec, b: Vec): number => len(sub(a, b));
export const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const mid = (a: Vec, b: Vec): Vec => lerp(a, b, 0.5);
export const near = (a: Vec, b: Vec, eps = 1e-7): boolean => dist(a, b) <= eps;

export function normalize(a: Vec): Vec {
  const l = len(a);
  if (l < EPS) throw new Error("normalize: zero vector");
  return [a[0] / l, a[1] / l];
}

/** An infinite line through `p` with unit direction `d`. Left of `d` is the positive side. */
export interface Line {
  readonly p: Vec;
  readonly d: Vec;
}

export function lineThrough(a: Vec, b: Vec): Line {
  return { p: a, d: normalize(sub(b, a)) };
}

/** Perpendicular bisector of segment ab: the fold line that places `a` onto `b` (Huzita-Justin O2). */
export function bisector(a: Vec, b: Vec): Line {
  const m = mid(a, b);
  const n = normalize(sub(b, a));
  return { p: m, d: [-n[1], n[0]] };
}

/** Signed distance from `x` to the line; positive on the left of `d`. */
export const side = (l: Line, x: Vec): number => cross(l.d, sub(x, l.p));

export function reflectPoint(l: Line, x: Vec): Vec {
  const s = side(l, x);
  // normal pointing to the left of d
  const n: Vec = [-l.d[1], l.d[0]];
  return sub(x, scale(n, 2 * s));
}

export function intersectLines(a: Line, b: Line): Vec | null {
  const den = cross(a.d, b.d);
  if (Math.abs(den) < EPS) return null;
  const t = cross(sub(b.p, a.p), b.d) / den;
  return add(a.p, scale(a.d, t));
}

export function signedArea(poly: readonly Vec[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += cross(a, b);
  }
  return s / 2;
}

export function centroid(poly: readonly Vec[]): Vec {
  // Vertex average is enough for a point strictly inside a convex polygon.
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  return [x / poly.length, y / poly.length];
}

/**
 * Split a convex polygon by a line. Each output polygon keeps, per edge, the
 * tag of the input edge it came from; edges created along the cut get `cutTag`.
 * Returns null for a side that has no positive area.
 */
export function splitConvex<T>(
  poly: readonly Vec[],
  tags: readonly T[],
  l: Line,
  cutTag: T,
): { left: { poly: Vec[]; tags: T[] } | null; right: { poly: Vec[]; tags: T[] } | null } {
  const n = poly.length;
  const s = poly.map((p) => {
    const v = side(l, p);
    return Math.abs(v) < 1e-10 ? 0 : v;
  });
  const hasLeft = s.some((v) => v > 0);
  const hasRight = s.some((v) => v < 0);
  if (!hasRight) return { left: { poly: [...poly], tags: [...tags] }, right: null };
  if (!hasLeft) return { left: null, right: { poly: [...poly], tags: [...tags] } };

  const clip = (keep: 1 | -1) => {
    const out: Vec[] = [];
    const outTags: T[] = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % n]!;
      const sa = s[i]! * keep;
      const sb = s[(i + 1) % n]! * keep;
      const tag = tags[i]!;
      if (sa >= 0) {
        out.push(a);
        // Edge a->b leaves the kept half-plane: it is cut, and the next edge runs along the line.
        if (sb < 0) {
          const t = sa / (sa - sb);
          if (sa > 0) {
            outTags.push(tag);
            out.push(lerp(a, b, t));
          }
          outTags.push(cutTag);
        } else {
          outTags.push(tag);
        }
      } else if (sb > 0) {
        // Entering: the crossing point starts the remainder of edge a->b.
        const t = sa / (sa - sb);
        out.push(lerp(a, b, t));
        outTags.push(tag);
      }
    }
    return { poly: out, tags: outTags };
  };

  const left = clip(1);
  const right = clip(-1);
  return {
    left: Math.abs(signedArea(left.poly)) > 1e-12 ? left : null,
    right: Math.abs(signedArea(right.poly)) > 1e-12 ? right : null,
  };
}

/** True when two convex polygons overlap with positive area (separating axis test). */
export function convexOverlap(a: readonly Vec[], b: readonly Vec[], eps = 1e-8): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      const axis: Vec = [-(q[1] - p[1]), q[0] - p[0]];
      const l = len(axis);
      if (l < EPS) continue;
      const ax: Vec = [axis[0] / l, axis[1] / l];
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const v of a) {
        const d = dot(v, ax);
        minA = Math.min(minA, d);
        maxA = Math.max(maxA, d);
      }
      for (const v of b) {
        const d = dot(v, ax);
        minB = Math.min(minB, d);
        maxB = Math.max(maxB, d);
      }
      if (maxA <= minB + eps || maxB <= minA + eps) return false;
    }
  }
  return true;
}

export function pointInConvex(poly: readonly Vec[], x: Vec, eps = 1e-9): boolean {
  const orient = Math.sign(signedArea(poly));
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if (orient * cross(sub(b, a), sub(x, a)) < -eps) return false;
  }
  return true;
}

/** Is `x` on segment ab (within eps)? */
export function onSegment(a: Vec, b: Vec, x: Vec, eps = 1e-7): boolean {
  const ab = sub(b, a);
  const l = len(ab);
  if (l < EPS) return near(a, x, eps);
  if (Math.abs(cross(ab, sub(x, a))) / l > eps) return false;
  const t = dot(sub(x, a), ab) / (l * l);
  return t >= -eps / l && t <= 1 + eps / l;
}

/** 2x3 affine map [a b c; d e f]: (x,y) -> (ax+by+c, dx+ey+f). */
export type Affine = readonly [number, number, number, number, number, number];

export const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];

export const applyAffine = (m: Affine, p: Vec): Vec => [m[0] * p[0] + m[1] * p[1] + m[2], m[3] * p[0] + m[4] * p[1] + m[5]];

/** m2 ∘ m1 (apply m1 first). */
export function compose(m2: Affine, m1: Affine): Affine {
  return [
    m2[0] * m1[0] + m2[1] * m1[3],
    m2[0] * m1[1] + m2[1] * m1[4],
    m2[0] * m1[2] + m2[1] * m1[5] + m2[2],
    m2[3] * m1[0] + m2[4] * m1[3],
    m2[3] * m1[1] + m2[4] * m1[4],
    m2[3] * m1[2] + m2[4] * m1[5] + m2[5],
  ];
}

export function reflection(l: Line): Affine {
  // Reflection across the line: x' = p + R(x - p), R = 2 d d^T - I.
  const [dx, dy] = l.d;
  const r00 = 2 * dx * dx - 1;
  const r01 = 2 * dx * dy;
  const r11 = 2 * dy * dy - 1;
  const [px, py] = l.p;
  return [r00, r01, px - r00 * px - r01 * py, r01, r11, py - r01 * px - r11 * py];
}

export const det = (m: Affine): number => m[0] * m[4] - m[1] * m[3];

export function affineEqual(a: Affine, b: Affine, eps = 1e-7): boolean {
  return a.every((v, i) => Math.abs(v - b[i]!) <= eps);
}
