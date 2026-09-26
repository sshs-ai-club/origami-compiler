// Global flat-foldability and layer order, via flat-folder (vendor/flat-folder,
// MIT, Akitaya–Demaine–Ku facewise conditions). This is the engine's answer to
// "does this crease pattern fold flat, and how are the layers stacked?" for
// ANY crease pattern — unlike the global stack rank in state.ts, which only
// covers states we built by simple folds.
//
// Creases may be "U" (unassigned): flat-folder treats them as folded and the
// solver chooses mountain or valley. The first solution is read back as a
// complete M/V assignment plus FOLD faceOrders.
//
// The pipeline mirrors flat-folder's own headless batch path (src/batch.js,
// process_file) step for step.

import { CON } from "../vendor/flat-folder/constraints.js";
import { X } from "../vendor/flat-folder/conversion.js";
import { M } from "../vendor/flat-folder/math.js";
import { NOTE } from "../vendor/flat-folder/note.js";
import { SOLVER } from "../vendor/flat-folder/solver.js";
import type { Assignment, FoldFile } from "./foldfile.ts";
import { localFlatFoldability } from "./local.ts";

type Pt = [number, number];

export type FlatFoldResult =
  | {
      ok: true;
      /** Number of distinct flat-folded states (up to the per-component limit). */
      states: bigint;
      /** Independent components the solver split the layer variables into. */
      components: number;
      /** The crease pattern with every crease assigned M or V (first solution). */
      cp: FoldFile;
      /** The folded form of the first solution, with faceOrders. */
      folded: FoldFile;
    }
  | { ok: false; stage: "input" | "local" | "precision" | "assignment" | "layers"; reason: string };

let built = false;

