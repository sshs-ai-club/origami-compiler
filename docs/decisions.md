# DECISIONS

Running log of "why we chose X over Y." Append, never rewrite. Every entry
should be short enough that someone can read the whole file in ten minutes.

Format: date, decision, alternatives rejected, reason, and what would make
us reverse it.

---

## 2026-09-12 — Reset the project around a 3D, budgeted, NL-driven goal

**Decision.** Replaced the previous scope (flat-foldable classical bases,
crease-pattern-in / instructions-out) with the goal in GOAL.md: natural
language in, several candidate 3D designs out, user picks one, instruction
book plus folding video out.

**Reason.** The previous scope was a strict subset and had no natural front
door. The new goal subsumes it — the old pipeline is now stages 3–7.

**Reversal condition.** If M4 (sequencer) fails outright, fall back to the
Plan A library product, which is the old scope with a nicer interface.

---

## 2026-09-12 — Architecture is "flat-foldable base + 3D shaping tail"

**Decision.** Designs are produced as a flat-foldable base crease pattern
plus a separate, heuristic shaping plan. The sequencer only ever sequences
the flat base.

**Alternatives rejected.**
- *Fully 3D throughout* — abandons Kawasaki, Maekawa, flat-folder, Creasy,
  and the entire flat-foldability literature. Nothing left to build on.
- *Fully flat* — cannot satisfy the user's actual request.

**Reason.** This is how real complex origami is built: a flat-foldable base,
then shaping. It lets rigorous methods apply to ~80% of the fold and
confines heuristics to the remaining ~20%.

**Reversal condition.** If the shaping tail turns out to dominate step count
for our target models, revisit — but then the correct move is probably to
restrict target shapes, not to change the architecture.

---

## 2026-09-12 — "Flat-foldable" does not exclude 3D models

**Note, not a decision, recorded because it caused real confusion.**
Flat-foldable describes whether the folded state *can* be pressed flat, not
whether the finished model looks flat. Dragon and insect crease patterns are
flat-foldable. The binding constraint on v1 ambition is **"simple folds
only"**, not flat-foldability. See GLOSSARY.md.

---

## 2026-09-12 — A step is a diagram panel, not a crease

**Decision.** `cost(StepPlan)` counts diagram panels. Panels may batch
multiple primitive folds via symmetry, repetition, pre-creasing, or collapse.

**Alternative rejected.** One step = one crease. Under that definition a
31×31 grid model is "~1900 steps" and the user's 300-step budget is
unsatisfiable — yet the published Eiffel Tower is a two-hour intermediate
fold. The naive definition contradicts observed reality.

**Reason.** The budget must mean what a human means by it.

**Reversal condition.** M2's ±15% exit test fails and no amount of batch-kind
refinement fixes it.

---

## 2026-09-12 — Step budget is enforced at design time, not checked afterward

**Decision.** `design/` estimates step count from grid size and flap count
and prunes over-budget candidates before sequencing.

**Alternative rejected.** Design freely, then attempt to sequence within
budget. Sequencing is NP-complete here; discovering a 700-step answer after
hours of search leaves no recourse but redesign.

**Reversal condition.** If the estimator proves too inaccurate to prune
safely, fall back to estimate-then-verify with a generous margin.

---

## 2026-09-12 — Step-faithful animation, not simulated collapse

**Decision.** `motion/` animates each step as a rigid rotation from
`before` to `after`. Origami Simulator is integrated for physical validation
and as a fallback, not as the primary animation path.

**Reason.** Origami Simulator folds all creases simultaneously; the motion
cannot illustrate step 147. For simple folds, step-faithful animation is a
single rigid rotation about the crease line and requires no solver — so
restricting to simple folds makes the video feature almost free.

**Reversal condition.** Non-simple operators come to dominate; per-operator
animation templates become unmanageable.

---

## 2026-09-12 — Build on existing tools rather than reimplementing

**Decision.** FOLD as the interchange format; Rabbit Ear for FOLD/SVG;
`flat-folder` for layer ordering; Origami Simulator for physical validation.

**Reason.** Each represents years of work by people who know more about this
than we do. Our contribution is sequencing under a budget, and every week
spent rebuilding a layer solver is a week not spent on it.

**Reversal condition.** Licensing or integration friction outweighs the
saving — reassess per tool, not globally.

---

## 2026-09-12 — Target the sequencing gap, not the design gap

