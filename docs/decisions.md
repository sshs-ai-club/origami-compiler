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

---

## 2026-09-12 — CORRECTION: Rabbit Ear is GPLv3, not compatible with our MIT licence

**What was wrong.** STACK.md recommended Rabbit Ear as the core substrate for
FOLD manipulation and SVG. Rabbit Ear is **GPLv3** (confirmed from its
`package.json` and npm metadata). Our repo is MIT. Linking a GPLv3 library
into an MIT core and distributing it is not permitted — the combined work
would have to be GPLv3.

**Status: open. This blocks the start of coding.** Three options in
DEPENDENCIES.md §1; the recommendation is option 1 (avoid Rabbit Ear, stay
MIT), because `flat-folder` — the piece we actually need — is MIT, and FOLD
parsing plus our own Yoshizawa–Randlett SVG output is roughly two weeks of
work we largely have to do anyway.

**Whoever decides: append the outcome here.**

---

## 2026-09-12 — flat-folder is the layer solver; port it rather than rewrite

**Decision.** `engine/`'s layer-order solving comes from forking
[flat-folder](https://github.com/origamimagiro/flat-folder) (**MIT**,
© 2022 Jason S. Ku) and extracting its solver into a callable library.

**Reason.** It implements *Computing Flat-Folded States* (Akitaya, Demaine &
Ku, OSME 2024) directly: builds the overlap graph, enforces taco-taco,
taco-tortilla, tortilla-tortilla and transitivity constraints, and decomposes
`faceOrder` variables into independent components solved separately. Writing
this ourselves would take months and be worse.

**Work required:** it is a browser application, not a library — the solver
must be extracted behind a `solveLayerOrders(fold)` interface. Bounded,
2–3 weeks, and the single highest-value integration in the project.

---

## 2026-09-12 — Creasy is a behavioural oracle, never a dependency

**Decision.** Do not link Creasy. Use it by running it and comparing its
reported next-steps against our sequencer's.

**Reason.** GPL-3.0 (incompatible as above) and Java (our core is
TypeScript). Comparing outputs creates no derived work.

**Also:** implement from the papers, not from Creasy's source. Reimplementing
from a GPL codebase studied line-by-line is legally murkier than implementing
from the published description, and Akitaya–Mitani 2013 is clearer anyway.

---

## 2026-09-12 — Paper PDFs are gitignored, fetched by script

**Decision.** `papers/MANIFEST.tsv` plus `papers/fetch.sh` are committed;
`papers/pdf/` is gitignored.

**Reason.** arXiv's default licence grants arXiv distribution rights, not
onward redistribution; ACM and Springer PDFs certainly do not. A manifest
plus a script gives everyone the same papers with one command and no
copyright exposure.

**Note:** the environment these docs were written in cannot reach arxiv.org,
erikdemaine.org, ACM, Springer or Semantic Scholar — all blocked by a network
egress proxy. The script must be run from an unrestricted network. This is
also why RESEARCH.md claims marked **[verify]** are still unverified.

---

## 2026-09-26 — v0 walking skeleton: every stage exists, honestly labelled

**Decision.** Build a thin end-to-end pipeline now (request → spec → stick
figure → packing → candidates → StepPlan → diagrams → animation → book),
real where the work is tractable today and explicitly stubbed where it is
milestone work. What is real: the simple-fold engine and FOLD export, the
rule-based parser (and a Claude parser), box-pleat packing, the exact N×N grid
precrease planner, diagrams, keyframes, player, video capture. What is not:
molecule filling (so no candidate has a crease pattern), the collapse and
shaping sequences, fitted cost constants.

**Reason.** PLANS.md: "you always have a demo." The skeleton fixes every
interface in code so both owners can work against it, and the book states on
its first screen which steps are generated and which are missing.

**Reversal condition.** None; stages get replaced in place.

---

## 2026-09-26 — Licence: no GPL code (option 1), pending team confirmation

