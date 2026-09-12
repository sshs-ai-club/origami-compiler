# RESEARCH

What already exists, what it proves, and precisely where the hole is.

> **Provenance note.** This survey was assembled from search-engine
> abstracts and summaries, not full-text reads — arxiv.org and several
> publisher domains were unreachable from the machine that compiled it.
> Claims marked **[verify]** are ones we should confirm against the actual
> PDF before repeating them in a paper, presentation, or grant application.
> Everything here is a starting map, not a citable authority.

---

## 1. The hardness results — read these first

These define the shape of the problem. They are not obstacles to route
around; they tell you which sub-problems are worth attacking and which
need restriction.

| Result | Statement | Consequence for us |
|---|---|---|
| **Bern & Hayes 1996** | Deciding whether a crease pattern folds flat is **NP-hard**. Reduction from NAE3SAT. | No general foldability checker. Must restrict the input class or accept a solver with exponential worst case. |
| **Akitaya, Demaine & Ku 2017**, *Simple Folding is Really Hard* (J. Information Processing) | Deciding simple-foldability is **strongly NP-complete** for square paper with creases at multiples of 45°, and for orthogonal paper with orthogonal creases. Map folding (rectangular, orthogonal) is polynomial. | The exact case classical origami lives in is the hard one. Our sequencer is a heuristic search by necessity, never a complete algorithm. |
| **Akitaya, Demaine, Horiyama, Hull, Ku & Tachi 2020**, *Rigid Foldability is NP-Hard* (JoCG 11(1):93–124) | Rigid foldability is weakly NP-hard using all creases (from Partition), strongly NP-hard with optional creases (from 1-in-3-SAT). | Notably, hardness here comes from per-vertex configuration combinatorics, **not** from self-intersection. Affects the animation module. |
| **Akitaya, Demaine & Ku 2024**, *Computing Flat-Folded States* (OSME 2024) | A **facewise** definition of global flat-foldability: O(n³) layer-order conditions between overlapping face pairs, proved equivalent to the pointwise definition. Verifiable in O(n³). All valid folded states computable implicitly. | **This is our layer-order foundation.** It is the most directly usable theory result in the whole survey. |

Also relevant: *Circle Packing for Origami Design Is Hard*; *Flat Origami is
Turing Complete* (2309.07932); *Computational Complexities of Folding*
(2410.07666), a recent survey worth reading as an entry point.

**Read-first recommendation:** Demaine & O'Rourke, *Geometric Folding
Algorithms* is the canonical textbook and covers most of the above.

---

## 2. Design: target shape -> crease pattern

Three genuinely different algorithmic families. **Which one you pick
determines whether a folding sequence can exist at all** — this is the most
consequential decision in the project.

### Family A — Tree / uniaxial (the flap-packing school)

- **Lang's TreeMaker** and the **universal molecule algorithm**. Input: a
  metric tree (flaps with target lengths). Output: a uniaxial base crease
  pattern. Solves circle/river packing by nonlinear constrained
  optimization. Developed independently by Lang and Meguro.
- Formal analysis by **Bowers & Streinu**, *Lang's Universal Molecule
  Algorithm* (Ann. Math. AI, 2014) — relates input tree, output crease
  pattern, and the resulting uniaxial base.
- **Box pleating** (Lang, *Origami Design Secrets* ch.12) — the discrete,
  grid-restricted cousin. Everything snaps to an N×N grid at 45°/90°.

**Properties:** output is flat-foldable by construction. Bases are what
human designers actually fold. Step counts land in the range humans use.
**This is the only family where our step budget is even meaningful.**

### Family B — Surface approximation (the "fold any shape" school)

