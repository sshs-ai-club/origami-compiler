// Step estimate before sequencing (ARCHITECTURE.md §5):
//
//   est_steps = precrease(N) + collapse(F) + shaping(S)
//
// precrease(N) is exact: it is the panel count of the planner in
// sequencer/precrease.ts. The collapse and shaping constants are
// PLACEHOLDERS until Milestone 2 fits them against the data/ corpus. Every
// estimate carries that label so no UI can present it as measured.

import { precreasePanels } from "../sequencer/precrease.ts";
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
  const collapse = CONSTANTS.collapse_base + CONSTANTS.c1_per_flap * F;
  const shaping = CONSTANTS.c2_per_shaping_op * S;
  return {
    total: precrease + collapse + shaping,
    precrease,
    collapse,
    shaping,
    basis: { precrease: "exact (planner)", collapse: CONSTANTS.status, shaping: CONSTANTS.status },
  };
}