**Decision.** The code follows DEPENDENCIES.md §1 option 1: no Rabbit Ear, no
Creasy. FOLD I/O and geometry utilities are our own. Runtime dependencies are
`@anthropic-ai/sdk` and `zod` (both MIT); Playwright (Apache-2.0) is dev-only.

**Status.** This is the recommended default, adopted so code could start. The
team should confirm it here; nothing written so far forecloses option 2.

---

## 2026-09-26 — Code lives in the module directories; core is checked DOM- and Node-free

**Decision.** Each module's code sits next to its README (`engine/*.ts`,
etc.), not under a separate `core/`. `tsconfig.core.json` compiles the core
modules with no DOM and no Node types, so "the core never imports a DOM API"
is enforced by the compiler. `app/` is the only shell.

---

## 2026-09-26 — Engine v0: global stack rank for simple-fold states

**Decision.** `FlatState` stores one global stacking rank per face. Valid
because every simple fold moves a block of faces to the very top (valley) or
bottom (mountain) of where it lands, so a global order restricted to
overlapping pairs stays consistent. Exported as FOLD `faceOrders`.

**Not a layer solver.** It cannot take an arbitrary crease pattern and find
its layer order. That remains the flat-folder port (M1).

**Reversal condition.** The first non-simple operator (reverse, squash, sink).

---

## 2026-09-26 — A flap fold carries the layers resting on it

**Decision.** Folding a flap (valley) also moves every layer lying on top of
it, and everything rigidly attached to those; mountain folds carry layers
underneath. Carried faces are reported; `strict: true` rejects instead.

**Reason.** Found while authoring the dart plane: the wing fold was rejected
because a flap from step 3 lies inside the wing, hinged only along the fold
line. A person folding the wing carries it along. Rejecting that was wrong.

---

## 2026-09-26 — Grid precreasing uses one pinched reference, then midpoints

**Decision.** For N not a power of two, with P = 2^⌊log₂N⌋ and c = (2P−N)/P:
pinch the right edge at height c by halving, then pinch the diagonal and the
line (0,1)–(1,c) where they cross, at x = P/N exactly. Crease through it.
Every other k/N is a midpoint of known lines ("fold edge to crease"), done
in rounds, one panel per round. Horizontal lines are one "rotate and repeat"
panel. 21×21 takes 14 panels; 32×32 takes 6.

**Reason.** Exact (no approximation), uses only folds a person can make, and
leaves no reference lines in the crease pattern (pinches, not creases).
Precrease panel counts are therefore exact inputs to the step estimate.

---

## 2026-09-26 — Unit-less "N×N" is read as a grid, and the user is asked

**Decision.** "21x21 paper" has no unit. intent/ reads it as a 21×21
box-pleating grid and adds a note asking whether 21 cm paper was meant.

**Reason.** In box pleating "N×N" nearly always names the grid, but 21 cm is
the width of A4, so the other reading is plausible. Guessing silently would
violate intent/README.md.

---

## 2026-09-26 — Image and video generation restyle exact renders; they never originate geometry

**Decision.** Step visuals and the video come from the engine: exact SVG
diagrams and a step-faithful animation (recordable to .webm). An optional
`illustrate/` stage prepares image-model requests that take the exact diagram
as the conditioning image and ask only for restyling. No provider is wired in.

**Alternative rejected.** Generating step images or the folding video directly
with an image/video model from text. RESEARCH.md §4: OrigamiBench, GamiBench
and ORIGAMISPACE find frontier multimodal models fail at single-step folding
geometry, so the output would be plausible and wrong, which is worse than no
picture (GOAL.md §3).

**Open.** Which provider, and whether stylised images help first-time folders
at all. Decide by fold test, not by taste.

---

## 2026-09-26 — Claude for parsing and stick figures; rules as the floor

**Decision.** `intent/llm.ts` and `design/llm.ts` call Claude
(`claude-opus-5`, structured outputs, server-side refusal fallback) behind
`--claude`. Output is schema-validated, then normalised against the same
vocabulary as the rule parser; a proposed stick figure that is not a valid
metric tree is rejected. Without credentials, or on any API error, the
rule-based parser runs and the book says so.
