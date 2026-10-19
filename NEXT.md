# NEXT — 2026-10-11, session "design open items (U1–U4)"

**Branch:** `claude/design-open-items` (16 commits ahead of `main`, pushed; PR https://github.com/sshs-ai-club/origami-compiler/pull/12 open, no CI checks configured). Agent worktrees removed; their 8 local branches (`claude/{integer-packing,step-cost-model,contour-parity,mv-hints}`, `worktree-agent-*`) still exist — delete only with sunwoo's OK.

## Done
- U1 integer-aware packing (Lang §13.2): bird 8 unused 29→15, dragon 16 43→20; fish layout-limited.
- U2 step-cost model infrastructure: corpus schema, phase-wise fit, leave-one-out report, ≥12 gate (`corpus report` → 0/20).
- U3 graded M/V hint ladder `lang → one → none` + `app/hintbench.ts`; only single-planar-edge "one" is proved.
- U4 contour parity is an invariant; false "needs a level shifter" message removed; real shifters deferred.
- vitest ignores `.claude/` worktrees; decisions.md (4 entries), README status, ROADMAP gap table.

## Verified / Unverified
- Verified (this wrapup): `npm run check` — 126 tests green, both typechecks.
- Verified (earlier): dragon 21×21 and "good looking horse" run end to end (horse: 16×16 refuted+reported, 24×24 verified).
- Fresh reviewer: ready, no blockers.
- Unverified: `hintbench --slow` rows with the edge-level "one"; planner's 3,687-layout parity sweep not re-run (tests sweep 587).

## Decisions made
- docs/decisions.md 2026-10-11: integer packing; contour parity invariant / level shifters deferred; step-cost model gating; graded M/V hints.

## Next step
Push the branch and open a PR to `main` (needs your OK), then choose the next milestone from ROADMAP "Where the pipeline stops today" — the step-by-step collapse sequence (M4) is the biggest gap for a foldable book.

## Manual steps for me
1. Review and merge PR #12 on GitHub. Expected: `main` gains the milestone; then `git switch main && git pull`.
2. Note: CLAUDE.md now includes `@AGENTS.md`, but AGENTS.md is in `.git/info/exclude` (local only), so collaborators get a dangling include. Commit AGENTS.md or keep it local — your call.
3. When ready: start transcribing published sequences into `data/sequences/` from `TEMPLATE.json` (rules in `data/README.md`); check with `npm run origami -- corpus validate` → "N of N valid".

## Files to read next session
- docs/ROADMAP.md ("Where the pipeline stops today")
- docs/decisions.md (four 2026-10-11 entries at the end)
- design/mvhints.ts header (proved vs empirical)

## Open questions and blockers
- Asymmetric packing (`symmetry: "none"`) for mirrored subjects: needs a decision.
- Level shifters wait for the plan-view midline axial.
- Large patterns that refute Lang's hint stay "not verified" (flat-folder has no time bound).
