# ARCHITECTURE

How "I want a 3D Eiffel tower in under 300 steps" becomes an instruction book.

---

## 1. The eight stages

```
  "3D Eiffel tower, <300 steps, single paper"
            |
  [1] intent/      NL -> DesignSpec                    LLM
            |      {target, style:3D, budget:300, sheet:square}
            |
  [2] design/      DesignSpec -> [Candidate, ...]      geometry + search
            |      each = BaseCP (flat-foldable) + ShapingPlan
            |
            |   <-- USER PICKS ONE
            |
  [3] engine/      FOLD -> FoldedState, layer orders   geometry kernel
            |      validity, collision, flat-foldability
            |
  [4] sequencer/   BaseCP -> StepPlan, |steps| <= B    heuristic search
            |
  [5] diagrams/    Step -> SVG panel                   exact projection
            |
  [6] motion/      StepPlan -> 3D animation            interpolation
            |
  [7] app/         assemble book, UI, export           web
            |
  [8] data/        corpus, benchmark, fold tests       humans + paper
```

Modules 3 and 4 are the project. Everything else is support.

---

## 2. The load-bearing decision: base + shaping tail

**The problem.** Almost all usable origami theory — Kawasaki, Maekawa,
flat-folder, Creasy, simple folds, the entire hardness literature — is about
crease patterns that fold **flat**. The user asked for a **3D** Eiffel tower.
Naively, asking for 3D throws away the theory.

**The resolution.** Real complex origami is not 3D throughout. It is:

```
   flat square
       |
       |  ~80% of steps: collapse to a flat-foldable BASE
       |                 <- all the theory applies here
       v
   uniaxial base (flat)
       |
       |  ~20% of steps: SHAPING — 3D, non-flat-foldable
       |                 <- no theory; heuristics + operator library
       v
   finished 3D model
```

Kamiya's dragons and Lang's insects are built exactly this way. The crease
pattern is flat-foldable; the three-dimensionality arrives in the last
fifth of the fold, in steps that published diagrams often render vaguely
("shape to taste").

**So we adopt the same split.** `design/` emits a `Candidate` of two parts:

```
Candidate {
  base_cp:      FOLD      # flat-foldable. Rigorous. Solvable. Verifiable.
  shaping_plan: [Op, ...] # 3D. Heuristic. Drawn from an operator library.
  est_steps:    int
  paper_spec:   {size_cm, grid_n, sheet:"square"}
}
```

Two regimes, two sets of tools, one seam. **This is the single most
important structural decision in the repository.** It is what makes a 3D
target tractable at all.

Consequence: `sequencer/` only ever sequences flat-foldable base patterns.
Shaping is sequenced by a much simpler, library-driven module. Do not let
these two mix.

---

## 3. The load-bearing definition: what is a step?

The user said "less than 300 steps." Before anything can optimize that, it
has to be defined. **It is not defined anywhere in the literature.** Getting
this right is contribution #1 (see RESEARCH.md §8).

A naive definition — one step = one crease folded — is wrong, and wrong in
a way that breaks the whole product. A 31×31 grid has ~1900 creases. Under
the naive count, every box-pleated model is "thousands of steps" and the
budget is unsatisfiable. But the published Eiffel Tower is an intermediate
two-hour fold.

The reason is that **human diagrams batch**. So:

> **A step is one diagram panel.** It contains one or more primitive fold
> operations that a human performs as a single instruction.

```
Step {
  id:      int
  ops:     [FoldOp]        # 1..n primitives shown in this panel
  batch:   Batch | null    # why >1 op is allowed in one panel
  view:    {rotate_deg, flip_bool}   # view change BEFORE this step
  before:  FoldedState     # precondition (engine-computed)
  after:   FoldedState     # postcondition (engine-computed)
  text:    str             # generated sentence
}

Batch =
  | Symmetry  {group}      # "repeat behind", "fold both sides"
  | Repeat    {n, along}   # "pleat at every grid line" — n identical ops
  | Precrease {region}     # "crease and unfold a 16x16 grid"
  | Collapse  {region}     # "collapse along existing creases"

FoldOp {
  kind:   valley | mountain | reverse | squash | sink | petal | crimp | pleat
  line:   (p, q)
  moving: [face_id]
  layers: [face_id]        # which layers this fold passes through
}
```

**cost(StepPlan) = number of Steps.** The budget is `|steps| <= B`.

The four `Batch` kinds are exactly the mechanisms that let a 1900-crease
box pleat fit in 300 panels. A grid pre-crease of an N×N grid is roughly
`2·log2(N)` panels, not `2·N`, because "fold edge to edge, unfold, repeat"
is one panel per halving. **Writing down and validating this cost model
against real published diagrams is Milestone 1 of the project** — it
requires no new mathematics, and without it nothing downstream can be
optimized.

**Validation method:** take 20 published diagram sequences, count their
panels, and check that our cost model predicts the same number from the
crease pattern. If it doesn't, the model is wrong, and everything built on
it would have been built on sand.

---

## 4. The load-bearing representation: FoldedState

Everything in `engine/` is this object.

```
FoldedState {
  faces:      [Polygon]           # geometry, in R^2 (flat) or R^3 (shaped)
  layer_order: PartialOrder       # on pairs of OVERLAPPING faces only
  cp:         FOLD                # the originating crease pattern
  creases:    {edge_id: angle}    # current fold angle per edge
}
```

Two facts govern the design:

1. **Layer order is where the difficulty lives.** Bern & Hayes' NP-hardness
   comes from assigning a consistent global stacking, not from the angles.
   We use the **facewise formulation** of Akitaya–Demaine–Ku (2024): O(n³)
   ordering conditions between overlapping face pairs, verifiable in O(n³),
   proved equivalent to the pointwise definition. Encode the conditions as
   clauses, hand them to a SAT solver. **Do not invent our own formulation** —
   `flat-folder` already implements this and is the reference.

