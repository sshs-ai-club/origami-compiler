# PLANS

Four ways to build the thing in GOAL.md, from "definitely ships" to
"publishable if it works." Each is rated for **mathematical depth** (how
much real theory you must understand and implement), **risk**, and **what
you can honestly claim** at the end.

Read ARCHITECTURE.md first — all four plans share the eight-stage skeleton
and differ in what goes inside stages 2 and 4.

---

## Plan A — Library + Parametric Composer

**"An origami search engine that generates instruction books."**

Curate 15–30 hand-designed 3D models. Each ships with a verified crease
pattern, a human-authored fold sequence, and physical fold-test notes. The
system parses the request, retrieves and ranks matching designs, and
*generates* the diagrams, step text, and animation from the stored sequence.

```
NL -> DesignSpec -> retrieve + rank from library -> user picks
   -> stored StepPlan -> GENERATED diagrams + text + video
```

Parametric variation gives the illusion of design: the same Eiffel Tower
sequence instantiated at grid 16, 24, or 32 yields genuinely different
models with different step counts and detail levels.

| | |
|---|---|
| **Math depth** | **2/10.** Exact 2D projection, hidden-line removal, rigid rotation for animation. Undergraduate computational geometry, no research. |
| **What's automated** | Diagrams, step text, video, retrieval, ranking. |
| **What's not** | The design. The sequences are human-authored. |
| **Risk** | Very low. Every component is known to work. |
| **Time to demo** | 6–10 weeks. |
| **Honest claim** | "We automate the diagramming and animation of origami instruction books, and make a library searchable in natural language." Real and useful. |
| **Dishonest claim to avoid** | "Our AI designs origami." It does not. |

**Why it is not a waste of time:** it forces you to build `engine/`,
`diagrams/`, `motion/`, and `app/` — four of the eight modules — against
real data, and it produces the corpus that every other plan needs for
fitting its cost model. **Plan A is a prerequisite for B and D whether or
not you ship it as a product.**

---

## Plan B — Grid-Constrained Box-Pleat Designer  ← **RECOMMENDED**

**"Design on a grid, where step count is predictable, then sequence it."**

Restrict the entire design space to **box pleating on an N×N grid**, all
creases at 0°/45°/90°. Within that restriction, every hard thing gets
easier at once: packing becomes discrete, layer ordering becomes a
manageable SAT instance, step count becomes estimable in closed form, and
the resulting models are the kind humans actually fold.

```
NL -> DesignSpec
   -> target 3D form -> flap tree (limbs, lengths, branching)
   -> GRID PACKING under a step budget  -> several candidate base CPs
   -> user picks
   -> sequencer: A*/beam search over simple folds + named operators
   -> diagrams + step-faithful video
```

The Eiffel Tower is close to a best case here: the published design is a
31×31 grid box pleat (RESEARCH.md §7).

**The mathematics you actually implement:**

1. **Flap-tree extraction** — 3D form -> metric tree of flaps. Medial-axis
   or skeleton extraction, then simplification to ~6–12 flaps.
2. **Grid packing** — place circles/rivers on the integer grid so every
   flap has enough paper. The discrete analogue of Lang's circle/river
   packing; formulate as an integer program or constraint problem. *Circle
   packing for origami design is NP-hard in general* — the grid restriction
   and small flap counts are what make it tractable.
3. **Molecule filling** — fill each packed region with a standard crease
   molecule (rabbit-ear, waterbomb, Lang's universal molecule restricted to
   the grid).
4. **Layer ordering** — Akitaya–Demaine–Ku facewise conditions -> SAT.
   Reuse `flat-folder`.
5. **Budget-aware sequence search** — A* or beam search over fold operators,
   with `g` = steps used, `h` = admissible estimate of steps remaining
   (from the cost model), pruned hard at the budget. Similarity to target
   via Hausdorff distance, following Akitaya–Mitani 2013.

| | |
|---|---|
| **Math depth** | **6/10.** Discrete optimization, SAT encoding, heuristic search, computational geometry. No new theorems required, but you must genuinely understand the flat-foldability conditions. |
| **Risk** | Medium. The packing and the sequencer are each a real project. |
| **Time to demo** | 6–9 months for a narrow class (one object family, ≤8 flaps). |
| **Honest claim** | "The first system that designs an origami model **under a step budget** and emits a complete, verified folding sequence." That is a genuine, defensible first. |
| **Failure mode** | The sequencer works on 4-flap toys and dies on 10-flap models. Acceptable — say so, and report the scaling curve. |

**Why this is the recommendation:** it is the only plan where the step
budget — the distinctive part of the request, and the actual gap in the
literature — is a first-class citizen rather than an afterthought. It is
also the only plan whose hard parts are *restrictions of known algorithms*
rather than new theory.

---

## Plan C — Surface Approximation (Origamizer path)

**"Fold any shape exactly — but there are no steps."**

Take the target mesh, run Origamizer-style surface approximation: lay the
polygons out on the sheet, hide the excess paper in **tucking molecules**,
derive the crease structure from a Voronoi diagram of the layout. Demaine &
Tachi (2017) proved this never fails.

