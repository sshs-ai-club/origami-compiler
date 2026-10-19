# RUN — M4a collapse feasibility spike (autopilot)

Layout note: `setups/autopilot/RUN.template.md` does not exist; this is the integrator's own layout (user OK, 2026-10-20).

## Goal
`sequencer/collapse.ts`: given a flat-folder-verified box-pleat crease pattern (first target: Lang's 6×6 `SIX`, design/boxpleat.test.ts), search for an ordered list of crease subsets S1 ⊂ S2 ⊂ … ⊂ all where **every intermediate crease pattern (creases in Si assigned M/V, the rest flat) is verified flat-foldable by flat-folder**. Result is either verified stages or an explicit "no sequence found, stopped at X". Never an unverified step.

Honest limit (must appear in code docs and result labels): flat-foldability of each intermediate is a necessary condition, not proof that a continuous folding motion exists between stages. Stage-to-stage motion is **unverified**.

## Success check
1. `scripts/check.sh` green (typecheck + all tests).
2. New tests written before code, hand-checked cases, all green.
3. `collapse` on `SIX` returns either a verified staged plan or a named failure; both are acceptable.
4. Fresh `reviewer` on the merged diff: ready, no blockers.

## Authorisation
- Yes recorded 2026-10-20 (sunwoo, in chat).
- Grants: local commits on `claude/collapse-sequence`; tracking PLAN.md, NEXT.md, DECISIONS.md, scripts/check.sh (removed from .git/info/exclude); browser on public pages (no logins).
- Not granted: push, PR, merge to `main`, project settings change (no compaction fallback), anything outside the repo.
- Caps (cumulative): 12 spawns, 3 phases, 4 hours, 3M tokens (estimate); 4 retries per node; at most 5 subagents at once.
- Stop file: `STOP` in the repo root (this folder).

## Decisions made up front
- Scope: spike only. `motion/` player support for collapse steps is a later sub-milestone (OpKeyframe has no collapse kind).
- No use of the engine's global stack-rank for collapse states (CLAUDE.md invariant; decisions.md 2026-09-26). Intermediate states go through `solveFlatFold`.
- Result type, not exceptions, for "no sequence found".
- Reversible by the integrator without asking (each gets a short decision record): grouping heuristics for the search, test names, helper placement inside `sequencer/`.

## Phases
P1 contract + fixtures + `verifyStage`; P2 stage search; P3 result report, decision entry, final gate. Graphs in PLAN.md.

## Started
2026-10-20, branch `claude/collapse-sequence`, baseline `npm run check` green (126 tests).

## Progress log
- 2026-10-20 charter written.

## Caps used
spawns: 1 (explorer, pre-run survey, not counted against the run) / 12 · phases: 0 / 3 · hours: ~0 / 4 · tokens: unmeasured (estimate low) / 3M

## Compaction hand-off
State: charter just committed; next is P1 dispatch. Reread RUN.md, PLAN.md, NEXT.md. Compaction path: none granted; if context fills, end at the gate with the recap (resumable).

## Retrospective
(filled at the end)
