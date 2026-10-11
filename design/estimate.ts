// Step estimate before sequencing (ARCHITECTURE.md §5):
//
//   est_steps = precrease(N) + collapse(F) + shaping(S)
//
// precrease(N) is exact: it is the panel count of the planner in
// sequencer/precrease.ts. It stays the planner's count even once a fit exists:
// this estimate predicts OUR plan, whereas the fitted a*log2(N)+b of
// design/costmodel.ts predicts PUBLISHED panel counts.
//
// The collapse and shaping constants are PLACEHOLDERS until design/fitted.ts
// holds a fit on at least MIN_FIT_MODELS published sequences (Milestone 2);
// then selectConstants switches to the fitted values. Every estimate carries
// its basis so no UI can present a placeholder as measured.

import { precreasePanels } from "../sequencer/precrease.ts";
import type { FittedConstants } from "./costmodel.ts";
import { FITTED } from "./fitted.ts";
import { type FlapTree, leaves, shapingCount } from "./tree.ts";

export const CONSTANTS = {
  /** Panels to collapse the precreased grid into a base, independent of flap count. */
  collapse_base: 10,
  /** Panels per flap: forming, narrowing and thinning it. */
  c1_per_flap: 7,
  /** Panels per shaping operation. */
  c2_per_shaping_op: 2,
  status: "placeholder — not yet fitted (Milestone 2)",
} as const;

/** Below this many published sequences the fit is not trusted and placeholders stay. */
export const MIN_FIT_MODELS = 12;

export interface SelectedConstants {
  collapse_base: number;
  c1: number;
  c2: number;
  basis: string;
}

export function selectConstants(fitted: FittedConstants | null): SelectedConstants {
  if (fitted && fitted.n_models >= MIN_FIT_MODELS) {
    return { collapse_base: fitted.collapse_base, c1: fitted.c1, c2: fitted.c2, basis: `fitted on ${fitted.n_models} published sequences (${fitted.date})` };
  }
  return { collapse_base: CONSTANTS.collapse_base, c1: CONSTANTS.c1_per_flap, c2: CONSTANTS.c2_per_shaping_op, basis: CONSTANTS.status };
}

export interface StepEstimate {
  total: number;
  precrease: number;
  collapse: number;
  shaping: number;
  /** Which parts are exact and which are guesses. */
  basis: { precrease: "exact (planner)"; collapse: string; shaping: string };
}

export function estimateSteps(tree: FlapTree, gridN: number): StepEstimate {
  const F = leaves(tree).length;
  const S = shapingCount(tree);
  const precrease = precreasePanels(gridN);
  const k = selectConstants(FITTED);
  const collapse = Math.max(0, Math.round(k.collapse_base + k.c1 * F));
  const shaping = Math.max(0, Math.round(k.c2 * S));
  return {
    total: precrease + collapse + shaping,
    precrease,
    collapse,
    shaping,
    basis: { precrease: "exact (planner)", collapse: k.basis, shaping: k.basis },
  };
}
