# Plan

## To do
- [x] `claude/design-open-items` merged to main (PR #12); agent worktrees and merged branches removed (2026-10-20)
- [ ] **M4a collapse feasibility spike** (branch `claude/collapse-sequence`, autopilot run, see RUN.md and "Graph: M4a" below)
  - [ ] P1 contract + fixtures + `verifyStage`
  - [ ] P2 stage search on SIX
  - [ ] P3 result report, decisions.md entry, final gate
- [ ] Re-run `npx tsx app/hintbench.ts --slow` with the edge-level "one" (old --slow rows are stale)
- [ ] Roadmap: `docs/ROADMAP.md`, plans: `docs/PLANS.md`
- [ ] Gaps found on the horse run (full table: docs/ROADMAP.md "Where the pipeline stops today"):
  - [ ] Step-by-step collapse sequence (M4)
  - [ ] Shaping sequence, base → final model (M4/M5)
  - [ ] Verify the final 3D shape, not only the flat base
  - [ ] Subject-specific stick figures; map "good looking"/proportions to a figure
  - [ ] Corpus of 20 published sequences → fitted constants (M2, human work)
  - [ ] Large patterns refuting Lang's hint; time-bounded solving
  - [ ] Midline axial, then level shifters
  - [ ] Decide on asymmetric packing
  - [ ] Pythagorean stretches (§14.4)

## Done
- [x] Milestone "design open items" (branch `claude/design-open-items`, 2026-10-11): units U1–U4 below
  - [x] U1 integer-aware packing / inflating short edges (Lang §13.2) — merged 40d39cd, 115 tests; dragon 21×21 verifies from the integer layout in 9.5 s
    - note for reviewer: crane notes say "asked 7.50 at scale 7.50" (honest, noisy); code written before tests (worker admitted)
  - [x] U2 M2 step-cost model: schema, fit, report, gated constants (corpus stays human work) — merged 63cb07e, 91 tests
  - [x] U3 M/V hints (graded ladder + benchmark) — retry 2 fixed "one" to a single planar edge; merged 08db81f, 125 tests
  - [x] U4 contour parity guard (level shifters deferred) — merged e404e57, 99 tests
  - [x] vitest ignores `.claude/` worktrees (was counting other workers' tests)
  - [x] Merge U1–U4 into the integration branch one at a time, `npm run check` after each (dragon 21×21 e2e verified, 9.8 s)
  - [x] Fresh-context reviewer: ready, no blockers; nits 2–3 (honest labels) fixed in 784115d, 126 tests
    - left as nits: mvhints↔boxpleat import cycle (safe: call-time only); mirror test covers SIX only
  - [x] decisions.md entries (mirrored in DECISIONS.md), README status table
  - [x] ROADMAP gap table from the horse run (f1ae09a)

## Graph: M4a collapse feasibility spike (2026-10-20)

Model: collapse = a chain of crease subsets S1 ⊂ … ⊂ Sk = all. Stage i is the
crease pattern with Si assigned M/V (from the verified `cp`) and every other
crease flat (`F`); `solveFlatFold` verifies it (it already drops F edges).
Necessary condition only: motion between stages is NOT verified (label it so).
Never the engine's global stack rank. Phases are sequential; one node each
except where noted. Retry cap 4 per node (autopilot). Models: workers Sonnet,
integrator Opus.

### P1 — contract, fixtures, stage verifier
- **node n1** (worker, sonnet, medium, plan: light — small, node row is explicit)
- **job**: types + `verifyStage` + tests first on hand-checked cases.
- **input**: engine/flatfold.ts (`solveFlatFold`, F handling), engine/fold-file types, design/boxpleat.ts (`boxPleatFromGrid`, `toFold`), SIX + SIX_TIPS in design/boxpleat.test.ts.
- **output**: `sequencer/collapse.ts` exporting
  `CollapseStage {creases: number[]; verdict}`, `verifyStage(cp: FoldFile, subset: readonly number[]): StageVerdict` (ok with `states`/failure reason, using `solveFlatFold` on cp with non-subset edges set to "F"; `faces_vertices` must be removed first, see flatfold.ts), `isChain(stages)`; `sequencer/collapse.test.ts`.
- **tests first (hand-checked)**: (a) a single degree-4 vertex, creases M,V,V,V at 90°: full set ok, set of two non-collinear creases fails `local`; (b) two collinear creases subset ok; (c) the 6×6 SIX full set ok (reuse the fixture via boxPleatFromGrid) and empty subset ok (flat sheet); (d) a planted bad subset on SIX fails with a reason, not a throw; (e) `isChain` rejects non-nested stages.
- **check**: `npm run check`; new tests < 15 s.
- **scope**: only `sequencer/collapse.ts` and `sequencer/collapse.test.ts`. Do not touch engine/, design/, vendor/, motion/.
- **gate**: `scripts/check.sh` green on merged branch; I rerun the tests and read the diff.

### P2 — stage search on SIX
- **node n2** (worker, sonnet, medium-high, plan: standard — integrator writes the plan in the brief; needs context from P1)
- **edge**: P1 → P2 (artifact: `verifyStage` and the types in sequencer/collapse.ts, committed).
- **job**: `findCollapse(result: verified BoxPleatResult, opts)` → `{ok:true, stages}` or `{ok:false, stoppedAt, reason}`. Candidate groups = lines grouped by role (hinge, ridge, contour) and elevation, and by region; search with `sequencer/search.ts` beamSearch (budget and node limit explicit) over "add one group"; accept a group only if `verifyStage` ok; goal = all creases. Exact enumeration is fine for SIX if the group count is small; record which was used.
- **output**: additions to `sequencer/collapse.ts`, tests in `sequencer/collapse.test.ts`, a `collapse` summary line in `app/` only if trivial (else leave to P3).
- **tests first**: on SIX, whatever `findCollapse` returns must satisfy: every stage verified by an independent call to `solveFlatFold`; stages nested; last stage equals the full pattern; OR a named failure whose `stoppedAt` stage is itself verified. Plus a synthetic base where the answer is known by hand (e.g. two independent pleats: any order works, so ≥ 2 stages).
- **check**: `npm run check`; collapse tests < 60 s.
- **scope**: `sequencer/collapse.ts`, its test; may read design/, engine/. No edits there.
- **gate**: `scripts/check.sh` green; integrator reruns `findCollapse` on SIX and reads the outcome.

### P3 — report and final gate (integrator, plus reviewer)
- **node n3** (integrator): CLI/docs only: `docs/decisions.md` entry (method, necessary-not-sufficient label, SIX result), ROADMAP M4 row updated with what exists, README status line, NEXT.md rewritten.
- **node n4** (reviewer, sonnet, fresh context): diff vs this graph, CLAUDE.md invariants, never-lie check (labels present; no step rendered unverified).
- **gate**: full `scripts/check.sh`; reviewer "ready"; RUN.md success check items 1–4.

## Graph: design open items (2026-10-11)

Planning: Opus 5.5 (one planner per unit, read-only). Implementation: Sonnet 5.5
`worker`, one per unit, each in its own worktree branched from
`claude/design-open-items`. Integration, merge order and final verification: main
thread (Opus 5.5). Review: fresh `reviewer` (Sonnet 5.5).

Edges: none. No file or artifact passes between units. U1, U3, U4 all edit
`design/boxpleat.ts` but in disjoint regions (ownership below); additive type
changes only. Merge order: U2, U4, U1, U3 (U3 last so its benchmark runs on the
final construction).

Gate per unit: `npm run check` green in the worktree; the unit's specific
check below; no edits outside its scope. Retry cap: 3 attempts per unit, each
retry carries the failure reason. Integration gate: `npm run check` green after
each merge.

### U2 — step-cost model (worker launched, branch `claude/step-cost-model`)
- **job**: corpus schema + validator, phase-wise cost formula, least-squares fit,
  leave-one-out evaluation report, estimate.ts switches to fitted constants only
  with ≥ 12 published sequences (else stays "placeholder").
- **input**: data/sequences/, sequencer/plan.ts, sequencer/precrease.ts,
  design/tree.ts, docs/ARCHITECTURE.md §3.
- **output**: sequencer/corpus.ts (+test), design/costmodel.ts (+test),
  design/fitted.ts (`FITTED = null`), design/estimate.ts (gate, signature
  unchanged), app/corpus.ts + `corpus validate|report|fit` in app/cli.ts,
  data/sequences/EXAMPLE.json (+fields, `published:false`), TEMPLATE.json,
  data/README.md.
- **tests first**: lstsq exact recovery; synthetic corpus from known constants
  recovered to 1e-9; planted-wrong record fails; validator negative cases;
  planToRecord round-trip; empty corpus report says "not yet runnable (0/20)";
  `selectConstants` 11 → placeholder, 12 → fitted.
- **check**: `npm run check`; new tests < 10 s; `npm run origami -- corpus report`
  prints 0/20.
- **scope**: must not touch design/packing.ts, design/boxpleat.ts,
  design/candidates.ts. No invented panel counts.
- **model**: Sonnet, medium.
- **human work after**: choose and cite 20 published sequences; transcribe into
  data/sequences/ from TEMPLATE.json; second-person spot check; fold tests;
  `corpus fit --write` at ≥ 12; accept/reject the exit verdict.

### U1 — integer packing (worker launched, branch `claude/integer-packing`)
- **finding**: gridTree already ceilings where it can; fish 8×8 leaves 39 (not 53)
  unused and is geometry-limited (diagonal: T+H+D+min ≤ 8). Bird 8×8 is the
  headline: 35 → 49 squares used.
- **job**: band search for integer lengths + tip placement (packTreeInteger),
  then inflate rounded-down edges up to their ceiling where L∞ holds.
- **output**: design/packing.ts (placeTips refactor, packTreeInteger,
  verifyIntegerPacking, withLengths), design/candidates.ts (use it, legacy
  fallback, notes for every length change), design/intpack.test.ts.
  **No boxpleat.ts edits.**
- **check**: `npm run check`; intpack tests ≤ 15 s; dragon test still passes.
- **open (needs its own decision)**: `symmetry:"none"` would give the fish
  s*=2.5 vs 1.739, but candidates try only diagonal and book.
- **model**: Sonnet, medium-high.

### U3 — M/V hints (worker launched, branch `claude/mv-hints`)
- **job**: replace all-or-nothing contour hint with a graded ladder
  (`lang → one → none`); benchmark every strategy; prove what can be proved.
- **key fact**: flat-folder hints are hard constraints. Rung "one" (fix a single
  crease that must fold) is provably safe by the mirror argument (turning the
  model over swaps all M/V, crease positions unchanged). Every other rung is
  empirical.
- **output**: design/mvhints.ts (+test), `toFold` array overload and solve/retry
  block of `boxPleatFromGrid` in boxpleat.ts, optional `hint` on the result,
  app/hintbench.ts.
- **check**: `npm run check` ≤ ~60 s; new tests < 20 s; hintbench table in PR.
- **scope**: not vendor/, engine/flatfold.ts, completeRegions (~422–565),
  packing.ts, gridTree, candidates.ts, estimate.ts.
- **stop rule**: benchmark exists + ladder wired; negative result acceptable.
- **model**: Sonnet, medium.

### U4 — contour parity guard; level shifters deferred (worker launched, branch `claude/contour-parity`)
- **finding (planner, 3,687 layouts swept)**: with integer tips/lengths/cells the
  contour graph is bipartite, so the parity Conflict can never fire; the
  "needs a level shifter" message is false (Lang's gadget preserves parity).
  Real shifters need forced non-tip axials (plan-view midline, §14.1) first.
- **job (scoped down)**: extract `contourElevations`, reword the guard, test the
  invariant `elevation − u ∈ ℤ`; no gadget.
- **output**: boxpleat.ts (completeRegions ~499–532 + header), design/contours.test.ts.
- **check**: contours tests < 3 s; `npm run check`; fixtures unchanged.
- **follow-up (not this milestone)**: midline axial, then real level shifters
  (fixture: Fig 14.7 diamond or Kamiya's on-grid shifter, Fig 14.9).
- **model**: Sonnet, low-medium.

## Done (earlier)
- [x] Box-pleated crease patterns complete (Lang ODS ch. 13), precrease and collapse panel
- [x] Crease patterns verified with flat-folder; layout with BP Studio
- [x] v0 walking skeleton: request to instruction book, end to end
