// Blueprint -> verified crease pattern.
//
// What is implemented: take BP Studio's hinges and ridges as unassigned
// creases, check every vertex (Kawasaki), and hand the pattern to flat-folder,
// which either proves it folds flat — returning the mountain/valley
// assignment and layer order — or says why not.
//
// What is NOT implemented yet: completion. When flap regions leave paper
// between them (almost every real design), the leftover paper needs further
// creases — Lang's elevation / axial-parallel creases (Origami Design
// Secrets, 2nd ed., ch. 13–14; Lang & Tsai, GOPS, OSME 7). Until that exists,
// such designs come back "incomplete" with the vertices that still fail, and
// nothing downstream may pretend otherwise.

import { foldFromLines, solveFlatFold } from "../engine/flatfold.ts";
import type { FoldFile } from "../engine/foldfile.ts";
import type { Vec } from "../engine/geom.ts";
import { localFlatFoldability } from "../engine/local.ts";
import type { Blueprint } from "./blueprint.ts";

export type CreasePatternResult =
  | {
      status: "verified";
      /** Every crease assigned M or V by flat-folder. */
      cp: FoldFile;
      folded: FoldFile;
      /** Distinct flat-folded states found (at least 1; capped by the search limit). */
      states: string;
    }
  | {
      status: "incomplete";
      /** The blueprint as a crease pattern, creases unassigned. */
      cp: FoldFile;
      /** Vertices (unit-square coordinates) that are not locally flat-foldable. */
      violations: Vec[];
      reason: string;
    };

export function creasePatternFromBlueprint(bp: Blueprint): CreasePatternResult {
  const cp = foldFromLines(bp.lines.map((l) => [l.a as [number, number], l.b as [number, number], l.role === "border" ? "B" : "U"]));
  const violations = localFlatFoldability(cp).map((v) => v.coords as Vec);
  if (violations.length) {
    return {
      status: "incomplete",
      cp,
      violations,
      reason: `${violations.length} vertices need creases the blueprint does not have (the paper between flaps is not yet filled; completion is not implemented)`,
    };
  }
  const r = solveFlatFold(cp);
  if (!r.ok) return { status: "incomplete", cp, violations: [], reason: `flat-folder: ${r.reason}` };
  return { status: "verified", cp: r.cp, folded: r.folded, states: r.states.toString() };
}
