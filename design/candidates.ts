// DesignSpec -> ranked candidates, each with an honest step estimate.
//
// What a v0 candidate is: a stick figure, a verified grid packing of it, and a
// step estimate. What it is NOT yet: a crease pattern. Molecule filling
// (packing -> creases) is Plan B / M5 work and is not implemented, so
// `base_cp` is null and `cp_status` says why. The UI must show this.

import type { DesignSpec } from "../intent/spec.ts";
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
  base_cp: null;
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
const CP_STATUS = "not generated: molecule filling (packing -> crease pattern) is not implemented yet (PLANS.md Plan B, ROADMAP M5)";

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
        base_cp: null,
        cp_status: CP_STATUS,
        shaping_plan: tree.shaping,
        est_steps: est,
        paper_spec: { size_cm: size, grid_n: N, sheet: "square", grid_square_cm: size ? Math.round((size / N) * 100) / 100 : null },
        within_budget: within,
        confidence: best.scale >= 1 ? 0.3 : 0.1,
        notes,
      } });
    }
  });

  // Requested detail level first, then the most paper-efficient packing.
  found.sort((a, b) => a.rank - b.rank || b.c.packing.scale - a.c.packing.scale);
  return { route: r, candidates: found.slice(0, maxCandidates).map((x) => x.c), rejected };
}