- **Demaine, Demaine & Mitchell 1999**, *Folding Flat Silhouettes and
  Wrapping Polyhedral Packages* (SoCG'99 / CGTA 2000). Universality: any
  connected polygonal region is foldable from one rectangle; any polyhedron
  can be wrapped. Constructive, but wastes almost all the paper.
- **Demaine & Tachi 2017**, *Origamizer: A Practical Algorithm for Folding
  Any Polyhedron* (SoCG 2017). Key idea: **tucking molecules** hide excess
  paper; the crease structure is approximated by a **Voronoi diagram** of
  the surface polygons laid out on the sheet. Guaranteed never to fail,
  unlike Tachi's 2008 Origamizer heuristic which sometimes finds no solution.
- Demonstration: Stanford bunny coarsened to **374 triangles**. The sheet
  was **pre-creased by a cutting plotter** and hand-folded over **~10 hours**.

**Properties:** provably universal, geometrically beautiful — and it
produces a simultaneous collapse of thousands of creases, **not a sequence
of steps**. The bunny is not "N steps" for any N. This family satisfies
"3D Eiffel tower from one sheet" and outright fails "step by step
instructions." See PLANS.md Plan C.

### Family C — Axisymmetric / swept / curved

- **Mitani**, *A Design Method for 3D Origami Based on Rotational Sweep*.
  Generates comparatively simple crease patterns for axisymmetric forms by
  adding flaps outside the target shape.
- Tools: **ORI-REVO** (surfaces of revolution), **ORI-REF** (curved folds
  via repeated planar reflection), **ORIPA** (pattern editor + folded-shape
  computation, open-sourced 2012).
- **Tachi's Freeform Origami** — drag 3D vertices, watch the crease pattern
  update in real time, preserving developability.
- Related: generalized waterbomb tessellations for 3D surface approximation;
  curved-crease origami review (Frontiers in Physics, 2024).

**Properties:** far fewer creases than Family B, genuinely 3D, often
hand-foldable. **Underrated for this project** — the Eiffel Tower is
roughly a 4-fold symmetric tapering tower, which is close to this family's
sweet spot.

---

## 3. Sequencing: crease pattern -> ordered folds

The thin part of the literature. This is the gap.

- **Akitaya, Mitani, Kanamori & Fukui 2013**, *Generating Folding Sequences
  from Crease Patterns of Flat-Foldable Origami* (SIGGRAPH'13 poster).
  Formulates sequencing as combinatorial optimization; **discrete particle
  swarm optimization** over a discrete folding action space, minimising
  **Hausdorff distance** to the target shape. A poster, not a full system. **[verify]**
- **Creasy** ([xkevio/Creasy](https://github.com/xkevio/Creasy)) — Java GUI
  implementing Akitaya's simplification algorithm. Shows all valid next
  steps; **the human clicks to assemble the sequence.** Unmaintained since 2022.
- **flat-folder** ([origamimagiro/flat-folder](https://github.com/origamimagiro/flat-folder))
  — Jason Ku's solver implementing the *Computing Flat-Folded States* work.
  Computes valid layer orders for a crease pattern. **Actively the most
  useful piece of existing software for our engine module.**
- **ReferenceFinder** (Lang) — given a target point on a square, finds a
  short sequence of Huzita–Justin axiom folds locating it. Solves only the
  reference-point subproblem, but directly relevant to *sequence quality*.

**Nothing in this list generates a complete, human-followable sequence
automatically, and nothing models a step budget.**

---

## 4. The 2025–2026 ML wave

Origami became a benchmark domain for spatial reasoning very recently. Four
papers in ~12 months, which means this area is now contested — worth knowing
before choosing a research angle.

| Work | What it is | Relevance |
|---|---|---|
| **COrigami** (Zahavy et al., Google DeepMind, arXiv 2606.26299, Jun 2026) | Text -> semantic stick figure -> base packing -> flat-foldable CP -> RL shaping with an autonomous aesthetic (VLM) evaluation loop. Neuro-symbolic: LLM/VLM for semantics, deterministic algorithms for geometry. | The closest prior art to our front half. **Outputs crease patterns and a simulated folded look — no folding sequence, no instructions.** Explicitly framed as a collaborative assistant producing starting points for human artists. |
| **Learn2Fold** (Huang, Chen, Jiang et al., ECCV 2026, arXiv 2603.29585) | Origami as **conditional program induction over a crease-pattern graph**. LLM proposes structured action tokens; a learned **graph-structured world model** does lookahead pruning; a symbolic simulator does exact final verification. | **The closest prior art to our back half** — text to *physically valid folding sequences*. Read this one first. Its decoupling of semantic proposal from physical verification is the architecture we should copy. |
| **OrigamiBench** (arXiv 2603.13856, Mar 2026) | Interactive environment: models propose folds, get validity + target-similarity feedback. Findings: scaling alone doesn't produce causal transformation reasoning; models fail at coherent multi-step plans. | Tells us **not** to expect an LLM to do the geometry. Confirms the symbolic kernel is mandatory. |
| **GamiBench** (arXiv 2512.22207) / **ORIGAMISPACE** (arXiv 2511.18450, NeurIPS 2025) | VQA benchmarks: 186+186 CPs with 3D shapes from 6 viewpoints (GamiBench); 350 instances of CP + flat pattern + folding process + folded image (ORIGAMISPACE). GPT-5 and Gemini-2.5-Pro "struggle on single-step spatial understanding." | Ready-made evaluation data, and hard evidence that off-the-shelf multimodal models cannot be the geometry engine. GamiBench code: github.com/stvngo/GamiBench |
| **FoldingAgent** (Moriya, Raab, Vinker & Dekel, SIGGRAPH Asia 2026, arXiv 2609.00377) | Infers **parametric folding programs from demonstration videos**. VLM agent with tools to simulate transitions, verify plausibility, and self-evaluate; re-plans to avoid compounding error. | The inverse of our problem, and a **source of training/benchmark data**: video -> program is how we could bootstrap a corpus of (model, sequence) pairs from YouTube. |

**Strategic reading:** the "text -> crease pattern" question is now crowded
with well-resourced teams. "Crease pattern -> budgeted, human-followable
sequence" is still open. Aim there.

---

## 5. Simulation and animation

- **Ghassaei, Demaine & Gershenfeld**, *Fast, Interactive Origami Simulation
  using GPU Computation* — [Origami Simulator](https://origamisimulator.org/),
  [source](https://github.com/amandaghassaei/OrigamiSimulator). Compliant
  dynamic solver: crease patterns triangulated into pin-jointed truss
  networks with axial + angular constraints, solved in GPU fragment shaders.
- **Critical property:** it folds **every crease simultaneously**, driven by
  a single global fold-angle parameter. It does *not* execute a sequence.
  Using it naively for our "watch it fold" video produces a motion that
  looks nothing like how a human folds the model.
- **Tachi**, *Simulation of Rigid Origami* — configuration represented by
  crease angles; trajectory computed by projecting angular motion onto the
  constrained space (Euler integration + Newton–Raphson residual
  elimination). Basis of **Rigid Origami Simulator** and **Freeform Origami**.
- **Geiger, Martinkus, Richter & Wattenhofer**, *Automating Rigid Origami
  Design* (IJCAI 2023, arXiv 2211.13219). Rigid origami design as a discrete
  optimization "game" — token placement on a checkerboard, solved with
  various search methods. [Code](https://github.com/belalugaX/rigid-origami).

---

## 6. Tooling and formats we should build on, not rebuild

| Thing | Use it for |
|---|---|
| **FOLD format** ([edemaine/fold](https://github.com/edemaine/fold)) | Our interchange format at every module boundary. Stores vertices/edges/faces **plus `faceOrders`** — the layer stacking we need. |
| **Rabbit Ear** ([rabbitear.org](https://rabbitear.org/)) | JS library: FOLD graph manipulation, geometry math, SVG + WebGL rendering, flat folding. Closest thing to a ready-made engine substrate. |
| **flat-folder** (Ku) | Layer-order solving. See §3. |
| **Origami Simulator** | Physical validation of a candidate CP, and fallback animation. |
| **Oriedita** ([oriedita.github.io](https://oriedita.github.io/)) | Modern open-source CP editor (successor to Orihime). For authoring test data by hand. |
| **Yoshizawa–Randlett system** | The diagram notation standard we must emit: valley = dashed, mountain = dash-dot, plus rotate/flip/zoom/inflate symbols and the hollow cleft-tail "apply pressure" arrow. See [Lang's diagramming conventions](https://langorigami.com/article/origami-diagramming-conventions/). |

---

## 7. The Eiffel Tower, concretely

A useful reality check, since it is the worked example in GOAL.md.

A published Eiffel Tower design (British Origami Society magazine, issue
201) uses a **31×31 grid folded into a waterbomb base and then pleated**.
It takes roughly **two hours** to fold, needs at least **35cm × 35cm** thin
paper, and is rated **intermediate — "relies on accurate folding, although
the steps themselves are actually very simple."** **[verify]**

Three things follow:

1. The target is **genuinely achievable** at roughly our step budget. This
   is not a fantasy request.
2. It is a **box pleat on a grid** — Family A, discrete. That is a strong
   vote for Plan B in PLANS.md.
3. "Simple steps, many of them, high precision" is exactly the profile an
   automated system is *good* at and a human diagrammer finds tedious. The
   division of labour favours us.

---

## 8. Summary: the gap, stated precisely

Everything upstream of the crease pattern is well funded and crowded.
Everything downstream of it is nearly empty.

```
target -> CP            TreeMaker, Origamizer, COrigami, Learn2Fold,
                        rigid-origami, Freeform Origami, ORI-REVO
                        ~30 years of work, several active teams

CP -> sequence          Akitaya-Mitani 2013 (poster), Creasy (manual, dead),
                        Learn2Fold (2026, flat, no budget)

sequence -> book        nothing

budget-constrained      nothing.  No tool can represent the
design                  constraint "foldable in <=300 steps."
```

**Open problems we could plausibly own**, in order of tractability:

1. **A step-cost model.** What *is* a step? How do symmetry batching
   ("repeat behind"), pre-creasing, and grid collapse map onto diagram
   panels? Currently undefined anywhere in the literature, and writing it
   down carefully is a genuine contribution that needs no new mathematics.
2. **Budget-aware sequence search.** Search fold sequences with step count
   as a hard constraint rather than an afterthought.
3. **Sequence quality objective.** Many valid sequences exist; which is best
   for a human? Fewest steps? Most symmetry preserved? Every fold landing on
   an existing reference (à la ReferenceFinder)? Undefined in the literature.
4. **Diagram legibility as a cost function.** When to rotate/flip the view,
   when to split one fold across two panels, how to avoid arrow crossings.
5. **A (crease pattern, human sequence, diagram) benchmark corpus.** Does
   not exist publicly. FoldingAgent's video->program approach is a plausible
   way to bootstrap one. Probably our highest-value publishable artifact.

Problems 1 and 5 require no new mathematics and are achievable by two
people. Start there.

---

## Sources

- [Origamizer: A Practical Algorithm for Folding Any Polyhedron (Demaine & Tachi, SoCG 2017)](https://erikdemaine.org/papers/Origamizer/)
- [Folding Flat Silhouettes and Wrapping Polyhedral Packages (Demaine, Demaine & Mitchell)](https://erikdemaine.org/papers/CGTA2000/)
- [Simple Folding is Really Hard (Akitaya, Demaine & Ku)](https://erikdemaine.org/papers/SimpleFolds_JIP/)
- [Rigid Foldability is NP-Hard (Akitaya et al., JoCG 2020)](https://erikdemaine.org/papers/RigidOrigamiHard_JoCG/)
- [Computing Flat-Folded States (Akitaya, Demaine & Ku, OSME 2024)](https://erikdemaine.org/papers/FlatFolder_OSME2024/)
- [flat-folder solver](https://github.com/origamimagiro/flat-folder)
- [Generating folding sequences from crease patterns of flat-foldable origami (Akitaya, Mitani, Kanamori & Fukui, SIGGRAPH 2013)](https://dl.acm.org/doi/10.1145/2503385.2503407)
- [COrigami: An AI Pipeline for Co-Designing Flat-Foldable Visually Recognisable Origami](https://arxiv.org/abs/2606.26299)
- [Learn2Fold: Structured Origami Generation with World Model Planning (ECCV 2026)](https://arxiv.org/abs/2603.29585)
- [OrigamiBench: An Interactive Environment to Synthesize Flat-Foldable Origamis](https://arxiv.org/abs/2603.13856)
- [GamiBench: Evaluating Spatial Reasoning and 2D-to-3D Planning of MLLMs](https://arxiv.org/abs/2512.22207)
- [ORIGAMISPACE: Benchmarking Multimodal LLMs in Multi-Step Spatial Reasoning (NeurIPS 2025)](https://arxiv.org/abs/2511.18450)
- [FoldingAgent: Inferring Parametric Origami Procedures from Demonstration Videos (SIGGRAPH Asia 2026)](https://arxiv.org/abs/2609.00377)
- [Automating Rigid Origami Design (IJCAI 2023)](https://arxiv.org/abs/2211.13219)
- [Fast, Interactive Origami Simulation using GPU Computation (Ghassaei, Demaine & Gershenfeld)](https://amandaghassaei.com/projects/origami_simulator/)
- [Simulation of Rigid Origami (Tachi)](https://origami.c.u-tokyo.ac.jp/~tachi/cg/)
- [Lang's Universal Molecule Algorithm (Bowers & Streinu)](https://link.springer.com/article/10.1007/s10472-014-9437-3)
- [Computational Origami (Lang)](https://langorigami.com/article/computational-origami/)
- [ORIPA (Mitani)](https://mitani.cs.tsukuba.ac.jp/oripa/) · [Oriedita](https://oriedita.github.io/) · [awesome-origami](https://github.com/oriedita/awesome-origami)
- [FOLD format](https://github.com/edemaine/fold) · [Rabbit Ear](https://rabbitear.org/)
- [Yoshizawa–Randlett system](https://en.wikipedia.org/wiki/Yoshizawa%E2%80%93Randlett_system) · [Lang's diagramming conventions](https://langorigami.com/article/origami-diagramming-conventions/)
- [Origami Eiffel Tower (31×31 grid box pleat)](https://origamiexpressions.com/origami-eiffel-tower)
