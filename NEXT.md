# NEXT — 2026-10-20, autopilot run "M4a collapse feasibility spike"

**Branch:** `claude/collapse-sequence` (local only, not pushed; cut from `main` at cf4c588). Autopilot state: `RUN.md`.

## Done
- AGENTS.md, PLAN.md, NEXT.md, DECISIONS.md, scripts/check.sh are now tracked (eb2c31f, 72f437d).
- P1 `verifyStage` / `isChain` (f2d09a1); P2a `findCollapse` over role/component groups (626f178); P2b `closeStage`, per-line candidates, `closeUnions` option (0b50c17). 145 tests, `scripts/check.sh` green.
- Decision entry 2026-10-20 in docs/decisions.md (mirrored in DECISIONS.md), README row, ROADMAP gap row.

## Result of the spike (reproduced by the integrator)
- Lang 6×6 (151 M/V creases, 53 lines): no staged chain. Coarse groups: none of 16 verifies alone. Per-line closures (add all incident creases at failing vertices): all 53 grow to the full 151.
- Known-answer control (4×4, three parallel full-width creases M,V,M) gives a 3-stage chain.
- Not shown: that SIX has no staged collapse. The closure rule is crude.
- Likely deeper cause: real collapse folds creases partially and simultaneously; "some creases fully folded, rest flat" cannot express it.

## Verified / Unverified
- Verified: `scripts/check.sh` green after each merge; SIX outcome reproduced with `npx vitest run sequencer/collapse.test.ts --reporter=verbose`.
- Unverified: motion between stages (by design); reviewer verdict on the merged diff (see RUN.md); nothing run in Origami Simulator.

## Decisions made
- docs/decisions.md 2026-10-20 (stage model, labels, negative first result).

## Next step
Choose: (a) one cheap last try on this model (minimal closure, seeds = flap or hinge+ridge pair), or (b) switch to a model with per-crease fold progress (rigid folding, Origami Simulator-style) for collapse, with flat-folder still the verdict on the end state. Recommendation in the recap.

## Manual steps for me
1. Decide A/B/C hand-off in the recap (PR needs your OK; nothing pushed).
2. Origami Simulator reproduction of the failing fold is yours if you want it as evidence.

## Files to read next session
- RUN.md, docs/decisions.md (last entry), sequencer/collapse.ts header.

## Open questions and blockers
- Collapse model choice (above). Player (`OpKeyframe`) has no collapse kind; waits for a verified sequence.
- Earlier open items from design-open-items stay (asymmetric packing, level shifters, hintbench --slow re-run).