| | |
|---|---|
| **Math depth** | **9/10.** Voronoi diagrams, developability, the tucking-molecule construction, convex optimization. This is a graduate-level implementation of a SoCG paper. |
| **Risk** | High to implement, **zero risk that it fails to produce a crease pattern** — the guarantee is unconditional. |
| **Time** | 12+ months to implement from the paper. |

**The disqualifying problem:** the output is a simultaneous collapse of
thousands of creases. The Stanford bunny at 374 triangles was pre-creased by
a **cutting plotter** and hand-folded over **~10 hours**. There is no
sequence of 300 steps; there is no meaningful sequence at all. A human folds
it by pre-creasing everything and then collapsing the whole sheet at once.

So Plan C satisfies *"3D Eiffel tower from a single sheet"* and **fails**
*"step by step instructions."* It answers a different question than the one
asked.

**Keep it as:** an optional research arm, or a "maximum fidelity" mode that
outputs a printable pre-creasing template plus a simulator video and
honestly says *"this one is a collapse, not a sequence."* That is a
legitimate product feature — just not the main one.

---

## Plan D — Sequence-First Search

**"Never design a crease pattern. Search fold sequences directly."**

Invert the whole pipeline. Do not design a CP and then sequence it. Instead
search in the space of *fold sequences* from the start, and let the crease
pattern be whatever falls out.

```
state = FoldedState (starts as a blank square)
loop:
  LLM / learned policy proposes k candidate next folds
  symbolic kernel verifies each for geometric validity     <- exact
  learned world model scores lookahead value               <- fast, approximate
  beam-search, scored by Hausdorff distance to target
  hard stop at step budget B
```

This is essentially the **Learn2Fold** architecture (ECCV 2026) — LLM
proposal + graph-structured world model for lookahead + symbolic verifier —
extended from flat targets to 3D targets and with a step budget added.
**OrigamiBench** (2026) provides the environment shape; **GamiBench** and
**ORIGAMISPACE** provide evaluation data.

| | |
|---|---|
| **Math depth** | **9/10 plus ML.** Everything in Plan B, plus policy learning, GNN world models, and search under a learned heuristic. |
| **Risk** | **High.** Also the most crowded: several well-resourced teams published here in the last 12 months. |
| **Time** | 12–18 months, and it may simply not work at 300-step horizons. |
| **Honest claim if it works** | A genuine research contribution. Thesis material. |

**The structural advantage:** the step budget is *native*. You are searching
sequences, so "fewer than 300" is just the search depth limit. Nothing has
to be estimated or fitted.

**The structural problem:** 300 steps is an extremely long horizon for
search, compounding error is brutal (FoldingAgent's whole contribution is
re-planning to mitigate it), and OrigamiBench's finding is that current
models "struggle to generate coherent multi-step folding plans." A
300-step coherent plan is far beyond demonstrated capability.

---

## Comparison

| | A: Library | **B: Grid** | C: Surface | D: Sequence-first |
|---|---|---|---|---|
| Math depth | 2/10 | **6/10** | 9/10 | 9/10 + ML |
| Designs new models | ✗ | **✓** | ✓ | ✓ |
| Real folding sequence | ✓ (authored) | **✓ (generated)** | ✗ | ✓ (generated) |
| Respects step budget | ✓ (by lookup) | **✓ (by construction)** | ✗ | ✓ (natively) |
| Genuinely 3D output | ✓ | **✓ (base + shaping)** | ✓ (exactly) | partial |
| "Watch it fold" video | ✓ easy | **✓ easy** | ✓ (collapse only) | ✓ easy |
| Ships in | 2 months | **6–9 months** | 12+ months | 12–18 months |
| Risk | very low | **medium** | high | high |
| Novel? | no | **yes** | no (reimplementation) | yes, but crowded |

---

## The recommendation

**Build A, then B. Treat C and D as optional arms.**

```
  months 0-2     PLAN A SPINE
                 engine, diagrams, motion, app, corpus of 15 models.
                 A working end-to-end demo exists from month 2 onward.
                 |
  months 2-4     STEP-COST MODEL   <- the actual research contribution
                 Define what a step is. Fit constants against the corpus.
                 Validate against 20 published diagram sequences.
                 |
  months 4-9     PLAN B DESIGNER
                 Grid packing + budget-aware sequencer.
                 Narrow: one object family, <=8 flaps.
                 |
  month 9+       pick ONE arm: C (fidelity mode) or D (learned search)
```

Three reasons for this order:

1. **You always have a demo.** From month two there is something that takes
   text in and produces an instruction book. Every later month improves it.
   A project that only works at month nine usually never works.
2. **A produces what B needs.** The corpus, the diagram renderer, the
   engine, and the fitted cost constants are all prerequisites of B. Nothing
   built in phase A is thrown away.
3. **The novel claim is protected.** The step-cost model and the
   budget-aware sequencer are the parts nobody else has done. They sit in
   the middle of the schedule, not at the end where they would get cut.

**Do not start with B's designer.** Without the corpus you cannot fit the
step-cost model, and without that you cannot estimate step count, and
without that the designer has nothing to optimize against.
