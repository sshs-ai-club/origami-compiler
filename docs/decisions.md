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
