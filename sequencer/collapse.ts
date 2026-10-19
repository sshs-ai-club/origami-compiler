// Collapse stages: a crease pattern folded in nested stages, each stage being
// a subset of the verified pattern's creases.
//
// WARNING: flat-foldability of each stage is a NECESSARY condition only. A
// chain of flat-foldable stages does not mean the paper can move from one
// stage to the next without tearing or self-intersection. Motion between
// stages is NOT verified here.
//
// Each stage is checked by flat-folder (engine/flatfold.ts) on the sheet with
// only that stage's creases folded; every other crease is left flat ("F").
// The engine's global stack rank (engine/state.ts) is not used.

import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { solveFlatFold } from "../engine/flatfold.ts";

export type StageVerdict = { ok: true; states: bigint } | { ok: false; stage: string; reason: string };

export interface CollapseStage {
  /** Edge indices of the verified crease pattern that are folded in this stage. */
  creases: number[];
  verdict: StageVerdict;
}

/**
 * Is `subset` of the creases of `cp` flat-foldable on its own, with every
 * other crease left flat? Border edges stay borders. Never throws.
 */
export function verifyStage(cp: FoldFile, subset: readonly number[]): StageVerdict {
  try {
    const n = cp.edges_vertices.length;
    for (const i of subset) {
      if (!Number.isInteger(i) || i < 0 || i >= n) return { ok: false, stage: "input", reason: `crease index ${i} is not an edge of the pattern` };
    }
    const folded = new Set(subset);
    const src = cp.edges_assignment ?? cp.edges_vertices.map((): Assignment => "U");
    const edges_assignment = src.map((a, i): Assignment => (a === "B" ? "B" : folded.has(i) ? a : "F"));
    // Flat-folder drops F edges; a vertex left with no edge would make the
    // pattern look disconnected, so drop those vertices here and renumber.
    const live = cp.edges_vertices.map((_, i) => edges_assignment[i] !== "F");
    const used = new Set<number>();
    cp.edges_vertices.forEach(([a, b], i) => {
      if (live[i]) {
        used.add(a);
        used.add(b);
      }
    });
    const remap = new Map<number, number>();
    const vertices_coords: number[][] = [];
    cp.vertices_coords.forEach((p, v) => {
      if (used.has(v)) {
        remap.set(v, vertices_coords.length);
        vertices_coords.push(p);
      }
    });
    const stage: FoldFile = {
      file_spec: cp.file_spec,
      file_creator: cp.file_creator,
      frame_classes: ["creasePattern"],
      vertices_coords,
      edges_vertices: cp.edges_vertices.flatMap(([a, b], i) => (live[i] ? [[remap.get(a)!, remap.get(b)!] as [number, number]] : [])),
      edges_assignment: edges_assignment.filter((_, i) => live[i]),
    };
    const r = solveFlatFold(stage);
    return r.ok ? { ok: true, states: r.states } : { ok: false, stage: r.stage, reason: r.reason };
  } catch (e) {
    return { ok: false, stage: "input", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** True iff the creases of each stage are a subset of those of the next. */
export function isChain(stages: readonly CollapseStage[]): boolean {
  for (let i = 0; i + 1 < stages.length; i++) {
    const next = new Set(stages[i + 1]!.creases);
    if (!stages[i]!.creases.every((c) => next.has(c))) return false;
  }
  return true;
}
