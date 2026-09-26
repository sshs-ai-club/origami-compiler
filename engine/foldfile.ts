// FOLD format I/O (https://github.com/edemaine/fold, MIT). Our interchange
// format at every module boundary (ARCHITECTURE.md §7). We implement the small
// subset we need from the spec rather than depend on a library.

import { type Vec, applyAffine, det, near, onSegment } from "./geom.ts";
import { type FlatState, foldedPolygon } from "./state.ts";
import { convexOverlap } from "./geom.ts";

export type Assignment = "M" | "V" | "B" | "F" | "U";

export interface FoldFile {
  file_spec: number;
  file_creator: string;
  file_classes?: string[];
  frame_classes?: string[];
  frame_attributes?: string[];
  frame_title?: string;
  vertices_coords: number[][];
  edges_vertices: [number, number][];
  edges_assignment?: Assignment[];
  /** Degrees. Positive = valley, negative = mountain, 0 = flat (creased but unfolded). */
  edges_foldAngle?: number[];
  faces_vertices?: number[][];
  /** [f, g, s]: s = +1 if face f lies on the side of face g that g's normal points to. */
  faceOrders?: [number, number, 1 | -1][];
}

export function validateFold(f: unknown): string[] {
  const errs: string[] = [];
  if (typeof f !== "object" || f === null) return ["not an object"];
  const o = f as Record<string, unknown>;
  const vc = o.vertices_coords;
  const ev = o.edges_vertices;
  if (!Array.isArray(vc)) errs.push("vertices_coords missing");
  if (!Array.isArray(ev)) errs.push("edges_vertices missing");
  if (errs.length) return errs;
  const nv = (vc as unknown[]).length;
  (ev as unknown[]).forEach((e, i) => {
    if (!Array.isArray(e) || e.length !== 2 || !e.every((v) => Number.isInteger(v) && v >= 0 && v < nv)) {
      errs.push(`edges_vertices[${i}] is not a pair of vertex indices`);
    }
  });
  const ea = o.edges_assignment;
  if (ea !== undefined) {
    if (!Array.isArray(ea) || ea.length !== (ev as unknown[]).length) errs.push("edges_assignment length differs from edges_vertices");
    else ea.forEach((a, i) => {
      if (!["M", "V", "B", "F", "U"].includes(a as string)) errs.push(`edges_assignment[${i}] = ${String(a)}`);
    });
  }
  return errs;
}

interface Seg {
  a: Vec;
  b: Vec;
  faces: number[];
}

/**
 * The crease pattern of a state: every face edge in paper coordinates, split
 * at T-junctions, with assignment and fold angle read from the folded state.
 */
export function creasePattern(state: FlatState, title = "crease pattern"): FoldFile {
  // Vertices: all polygon corners, merged.
  const verts: Vec[] = [];
  const vid = (p: Vec): number => {
    for (let i = 0; i < verts.length; i++) if (near(verts[i]!, p, 1e-7)) return i;
    verts.push(p);
    return verts.length - 1;
  };
  for (const f of state.faces) for (const p of f.paper) vid(p);

  // Edges: split each polygon edge at any vertex lying on it.
  const edgeMap = new Map<string, Seg & { i: number; j: number; tag: { kind: string; made?: "M" | "V" } }>();
  const facesVerts: number[][] = [];
  for (const f of state.faces) {
    const loop: number[] = [];
    for (let k = 0; k < f.paper.length; k++) {
      const a = f.paper[k]!;
      const b = f.paper[(k + 1) % f.paper.length]!;
      const on = verts
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => onSegment(a, b, v) && !near(v, b, 1e-7))
        .map(({ v, i }) => ({ i, t: (v[0] - a[0]) * (b[0] - a[0]) + (v[1] - a[1]) * (b[1] - a[1]) }))
        .sort((x, y) => x.t - y.t)
        .map((x) => x.i);
      const ib = vid(b);
      const chain = [...on, ib];
      for (let c = 0; c < chain.length - 1; c++) {
        const i = chain[c]!;
        const j = chain[c + 1]!;
        const key = i < j ? `${i},${j}` : `${j},${i}`;
        const seg = edgeMap.get(key);
        if (seg) seg.faces.push(f.id);
        else edgeMap.set(key, { a: verts[i]!, b: verts[j]!, i, j, faces: [f.id], tag: f.tags[k]! });
      }
      loop.push(...on);
    }
    facesVerts.push(loop);
  }

  const byId = new Map(state.faces.map((f) => [f.id, f]));
  const edges: [number, number][] = [];
  const assign: Assignment[] = [];
  const angle: number[] = [];
  for (const seg of edgeMap.values()) {
    edges.push([seg.i, seg.j]);
    if (seg.tag.kind === "boundary" || seg.faces.length < 2) {
      assign.push("B");
      angle.push(0);
      continue;
    }
    const f = byId.get(seg.faces[0]!)!;
    const g = byId.get(seg.faces[1]!)!;
    const flat = f.T.every((v, k) => Math.abs(v - g.T[k]!) < 1e-7);
    if (flat) {
      assign.push(seg.tag.made ?? "F");
      angle.push(0);
    } else {
      // Folded 180°: front-to-front (valley) iff the lower face shows its front.
      const lower = f.z < g.z ? f : g;
      const a: Assignment = det(lower.T) > 0 ? "V" : "M";
      assign.push(a);
      angle.push(a === "V" ? 180 : -180);
    }
  }

  return {
    file_spec: 1.2,
    file_creator: "origami-compiler",
    file_classes: ["singleModel"],
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    frame_title: title,
    vertices_coords: verts.map((v) => [v[0], v[1]]),
    edges_vertices: edges,
    edges_assignment: assign,
    edges_foldAngle: angle,
    faces_vertices: facesVerts,
  };
}

/** The folded form: same topology as the crease pattern, folded coordinates, plus faceOrders. */
export function foldedForm(state: FlatState, title = "folded form"): FoldFile {
  const cp = creasePattern(state, title);
  const folded: number[][] = cp.vertices_coords.map(() => [0, 0]);
  const seen = new Set<number>();
  state.faces.forEach((f, fi) => {
    for (const v of cp.faces_vertices![fi]!) {
      if (seen.has(v)) continue;
      seen.add(v);
      const p = applyAffine(f.T, cp.vertices_coords[v] as unknown as Vec);
      folded[v] = [p[0], p[1]];
    }
  });
  const orders: [number, number, 1 | -1][] = [];
  const polys = state.faces.map(foldedPolygon);
  for (let i = 0; i < state.faces.length; i++) {
    for (let j = i + 1; j < state.faces.length; j++) {
      if (!convexOverlap(polys[i]!, polys[j]!)) continue;
      const f = state.faces[i]!;
      const g = state.faces[j]!;
      // Viewer looks down -z; a face's normal points to +z when it shows its front.
      const gUp = det(g.T) > 0;
      const fAbove = f.z > g.z;
      orders.push([i, j, fAbove === gUp ? 1 : -1]);
    }
  }
  return { ...cp, frame_classes: ["foldedForm"], vertices_coords: folded, faceOrders: orders };
}