2. **Flat and 3D states need different validity checks.** Flat: layer order
   must be a consistent non-crossing total order on overlaps. 3D: faces must
   not intersect in R³, which is a different (and in some ways easier)
   predicate. Keep two checkers behind one interface.

---

## 5. Why the step budget must be a design-time constraint

The tempting architecture is:

```
   design a crease pattern  ->  then try to sequence it in <=300 steps
```

**This fails.** Sequencing is NP-complete in our exact case, the search
space is enormous, and by the time you discover a pattern needs 700 steps,
the only fix is to redesign it. You would spend all your compute proving
things impossible.

The correct architecture is:

```
   design IN a family where step count is predictable by construction,
   then verify and refine the sequence
```

Concretely, on an N×N box-pleating grid, step count is roughly:

```
  est_steps(N, F, S)  =  precrease(N)      ~ 2·log2(N) + margin
                      +  collapse(F)        ~ c1·F        (F = flap count)
                      +  shaping(S)         ~ c2·S        (S = shaping ops)
```

`design/` can therefore **estimate step count before sequencing**, prune
candidates over budget immediately, and offer the user only viable options
with honest estimates. The sequencer then confirms or refutes the estimate.

The constants `c1`, `c2` are fitted from the `data/` corpus. This is the
empirical core of the project and the reason the corpus matters so much.

---

## 6. The video, and why it is nearly free (if we are disciplined)

Two possible animation strategies, and the choice matters:

**Strategy 1 — physical collapse (Origami Simulator).** Triangulate, build
a pin-jointed truss with angular constraints, drive one global fold-angle
parameter, solve on GPU. Excellent, open source, already exists.
**But it folds every crease simultaneously.** The resulting motion is a
beautiful blooming collapse that looks nothing like a person folding. It
cannot illustrate step 147.

**Strategy 2 — step-faithful animation.** Animate the transition from
`step.before` to `step.after`. For a **simple fold** this is trivial: rotate
the set of moving faces from 0° to 180° about the crease line, then apply
the layer-order update. One rigid rotation. No solver.

**Decision: Strategy 2 for the base, Strategy 1 as validation and fallback.**

This is a second, independent argument for the simple-fold-first design:
**restricting the base sequence to simple folds makes the "watch it fold"
feature almost free.** Non-simple operators (reverse, squash, sink) each
need a hand-authored animation template — which is exactly why the operator
library in `design/` is a library and not a solver.

---

## 7. Data contracts between modules

Every boundary is a file on disk. Modules never share memory objects. This
is what lets two people work independently.

| Boundary | Format | Notes |
|---|---|---|
| intent -> design | `DesignSpec` JSON | target, style, budget, sheet, detail level |
| design -> app | `[Candidate]` JSON | includes `est_steps`, thumbnail, paper spec |
| design -> sequencer | `base_cp` in **FOLD** | flat-foldable, assignments M/V/B/F |
| engine <-> sequencer | `FoldedState` JSON | faces, `faceOrders`, crease angles |
| sequencer -> diagrams | `StepPlan` JSON | as defined in §3 |
| sequencer -> motion | `StepPlan` JSON | same object |
| diagrams -> app | SVG per step | Yoshizawa–Randlett notation |
| motion -> app | glTF / frame sequence | step-indexed keyframes |

**FOLD** ([edemaine/fold](https://github.com/edemaine/fold)) is the
interchange format — it already stores `vertices_coords`, `edges_vertices`,
`edges_assignment`, `faces_vertices`, and crucially `faceOrders` for layer
stacking. We do not invent a format.

Implementation substrate: **Rabbit Ear** for FOLD manipulation and SVG,
**flat-folder** for layer solving, **Origami Simulator** for physical
validation.

---

## 8. What each module owns

| Module | Owns | Hardest part |
|---|---|---|
| `intent/` | NL -> DesignSpec. Prompt design, constraint extraction, clarification questions. | Nothing. This is the easy module. |
| `design/` | DesignSpec -> ranked candidates. Target geometry, flap-tree extraction, grid packing, step estimation. | Grid packing under a step budget. |
| `engine/` | FoldedState, layer-order solving, validity, collision, fold application. | Layer order (SAT encoding). |
| `sequencer/` | Budget-constrained search over fold sequences. | The whole thing. NP-complete. |
| `diagrams/` | Exact 2D projection + layer-aware hidden-line removal + notation. | Hidden-line removal and view selection. |
| `motion/` | Step-faithful 3D animation, scrub, step sync. | Non-simple operator templates. |
| `app/` | Web UI, candidate chooser, book assembly, print/export. | Nothing hard; lots of work. |
| `data/` | Corpus, benchmark, physical fold tests, cost-model fitting. | Getting humans to actually fold things. |

---

## 9. Failure modes to design against

Named here so they are recognised early rather than discovered at month six.

1. **The sequencer never terminates.** Mitigation: hard node budget, always
   return the best partial sequence found, always report honestly that it is
   partial. Never hang.
2. **Generated steps are geometrically valid but humanly impossible**
   (e.g. a fold requiring a third hand, or through 30 layers). Mitigation:
   a `foldability_cost` heuristic in the search — penalise layer count,
   reward folds landing on existing reference points.
3. **The step-cost model is wrong**, so every estimate lies. Mitigation:
   Milestone 1 validates it against 20 published diagrams before anything
   depends on it.
4. **Diagrams are technically correct and unreadable.** Mitigation: physical
   fold tests from month two, not month ten.
5. **Scope collapses into rebuilding Origami Simulator.** Mitigation: we
   integrate it, we never reimplement it.
