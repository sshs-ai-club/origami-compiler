// DesignSpec -> ranked candidates, each with an honest step estimate.
//
// A candidate is a stick figure, a verified grid packing of it, BP Studio's
// box-pleating layout of that packing, and a step estimate. It carries a
// crease pattern (`base_cp`) only when flat-folder has verified one; otherwise
// `base_cp` is null and `crease_pattern` says which vertices are unfinished.
// The UI must show which.

import type { FoldFile } from "../engine/foldfile.ts";
import type { DesignSpec } from "../intent/spec.ts";
import { type Blueprint, layoutBlueprint } from "./blueprint.ts";
import { type CreasePatternResult, creasePatternFromBlueprint } from "./complete.ts";
import { type StepEstimate, estimateSteps } from "./estimate.ts";
import { type Packing, type Symmetry, packTree } from "./packing.ts";
import { type Route, route } from "./router.ts";
import { type FlapTree, type ShapingOp, leaves } from "./tree.ts";

export interface Candidate {
  id: string;
  tier: 1;
  family: "box_pleat";
  subject: string;
  variant: string;
  flaps: number;
  tree: FlapTree;
  packing: Packing;
  /** BP Studio's layout: hinges, ridges, border. */
  blueprint: Blueprint;
  crease_pattern: CreasePatternResult;
  /** The flat-folder-verified crease pattern, or null. */
  base_cp: FoldFile | null;
  cp_status: string;
  shaping_plan: ShapingOp[];
  est_steps: StepEstimate;
  paper_spec: { size_cm: number | null; grid_n: number; sheet: "square"; grid_square_cm: number | null };
  /** null when the user gave no budget. */
  within_budget: boolean | null;
  /** Foldability confidence, 0..1. Low until crease patterns are generated and verified. */
  confidence: number;
  notes: string[];
}

export interface DesignResult {
  route: Route;
  candidates: Candidate[];
  rejected: { id: string; reason: string }[];
}

const DEFAULT_GRIDS = [16, 24, 32];
const SYMMETRIES: Symmetry[] = ["diagonal", "book"];

export function generateCandidates(spec: DesignSpec, trees: FlapTree[], maxCandidates = 4): DesignResult {
  const r = route(spec, trees.length > 0);
  const rejected: DesignResult["rejected"] = [];
  if (!r.supported || trees.length === 0) return { route: r, candidates: [], rejected };

  const grids = spec.sheet.grid_n ? [spec.sheet.grid_n] : DEFAULT_GRIDS;
  const budget = spec.step_budget;
  // "About 200" tolerates a little slack; "under 200" does not.
  const limit = budget ? (budget.approximate ? Math.round(budget.max * 1.1) : budget.max) : Infinity;

  const found: { rank: number; c: Candidate }[] = [];
  trees.forEach((tree, rank) => {
    for (const N of grids) {
      const id = `${tree.subject}_${tree.variant}_g${N}`;
      // Prune on the cheap estimate before the expensive packing search (ARCHITECTURE.md §5).
      const est = estimateSteps(tree, N);
      const within = budget ? est.total <= limit : null;
      if (within === false) {
        rejected.push({ id, reason: `estimated ${est.total} steps > budget ${budget!.max}${budget!.approximate ? " (+10% for 'about')" : ""}` });
        continue;
      }
      let best: Packing | null = null;
      for (const sym of SYMMETRIES) {
        const p = packTree(tree, N, sym);
        if (p && (!best || p.scale > best.scale)) best = p;
      }
      if (!best) {
        rejected.push({ id, reason: `no symmetric grid packing on ${N}×${N}` });
        continue;
      }
      const blueprint = layoutBlueprint(tree, best);
      const crease_pattern = creasePatternFromBlueprint(blueprint);
      const verified = crease_pattern.status === "verified";
      const notes: string[] = [];
      if (best.budget_hit) notes.push("packing search hit its node budget; a slightly larger scale may exist");
      if (best.scale < 1) notes.push(`flaps are under one grid square per tree unit (scale ${best.scale.toFixed(2)}): too fine to fold on ${N}×${N}`);
      if (budget && est.total > budget.max) notes.push(`${est.total} is slightly over ${budget.max}, allowed because the budget was approximate`);
      const size = spec.sheet.size_cm;
      found.push({ rank, c: {
        id,
        tier: 1,
        family: "box_pleat",
        subject: tree.subject,
        variant: tree.variant,
        flaps: leaves(tree).length,
        tree,
        packing: best,
        blueprint,
        crease_pattern,
        base_cp: verified ? crease_pattern.cp : null,
        cp_status: verified
          ? `verified by flat-folder (${crease_pattern.states === "1" ? "at least one" : crease_pattern.states} flat-folded state${crease_pattern.states === "1" ? "" : "s"})`
          : `incomplete: ${crease_pattern.reason}`,
        shaping_plan: tree.shaping,
        est_steps: est,
        paper_spec: { size_cm: size, grid_n: N, sheet: "square", grid_square_cm: size ? Math.round((size / N) * 100) / 100 : null },
        within_budget: within,
        confidence: verified ? 0.6 : best.scale >= 1 ? 0.3 : 0.1,
        notes,
      } });
    }
  });

  // Requested detail level first, then paper efficiency: flap length as a fraction of the
  // sheet (scale / N; scale alone grows with N). Within 2%, the coarser grid wins —
  // bigger squares, fewer steps, same model.
  const eff = (c: Candidate) => c.packing.scale / c.paper_spec.grid_n;
  found.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ea = eff(a.c), eb = eff(b.c);
    if (Math.abs(ea - eb) > 0.02 * Math.max(ea, eb)) return eb - ea;
    return a.c.paper_spec.grid_n - b.c.paper_spec.grid_n;
  });
  return { route: r, candidates: found.slice(0, maxCandidates).map((x) => x.c), rejected };
}