**Decision.** The claimed contribution is the step-cost model and the
budget-aware sequencer, not text-to-crease-pattern.

**Reason.** Text-to-CP now has COrigami (DeepMind), Learn2Fold (ECCV 2026),
and several benchmark papers, all published within ~12 months. CP-to-budgeted-
sequence has one 2013 poster and one unmaintained semi-automatic GUI. We
cannot outspend DeepMind; we can be first in an empty room.

**Reversal condition.** Someone publishes budgeted sequencing first. Then
pivot to the benchmark corpus (Roadmap Arm E), which would still not exist.

---

## 2026-09-12 — Scope is "anything foldable", routed by tier

**Decision.** The Eiffel Tower is a worked example, not the target. `design/`
begins with a **router** that classifies the request into one of four tiers
and dispatches to a different design family for each (GOAL.md §2).

**Reason.** There is no single algorithm covering all foldable shapes. A flap
tree ("stick figure") is the right abstraction for tree-like targets and the
wrong one for a mask or a vase — those need surface approximation or
rotational sweep respectively. A system that always builds a stick figure
silently produces crease patterns that cannot represent what was asked for.

**Coverage we claim:** Tier 1 (tree-like, ≤8–12 flaps) done well; Tier 2
(axisymmetric) as a cheap bonus; Tier 3 (arbitrary surfaces) possible but
**with no step sequence**, so it is labelled a fidelity mode; Tier 4 declined
with a reason.

**Reversal condition.** If Tier 1 alone proves hard enough to consume the
whole schedule, ship Tier 1 only and say so.

---

## 2026-09-12 — Base and shaping plan are co-designed, not sequential

**Decision.** A `Candidate` is always the pair (`base_cp`, `shaping_plan`),
produced together.

**Reason.** A flat base cannot be made 3D after the fact unless it already
carries flaps in the right places. Designing the base first and then asking
"now how do we make it 3D" frequently has no answer.

**Clarifies** the earlier base-plus-shaping-tail decision, which described
the *structure* but not the *order* of design.

---

## 2026-09-12 — No model training, no GPUs in the core

**Decision.** The geometry kernel, layer-order solver, sequencer, diagram
generator and animator are exact, deterministic, CPU-only. The only neural
components are LLM API calls for parsing requests and writing step text.

**Reason.** Learn2Fold and COrigami both split the same way — neural for
semantics, symbolic for geometry — and OrigamiBench, GamiBench and
ORIGAMISPACE all independently found that frontier multimodal models fail at
single-step folding geometry. Training a network to approximate what a SAT
solver computes exactly would be strictly worse. DeepMind's compute went into
COrigami's RL *aesthetic polish*, not its geometry.

**Consequence:** v1 runs on a laptop plus an API key. Preserve this.

**Reversal condition.** Only Plan D (learned search policy), and only after M5.

---

## 2026-09-12 — TypeScript core, headless library plus thin shells

**Decision.** A TypeScript core library with no DOM dependency, driven by a
Node CLI (batch runs, tests, cost-model fitting) and a web shell (the
product). Python for offline analysis only.

**Reason.** Every tool we intend to reuse — Rabbit Ear, `flat-folder`,
Origami Simulator, FOLD tooling — is JavaScript. A Python core would mean
porting `flat-folder` (a research-paper implementation, weeks of work) or
shelling out to Node anyway. TypeScript also runs unmodified in the browser,
so the product deploys as a **static site** with no backend and no hosting
cost.

**Cost accepted:** SAT and numerics are slower in JS. Mitigate with a
WASM-compiled solver; move one component if a specific bottleneck proves
fatal, not the architecture.

**Reversal condition.** A measured, unavoidable performance wall in the
layer solver.

---

## 2026-09-12 — Sequencer is written against an abstract Domain interface

**Decision.** `sequencer/` depends on a generic `Domain<State, Op>` interface
(STACK.md §4), not on origami types. Search, budget pruning and partial-plan
reporting know nothing about paper.

**Reason.** Costs nothing now — it is better design regardless — and keeps
open the extension to other budgeted constructive-planning domains
(sheet-metal bending, self-folding robotics, assembly planning; see
GOAL.md §5), where the state space is close but the kernel is different.

**Explicitly not a decision to build for generality now.** No second domain
is implemented, planned, or scheduled. Premature abstraction is a bigger risk
to this project than lock-in.
