// Stage 2a: classify the request and route it to a design family (GOAL.md §2).
// The verdict and its confidence must reach the user.

import type { DesignSpec } from "../intent/spec.ts";
import { SUBJECTS } from "../intent/vocabulary.ts";

export interface Route {
  tier: 1 | 2 | 3 | 4 | null;
  family: "box_pleat" | "rotational_sweep" | "surface_approximation" | "none";
  confidence: number;
  reason: string;
  /** Whether this build can produce candidates for the route. */
  supported: boolean;
}

export function route(spec: DesignSpec, hasTree = false): Route {
  const subj = SUBJECTS.find((s) => s.key === spec.target);
  if (!subj) {
    if (hasTree) return { tier: 1, family: "box_pleat", confidence: 0.5, reason: "Unknown subject, but a stick figure was proposed for it, so it is treated as tree-like.", supported: true };
    return { tier: null, family: "none", confidence: 0, reason: "Unknown subject and no stick figure: nothing to route.", supported: false };
  }
  switch (subj.tier) {
    case 1:
      return { tier: 1, family: "box_pleat", confidence: 0.8, reason: `A ${subj.key.replace("_", " ")} is tree-like (limbs and flaps): stick figure → grid packing.`, supported: true };
    case 2:
      return { tier: 2, family: "rotational_sweep", confidence: 0.7, reason: "Axisymmetric forms use a rotational sweep (Mitani / ORI-REVO). Not implemented yet.", supported: false };
    case 3:
      return {
        tier: 3,
        family: "surface_approximation",
        confidence: 0.7,
        reason: "Arbitrary surfaces need Origamizer-style surface approximation. That yields a collapse, not a step-by-step sequence, and is not implemented.",
        supported: false,
      };
    default:
      return { tier: 4, family: "none", confidence: 0.6, reason: "Out of reach for single-sheet origami.", supported: false };
  }
}