export function solveFlatFold(input: FoldFile, opts: { limit?: number } = {}): FlatFoldResult {
  NOTE.show = false;
  if (!built) {
    CON.build(); // constraint implication maps, computed once
    built = true;
  }
  const lim = opts.limit ?? 1;

  // --- crease pattern: drop flat (unfolded) edges, they take no part in the folded state
  const keep = input.edges_vertices.map((_, i) => (input.edges_assignment?.[i] ?? "U") !== "F");
  if (input.faces_vertices && keep.some((k) => !k)) {
    return { ok: false, stage: "input", reason: "flat (F) edges with faces_vertices given: remove them before solving" };
  }
  // flat-folder never checks Kawasaki (it builds folded coordinates along a
  // spanning tree), so a locally unfoldable vertex must be caught here.
  const local = localFlatFoldability(input);
  if (local.length) {
    const v = local[0]!;
    return { ok: false, stage: "local", reason: `${local.length} vertex(es) not locally flat-foldable, e.g. at (${v.coords.map((c) => c.toFixed(3)).join(", ")})` };
  }
  const V = input.vertices_coords.map((p) => [p[0]!, p[1]!] as Pt);
  // flat-folder stores every edge as (smaller, larger) vertex index.
  const EV = input.edges_vertices.filter((_, i) => keep[i]).map(([a, b]) => (a < b ? [a, b] : [b, a]) as [number, number]);
  let EA: string[] = input.edges_assignment ? input.edges_assignment.filter((_, i) => keep[i]) : EV.map(() => "U");
  let FV: number[][];
  if (input.faces_vertices) {
    FV = input.faces_vertices.map((f) => [...f]);
    // FOLD's front side is the counter-clockwise one. A file given clockwise is seen from the back: swap M/V.
    if (M.polygon_area2(M.expand(FV[0]!, V)) < 0) {
      for (const F of FV) F.reverse();
      EA = EA.map((a) => (a === "M" ? "V" : a === "V" ? "M" : a));
    }
  } else {
    // Faces we build ourselves: assignments are already relative to the viewer; only fix the winding.
    [, FV] = X.V_EV_2_VV_FV(V, EV);
    for (const F of FV) if (M.polygon_area2(M.expand(F, V)) < 0) F.reverse();
  }
  let [EF, FE] = X.EV_FV_2_EF_FE(EV, FV);
  if (FV.length > 1) FV = FV.filter((_, i) => !FE[i]!.every((e) => EA[e] === "B")); // drop the outer face
  if (FV.length !== FE.length) [EF, FE] = X.EV_FV_2_EF_FE(EV, FV);
  for (const [i, F] of EF.entries()) if (F.length === 1) EA[i] = "B";

  // --- folded geometry and the overlap structure
  const [Vf, Ff] = X.V_FV_EV_EA_2_Vf_Ff(V, FV, EV, EA);
  if (Vf.some((p) => p === undefined)) return { ok: false, stage: "input", reason: "crease pattern is not connected" };
  const L = EV.map((P) => M.expand(P, Vf) as unknown as [Pt, Pt, string]);
  const [P, SP, SE] = X.L_2_V_EV_EL(L);
  if (P.length === 0) return { ok: false, stage: "precision", reason: "could not find a stable folded arrangement (precision)" };
  const [, CP] = X.V_EV_2_VV_FV(P, SP as [number, number][]);
  const [SC] = X.EV_FV_2_EF_FE(SP as [number, number][], CP);
  const [CF, FC] = X.EF_FV_P_SP_SE_CP_SC_2_CF_FC(EF, FV, P, SP, SE, CP, SC);
  const BF = X.EF_SP_SE_CP_CF_2_BF(EF, SP, SE, CP, CF);
  const BI = new Map<string, number>();
  for (const [i, F] of BF.entries()) BI.set(F, i);
  const BT = X.BF_BI_EF_SE_CF_SC_2_BT(BF, BI, EF, SE, CF, SC);
  const CC = X.FC_BF_BI_BT_2_CC(FC, BF, BI, BT);

  // --- solve
  const BA0 = SOLVER.EF_EA_Ff_BF_BI_2_BA0(EF, EA, Ff, BF, BI);
  const trans = { all: 0, reduced: 0 };
  const out = SOLVER.initial_assignment(BA0, BF, BT, BI, FC, CF, CC, trans);
  if (out.length === 3 && Array.isArray(out[1])) {
    const [type, faces] = out as [number, number[], number[]];
    return { ok: false, stage: "assignment", reason: `unable to resolve ${CON.names[type]} on faces [${faces.join(", ")}]` };
  }
  const BA = out as number[];
  const GB = SOLVER.get_components(BI, BF, BT, BA, FC, CF, CC, trans);
  const GA = SOLVER.solve(BI, BF, BT, BA, GB, FC, CF, CC, lim);
  if (typeof GA === "number") return { ok: false, stage: "layers", reason: `no consistent layer order for component ${GA}` };
  const states = GA.reduce((s, A) => s * BigInt(A.length), 1n);

  // --- read back the first solution: face orders, then M/V from the order of each crease's two faces
  const edges = X.BF_GB_GA_GI_2_edges(BF, GB, GA, GB.map(() => 0));
  const above = new Set(edges);
  const assign: Assignment[] = EA.map((a, i) => {
    if (a === "B") return "B";
    const [f1, f2] = M.decode(M.encode_order_pair(EF[i]!)) as [number, number];
    const o = above.has(M.encode([f1, f2])) ? 1 : 2;
    return (o === 2) !== Ff[f1] ? "M" : "V";
  });
  const base = { file_spec: 1.2, file_creator: "origami-compiler (flat-folder)", edges_vertices: EV, faces_vertices: FV };
  return {
    ok: true,
    states,
    components: GB.length,
    cp: { ...base, frame_classes: ["creasePattern"], vertices_coords: V, edges_assignment: assign, edges_foldAngle: assign.map((a) => (a === "V" ? 180 : a === "M" ? -180 : 0)) },
    folded: { ...base, frame_classes: ["foldedForm"], vertices_coords: Vf, edges_assignment: assign, faceOrders: X.edges_Ff_2_FO(edges, Ff) },
  };
}

/**
 * A FOLD crease pattern from line segments that may cross or overlap: the
 * arrangement is planarised (flat-folder's L_2_V_EV_EL). A split edge keeps
 * the first non-flat assignment of the lines it came from.
 */
export function foldFromLines(lines: readonly [Pt, Pt, Assignment][]): FoldFile {
  const L = lines.map(([p, q, a]) => [p, q, a] as [Pt, Pt, string]);
  const [V, EV, EL] = X.L_2_V_EV_EL(L);
  if (V.length === 0) throw new Error("could not planarise the lines (precision)");
  const EA = EL.map((ls) => (ls.map((l) => L[l]![2]).find((a) => a !== "F") ?? "F") as Assignment);
  return { file_spec: 1.2, file_creator: "origami-compiler", frame_classes: ["creasePattern"], vertices_coords: V, edges_vertices: EV, edges_assignment: EA };
}
