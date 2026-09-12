# ROADMAP

Milestones for the recommended path (PLANS.md: A -> step-cost model -> B).
Dates assume a start of **September 2026** and part-time work by two people.

Each milestone has an **exit test** — a specific, checkable thing that is
true when the milestone is done. "It mostly works" is not an exit test.

---

## M0 — Foundations · Sep–Oct 2026

| Who | Work |
|---|---|
| A | FOLD parser. `FoldedState`. Apply one simple fold, update geometry. Stub `StepPlan`/`DiagramGeometry`/`MotionKeyframes` files in week 1 so B is unblocked. |
| B | 5 models in the corpus, in FOLD, with published step counts. SVG renderer that draws a crease pattern. |

**Exit test:** load the crane CP, apply three simple folds by hand-written
script, render the resulting state as SVG, and have the SVG match a
hand-drawn reference.

---

## M1 — Layer ordering · Nov 2026

| Who | Work |
|---|---|
| A | Layer-order solver. Facewise conditions (Akitaya–Demaine–Ku) -> SAT. Study `flat-folder` first. Kawasaki + Maekawa checks. |
| B | Corpus to 15 models. Yoshizawa–Randlett symbol set complete. |

**Exit test:** for all 15 corpus crease patterns, the solver produces a
valid layer order, and rejects a deliberately corrupted version of each.

This is the hardest purely-technical milestone. Budget more time than feels
necessary.

---

## M2 — The step-cost model · Dec 2026 – Jan 2027  ★ **the contribution**

| Who | Work |
|---|---|
| A | Write down the step definition (ARCHITECTURE.md §3). Implement `cost(StepPlan)`. Fit `precrease(N)`, `c1`, `c2` against the corpus. |
| B | Transcribe 20 published diagram sequences into panel counts with batch annotations. |

**Exit test:** the cost model predicts the published panel count of 20 real
diagram sequences within **±15%**. If it does not, the model is wrong —
fix it before building anything on top of it.

**This milestone is the project's novel claim.** It needs no new
mathematics, it is achievable by two people, and nothing else in the
literature has done it. Do not let it slip.

---

## M3 — End-to-end Plan A demo · Feb 2027

| Who | Work |
|---|---|
| A | Diagram geometry: projection + hidden-line removal + view selection. Motion keyframes for simple folds. |
| B | `app/` book view. `motion/` Three.js renderer with step-synced scrub. Step text generation. |

**Exit test — the real one, from GOAL.md:** a person who has never folded
the crane folds it correctly from our generated output alone, with no help.
Record where they hesitate.

**From this point the project always has a working demo.** Everything after
improves it.

---

## M4 — Sequencer · Mar–May 2027

| Who | Work |
|---|---|
| A | Budget-constrained search: A*/beam over fold operators, `g` = steps used, `h` = cost-model estimate of steps remaining. Hard node budget; always returns best partial plan. |
| B | Physical fold tests of generated (not authored) sequences. Failure taxonomy: what kinds of generated step are humanly unfoldable? |

**Exit test:** for at least 3 classical bases, the sequencer independently
rediscovers a valid folding sequence within 130% of the published step
count, and a human folds it successfully.

Expect the first generated sequences to be geometrically valid and humanly
awful. B's failure taxonomy feeds back into A's `foldability_cost`
heuristic. Plan for at least two full iterations of that loop.

---

## M5 — Designer · Jun–Sep 2027

| Who | Work |
|---|---|
| A | Flap-tree extraction. Grid packing under a step budget. Candidate generation + ranking with honest step estimates. |
| B | Candidate chooser UI with 3D previews. Corpus to 30 models. |

**Exit test:** given "a 4-legged animal, under 200 steps," the system
produces ≥3 distinct candidate designs, all under budget, and at least one
folds successfully in a physical test.

**Scope warning:** narrow this aggressively. One object family, ≤8 flaps.
A designer that works for quadrupeds is a result; a designer that half-works
for everything is not.

---

## M6 — The Eiffel Tower · Oct–Dec 2027

The original request, end to end.

**Exit test:** type *"I want to make a 3D shaped Eiffel tower with less than
300 steps, single paper."* Get candidates. Pick one. Fold it from the
generated book. It looks like the Eiffel Tower.

If M6 lands, the project has done something no existing system does.

---

## Optional arms — 2028+

Pick **one**, only after M5, and only if the team has grown.

- **Arm C — fidelity mode.** Origamizer-style surface approximation for
  exact 3D shapes. Outputs a pre-creasing template and a collapse video
  instead of steps, and says so honestly. (PLANS.md Plan C.)
- **Arm D — learned search.** Learn2Fold-style LLM proposal + learned world
  model + symbolic verification. Highest ceiling, crowded field.
  (PLANS.md Plan D.)
- **Arm E — the benchmark.** Publish the corpus as a public
  (crease pattern, human sequence, diagram) dataset. It does not exist
  today and would likely be cited more than the compiler itself.
  **Cheapest of the three and possibly the highest value.**

---

## Schedule risk

| Risk | Early warning | Response |
|---|---|---|
| Layer solver (M1) overruns | Still debugging SAT encodings in December | Wrap `flat-folder` as a subprocess instead of reimplementing. Lost elegance, saved months. |
| Cost model fails ±15% (M2) | Predictions off by 2× on box-pleated models | Expected. Batching rules are probably wrong. Add batch kinds; this is the research, not a failure. |
| Sequencer never finds anything (M4) | Search explodes on the bird base | Narrow to a smaller grid. Report the scaling curve honestly — a negative result with a curve is publishable. |
| Person B falls behind | Corpus under 10 models by November | A's cost model is blocked. Escalate at the weekly, not after. A should help transcribe. |
| Scope creep into 3D shaping | Discussion of sink folds before M4 | Shaping is a library, not a solver. Reread ARCHITECTURE.md §2. |
