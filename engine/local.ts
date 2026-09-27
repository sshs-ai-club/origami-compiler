// Local (single-vertex) flat-foldability: Kawasaki and Maekawa (MATH.md §1).
//
// Necessary, not sufficient. Never report a pattern "flat-foldable" from
// these alone (engine/README.md, warning 1).

import type { FoldFile } from "./foldfile.ts";

export interface VertexViolation {
  vertex: number;
  coords: [number, number];
  kawasaki: number; // |alternating angle sum| in radians
  maekawa: number; // |#M - #V|
}

/**
 * Check every interior vertex, considering only creases that are actually
 * folded (fold angle ±180, or M/V/U when no angles are given). Unfolded
 * precreases do not take part in the folded state, so they are skipped.
 * Unassigned (U) creases count for Kawasaki; Maekawa is checked only at
 * vertices whose creases are all assigned.
 */
export function localFlatFoldability(cp: FoldFile, tol = 1e-6): VertexViolation[] {
  const incident = new Map<number, { angle: number; a: "M" | "V" | "U" }[]>();
  const boundary = new Set<number>();
  cp.edges_vertices.forEach(([u, v], i) => {
    const as = cp.edges_assignment?.[i] ?? "U";
    if (as === "B") {
      boundary.add(u);
      boundary.add(v);
      return;
    }
    const fa = cp.edges_foldAngle?.[i];
    const folded = fa === undefined ? as === "M" || as === "V" || as === "U" : Math.abs(Math.abs(fa) - 180) < 1e-6;
    if (!folded || (as !== "M" && as !== "V" && as !== "U")) return;
    for (const [p, q] of [
      [u, v],
      [v, u],
    ] as const) {
      const a = cp.vertices_coords[p]!;
      const b = cp.vertices_coords[q]!;
      const list = incident.get(p) ?? [];
      list.push({ angle: Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!), a: as });
      incident.set(p, list);
    }
  });

  const out: VertexViolation[] = [];
  for (const [v, list] of incident) {
    if (boundary.has(v)) continue;
    list.sort((x, y) => x.angle - y.angle);
    let alt = 0;
    for (let i = 0; i < list.length; i++) {
      const next = list[(i + 1) % list.length]!;
      let sector = next.angle - list[i]!.angle;
      if (sector <= 0) sector += 2 * Math.PI;
      alt += i % 2 === 0 ? sector : -sector;
    }
    const m = list.filter((e) => e.a === "M").length;
    const vv = list.filter((e) => e.a === "V").length;
    const assigned = m + vv === list.length;
    const kaw = list.length % 2 === 1 ? Math.PI : Math.abs(alt);
    const mae = Math.abs(m - vv);
    if (kaw > tol || (assigned && mae !== 2)) {
      const c = cp.vertices_coords[v]!;
      out.push({ vertex: v, coords: [c[0]!, c[1]!], kawasaki: kaw, maekawa: mae });
    }
  }
  return out;
}
