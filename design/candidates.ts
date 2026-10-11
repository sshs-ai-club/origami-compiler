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
import { type BoxPleatResult, boxPleatFromGrid, gridTree } from "./boxpleat.ts";
import { type StepEstimate, estimateSteps } from "./estimate.ts";
import { precreaseBase } from "../sequencer/precrease.ts";
import { type IntegerPacking, type Packing, type Symmetry, edgeLabel, packTree, packTreeInteger, withLengths } from "./packing.ts";
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
  /** Whole-square edge lengths (aligned with tree.edges) the packing was built from; absent for a real-valued packing. */
  lengths?: number[];
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
      let best: IntegerPacking | null = null;
      for (const sym of SYMMETRIES) {
        const p = packTreeInteger(tree, N, sym);
        if (p && (!best || p.scale > best.scale)) best = p;
      }
      // No integer layout (e.g. a flap under one square): fall back to the real-valued packing.
      let legacy: Packing | null = null;
      if (!best) {
        for (const sym of SYMMETRIES) {
          const p = packTree(tree, N, sym);
          if (p && (!legacy || p.scale > legacy.scale)) legacy = p;
        }
      }
      if (!best && !legacy) {
        rejected.push({ id, reason: `no symmetric grid packing on ${N}×${N}` });
        continue;
      }
      const packing: Packing = (best ?? legacy)!;
      const notes: string[] = [];
      if (best) notes.push(...roundingNotes(best.rounded, best.inflated, best.target_scale));
      else notes.push("no whole-square layout found; using the real-valued packing, whose lengths are rounded when the crease pattern is built");
      if (packing.budget_hit) notes.push("packing search hit its node budget; a slightly larger scale may exist");
      if (packing.scale < 1) notes.push(`flaps are under one grid square per tree unit (scale ${packing.scale.toFixed(2)}): too fine to fold on ${N}×${N}`);
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
        packing,
        lengths: best?.lengths,
        completion: null,
        base_cp: null,
        cp_status: "not completed yet",
        shaping_plan: tree.shaping,
        est_steps: est,
        paper_spec: { size_cm: size, grid_n: N, sheet: "square", grid_square_cm: size ? Math.round((size / N) * 100) / 100 : null },
        within_budget: within,
        confidence: packing.scale >= 1 ? 0.3 : 0.1,
        notes,
      } });
    }
  });

  // Requested detail level first, then paper efficiency: flap length as a fraction of the
  // sheet (scale / N; scale alone grows with N). Within 2%, the coarser grid wins —
  // bigger squares, fewer steps, same model.
  const eff = (c: Candidate) => realisedScale(c.tree, c.lengths, c.packing) / c.paper_spec.grid_n;
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
  const n = c.packing.grid_n;
  let packing = c.packing;
  let lengths = c.lengths;
  let notes = [...c.notes];
  let r: BoxPleatResult;
  if (lengths) {
    // Whole-square layout first: the tree already has integer lengths, so scale 1 changes nothing.
    r = boxPleatFromGrid(withLengths(c.tree, lengths), packing.positions, n, 1, { maxAttempts: opts.maxAttempts });
    if (r.status !== "verified") {
      // Retry with the legacy layout (real-valued packing, lengths rounded at its scale).
      const legacy = packTree(c.tree, n, packing.symmetry);
      const why = r.reason;
      if (legacy) {
        const r2 = boxPleatFromGrid(c.tree, legacy.positions, n, legacy.scale, { maxAttempts: opts.maxAttempts });
        if (r2.status === "verified") {
          r = r2;
          packing = legacy;
          lengths = undefined;
          const g = gridTree(c.tree, legacy.scale, legacy.positions);
          notes = notes.filter((x) => !x.startsWith(ROUNDING_PREFIX));
          notes.push(`whole-square layout did not complete (${why}); legacy layout used`);
          if (typeof g !== "string") {
            const changes = g.edges.map((e, i) => ({ edge: edgeLabel(c.tree, i), target: c.tree.edges[i]!.length * legacy.scale, length: e.length })).filter((x) => Math.abs(x.length - x.target) > 1e-6);
            notes.push(...roundingNotes(changes, [], legacy.scale));
          }
        } else notes.push(`whole-square layout did not complete (${why}); legacy layout did not either (${r2.reason})`);
      } else notes.push(`whole-square layout did not complete (${why}); no legacy layout exists`);
    } else notes.push("layout: whole-square edge lengths chosen together with the tip placement");
  } else {
    r = boxPleatFromGrid(c.tree, packing.positions, n, packing.scale, { maxAttempts: opts.maxAttempts });
  }
  if (r.status !== "verified") return { ...c, packing, lengths, notes, completion: r, base_cp: null, cp_status: `incomplete: ${r.reason}`, confidence: Math.min(c.confidence, 0.2) };
  const grown = Object.entries(r.expanded);
  if (grown.length) notes.push(`unused paper absorbed into ${grown.map(([f, k]) => `${f} (+${k} squares)`).join(", ")}: those flaps get extra layers, not extra length`);
  // With the base known, precreasing is exact: grid, half-grid lines, diagonals.
  const precrease = precreaseBase(n, r.lines).steps.length;
  const est_steps = { ...c.est_steps, precrease, total: c.est_steps.total - c.est_steps.precrease + precrease };
  return {
    ...c,
    packing,
    lengths,
    est_steps,
    within_budget: opts.stepLimit === undefined ? c.within_budget : est_steps.total <= opts.stepLimit,
    completion: r,
    base_cp: r.cp,
    cp_status: `verified by flat-folder (${r.states === "1" ? "at least one" : r.states} flat-folded state${r.states === "1" ? "" : "s"}); Lang's uniaxial box pleating, rooted at ${r.root}`,
    confidence: 0.6,
    notes,
  };
}

/**
 * Grid squares per tree unit actually achieved: whole-square edge length over tree length,
 * summed. (An integer packing's target scale is the low end of its rounding band, which
 * would penalise a layout like the crane's, where 7.5 rounds up to exactly 8.)
 */
function realisedScale(tree: FlapTree, lengths: number[] | undefined, packing: Packing): number {
  if (!lengths) return packing.scale;
  return lengths.reduce((s, l) => s + l, 0) / tree.edges.reduce((s, e) => s + e.length, 0);
}

const ROUNDING_PREFIX ="edge lengths rounded";

/** One note naming every edge whose whole-square length differs from the ideal (never a silent change). */
function roundingNotes(rounded: { edge: string; target: number; length: number }[], inflated: string[], scale: number): string[] {
  if (!rounded.length) return [];
  const parts = rounded.map((x) => `${x.edge} ${x.length} (asked ${x.target.toFixed(2)} at scale ${scale.toFixed(2)}${inflated.includes(x.edge) ? ", inflated into spare paper" : ""})`);
  return [`${ROUNDING_PREFIX} to whole grid squares: ${parts.join(", ")}`];
}

/** The step budget as a hard limit: "about N" tolerates 10%, "under N" does not. */
export function stepLimit(spec: DesignSpec): number {
  const b = spec.step_budget;
  return b ? (b.approximate ? Math.round(b.max * 1.1) : b.max) : Infinity;
}
