# OWNERSHIP

Two people. The work is deliberately **unbalanced ~70/30** — Person A owns
the compiler core and the research contribution; Person B owns the shell
that makes it usable and the data that keeps it honest.

| | Person A — **Core** | Person B — **Shell** |
|---|---|---|
| Name | (lead) | |
| Share | **~70%** | ~30% |
| Owns | `engine/` `sequencer/` `design/` + diagram **geometry** + motion **keyframes** + the step-cost model | `intent/` `app/` `data/` + diagram **styling** + motion **rendering** |
| Nature of work | Geometry, search, optimization, proofs-of-correctness | Product, rendering, UI, corpus, physical testing |
| Must understand | Flat-foldability conditions, layer ordering, SAT encoding, heuristic search | FOLD format, SVG, Three.js, origami notation, how to fold paper |

---

## The seam

The split is not "hard modules vs. easy modules." It is **who computes
geometry vs. who consumes it**. Every boundary is a JSON file on disk.

```
                 PERSON A                    |          PERSON B
                                             |
  DesignSpec --> design/ --> Candidate[]     |
                                             |  app/  candidate chooser UI
                                             |
  base_cp --> sequencer/ <--> engine/        |
                    |                        |
                    v                        |
               StepPlan  --------------------+--> app/  book assembly
                    |                        |
                    v                        |
         DiagramGeometry -------------------+--> diagrams/  styling -> SVG
         (2D polylines, visibility flags,    |   (Yoshizawa-Randlett notation,
          arrow anchors, view transform)     |    arrows, labels, layout)
                    |                        |
                    v                        |
           MotionKeyframes ------------------+--> motion/  Three.js render
         (rotation axis, angle, moving        |   (scrub bar, camera, sync)
          face set, layer update)             |
                                             |
                                             |  intent/  NL -> DesignSpec
                                             |  data/    corpus + fold tests
```

**Rule: Person A's output is always a file Person B can read without
understanding folding.** `DiagramGeometry` is line segments with a
`visible: bool`; B never computes hidden-line removal. `MotionKeyframes` is
an axis and an angle; B never computes a folded state.

**Rule: Person B's work must never block Person A.** A works headlessly
against JSON fixtures from day one. If B is three weeks behind, A is
unaffected.

**Rule: Person A must stub early.** A's modules *do* block B. Ship fake
`StepPlan` / `DiagramGeometry` / `MotionKeyframes` files in week one so B
can build against real shapes immediately.

---

## Person A — Core

### Modules
`engine/` · `sequencer/` · `design/` · geometry half of `diagrams/` ·
keyframe half of `motion/`

### Deliverables in order
1. **`engine/` FoldedState + fold application.** Parse FOLD, apply a simple
   fold, update face geometry. Foundation for everything.
2. **`engine/` layer-order solver.** Akitaya–Demaine–Ku facewise conditions
   -> SAT. Study `flat-folder` first; wrap or reimplement, do not invent.
3. **`engine/` validity checks.** Kawasaki and Maekawa per vertex;
   self-intersection in 2D (layer crossing) and 3D.
4. **The step-cost model** (ARCHITECTURE.md §3). Define what a step is.
   Fit the constants. **This is the research contribution — treat it as
   the most important thing you do.**
5. **`sequencer/` search.** A*/beam over fold operators with the budget as
   a hard constraint. Always returns a best partial plan; never hangs.
6. **`design/` grid packing.** Flap tree -> N×N grid packing -> candidate
   base CPs with step estimates.
7. **Diagram geometry.** Project a FoldedState to 2D, hidden-line removal
   using layer order, compute arrow anchor points, choose view rotation.
8. **Motion keyframes.** Per step, emit the rigid rotation that takes
   `before` to `after`.

### Reading list
- Demaine & O'Rourke, *Geometric Folding Algorithms* — chapters on flat
  foldability and the tree method.
- Akitaya, Demaine & Ku, *Computing Flat-Folded States* (OSME 2024) —
  **the single most important paper for your work.**
- Akitaya, Demaine & Ku, *Simple Folding is Really Hard* — so you know what
  you are up against and stop looking for a complete algorithm.
- Lang, *Origami Design Secrets*, ch. 11–12 (tree method, box pleating).
- `flat-folder` source. Read it before writing a layer solver.

### Why this is the bigger half
Three of the eight modules, but roughly all of the difficulty. The
NP-complete search, the SAT encoding, and the step-cost model all live here.
If this half fails, the project has nothing novel in it; if the other half
fails, the project is ugly but real.

---

## Person B — Shell

### Modules
`intent/` · `app/` · `data/` · styling half of `diagrams/` ·
rendering half of `motion/`

### Deliverables in order
1. **`data/` corpus — start immediately, before any code exists.**
   15 models in FOLD with their published step sequences. This is on the
   critical path for A's cost model, so it is genuinely urgent.
2. **`diagrams/` styling.** DiagramGeometry -> Yoshizawa–Randlett SVG.
   Valley dashed, mountain dash-dot, fold arrows, rotate/flip symbols,
   X-ray lines for hidden edges.
3. **`app/` skeleton.** Upload/choose, candidate list, step-by-step book
   view, print/export to PDF.
4. **`motion/` renderer.** Three.js scene consuming MotionKeyframes, with
   a scrub bar synced to the step list.
5. **`intent/` NL front door.** Prompt -> DesignSpec. Extract target,
   style, step budget, sheet constraints. Ask a clarifying question when
   the budget and the requested detail are incompatible.
6. **`data/` physical fold tests.** Print the output, fold it, record where
   it went wrong. **This is the acceptance criterion for the whole project
   (GOAL.md) and it is your call to make.**
7. **Step text generation.** LLM, given the FoldOp and geometry, writes one
   sentence per step.

### Reading list
- FOLD format spec ([edemaine/fold](https://github.com/edemaine/fold)).
- [Lang's diagramming conventions](https://langorigami.com/article/origami-diagramming-conventions/)
  and the [Yoshizawa–Randlett system](https://en.wikipedia.org/wiki/Yoshizawa%E2%80%93Randlett_system).
- Rabbit Ear docs (SVG rendering from FOLD).
- Origami Simulator source, for the animation fallback path.

### Why this half matters more than it looks
Person B owns the **only real acceptance test**: a human folding paper.
A can produce a geometrically flawless sequence that no person can follow,
and only B will find out. B has veto power over "done."

---

## Shared

- **Repo hygiene.** Branch per change, PR into `main`, one review. Keep PRs
  small. Neither person merges their own PR without the other's review.
- **The interface files** (`DesignSpec`, `Candidate`, `StepPlan`,
  `DiagramGeometry`, `MotionKeyframes`). Changing one of these is a joint
  decision and needs a note in `docs/decisions.md`.
- **Weekly sync**, 30 minutes: what shipped, what's blocked, any interface
  change. If either person is stuck more than 48 hours, say so immediately
  rather than at the weekly.

## If Person B runs out of time

Priority order for B's work, highest first:
`data/` corpus -> `diagrams/` styling -> `app/` book view -> `motion/`
-> `intent/`.

`intent/` is last on purpose. Natural-language input is the most visible
part of the demo and the least technically interesting; it can be a
hardcoded dropdown for months without harming the project. **Do not let the
front door consume time the corpus needs.**
