// DesignSpec -> ranked candidates, each with an honest step estimate.
//
// A candidate is a stick figure, a verified grid packing of it, and a step
// estimate. Completing it into a crease pattern (design/boxpleat.ts, Lang's
// uniaxial box pleating) is a separate, slower step — completeCandidate —
// because every result goes through flat-folder. A candidate carries a
// crease pattern (`base_cp`) only when flat-folder has verified one; the UI
// must show which.

import type { FoldFile } from "../engine/foldfile.ts";
import type { DesignSpec } from "../intent/spec.ts";
import { type BoxPleatResult, boxPleatFromGrid } from "./boxpleat.ts";
import { type StepEstimate, estimateSteps } from "./estimate.ts";
import { precreaseBase } from "../sequencer/precrease.ts";
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
  /** Box-pleat completion (design/boxpleat.ts); null until completeCandidate runs. */
  completion: BoxPleatResult | null;
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
  const limit = stepLimit(spec);

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
        completion: null,
        base_cp: null,
        cp_status: "not completed yet",
        shaping_plan: tree.shaping,
        est_steps: est,
        paper_spec: { size_cm: size, grid_n: N, sheet: "square", grid_square_cm: size ? Math.round((size / N) * 100) / 100 : null },
        within_budget: within,
        confidence: best.scale >= 1 ? 0.3 : 0.1,
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

/**
 * Complete a candidate's packing into a crease pattern (Lang's uniaxial box
 * pleating) and verify it with flat-folder. Slow: seconds to minutes, almost
 * all of it in flat-folder's layer search.
 */
export function completeCandidate(c: Candidate, opts: { maxAttempts?: number; stepLimit?: number } = {}): Candidate {
  const r = boxPleatFromGrid(c.tree, c.packing.positions, c.packing.grid_n, c.packing.scale, { maxAttempts: opts.maxAttempts });
  if (r.status !== "verified") return { ...c, completion: r, base_cp: null, cp_status: `incomplete: ${r.reason}`, confidence: Math.min(c.confidence, 0.2) };
  const notes = [...c.notes];
  const grown = Object.entries(r.expanded);
  if (grown.length) notes.push(`unused paper absorbed into ${grown.map(([f, k]) => `${f} (+${k} squares)`).join(", ")}: those flaps get extra layers, not extra length`);
  // With the base known, precreasing is exact: grid, half-grid lines, diagonals.
  const precrease = precreaseBase(c.packing.grid_n, r.lines).steps.length;
  const est_steps = { ...c.est_steps, precrease, total: c.est_steps.total - c.est_steps.precrease + precrease };
  return {
    ...c,
    est_steps,
    within_budget: opts.stepLimit === undefined ? c.within_budget : est_steps.total <= opts.stepLimit,
    completion: r,
    base_cp: r.cp,
    cp_status: `verified by flat-folder (${r.states === "1" ? "at least one" : r.states} flat-folded state${r.states === "1" ? "" : "s"}); Lang's uniaxial box pleating, rooted at ${r.root}`,
    confidence: 0.6,
    notes,
  };
}

/** The step budget as a hard limit: "about N" tolerates 10%, "under N" does not. */
export function stepLimit(spec: DesignSpec): number {
  const b = spec.step_budget;
  return b ? (b.approximate ? Math.round(b.max * 1.1) : b.max) : Infinity;
}
