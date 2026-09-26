# sequencer
**Owner: Person A** · Stage 4 · Difficulty: highest — NP-complete

Crease pattern -> an ordered sequence of steps, within a step budget.

**In:** flat-foldable `base_cp` (FOLD), step budget `B`
**Out:** `StepPlan` with `|steps| <= B`

## Responsibilities
- Search over fold sequences: A* or beam, using `engine/` as the expansion
  and validity oracle
- `g` = steps used so far; `h` = cost-model estimate of steps remaining
- **Hard budget as a pruning constraint**, not a post-hoc check
- Target similarity via Hausdorff distance (following Akitaya–Mitani 2013)
- `foldability_cost` heuristic: penalise folds through many layers, reward
  folds landing on existing reference points (cf. ReferenceFinder)
- Batch primitive operations into panels per the step-cost model

## Non-negotiable behaviours
- **Never hang.** Hard node budget. Always return the best partial plan found.
- **Never lie.** A partial plan is reported as partial, with the step at
  which it stalled.

## What you are up against
Simple foldability is **strongly NP-complete** for square paper with creases
at multiples of 45° — precisely the classical-origami case (Akitaya, Demaine
& Ku 2017). There is no complete polynomial algorithm to find. This module
is a heuristic by necessity, and that is the correct design, not a compromise.

## Scope
v1 sequences **simple folds only** on a flat-foldable base. The 3D shaping
tail is handled by a library, not by this search. See ARCHITECTURE.md §2.

## Out of scope
Rendering, view selection, step text.

## Status (v0)
`plan.ts` (StepPlan, `replay` = verification through the engine), `precrease.ts` (exact N×N grid precreasing for any N, see decisions.md), `library/dart.ts` (a complete authored sequence), `search.ts` (budgeted beam search over an abstract `Domain`, not yet used for origami). Collapse and shaping sequencing: not started.
