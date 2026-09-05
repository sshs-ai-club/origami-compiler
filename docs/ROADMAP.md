# ROADMAP

Where this project could go after v1. Not commitments — a map of what's
possible and roughly how hard, so scope creep is a choice, not an accident.

## Why crease-pattern -> instructions isn't already solved

- **Deciding flat-foldability is NP-hard** (Bern & Hayes, 1996) — no clean
  test exists for general crease patterns.
- **Simple foldability is NP-complete** in exactly the cases that matter to
  us: 45°-crease patterns on a square (i.e. classical origami). Map
  folding itself is polynomial; slight generalizations aren't.
  See Akitaya, Demaine & Ku, *Simple folding is really hard* (2017).
- **"Simple fold" excludes most real folds.** A simple fold rotates one
  region ±180° about one line. Reverse folds, squash folds, petal folds,
  sinks, crimps are not simple folds, and nobody has a clean formal
  algebra for them over folded states with layers. This is the actual
  gap between what exists (Creasy, TreeMaker, COrigami) and a usable
  instruction generator.
- **Step 4->5 (steps to diagrams) is not image generation.** A diagram is
  an exact 2D projection of a folded state plus its layer order — which
  faces are on top, which edges are hidden. A generative image model
  can't produce that; it needs a geometry kernel.

## Existing tools and what they actually do

Useful to read before extending anything below — mostly so we don't
duplicate work, and so we're honest in the pitch about what already exists.

| Tool | Does | Doesn't |
|---|---|---|
| **COrigami** (DeepMind, 2026) | Text -> semantic stick figure -> box-pleating packing -> flat-foldable crease pattern -> RL-based shaping, scored by a VLM aesthetic reward. Filtered 560k candidates to ~28k viable models. | Not public/callable — a paper, not a tool. Restricted to box-pleating on a discrete grid. No folding sequence or diagrams — output is a crease pattern only. |
| **Creasy** ([xkevio/Creasy](https://github.com/xkevio/Creasy)) | Java GUI implementing Akitaya's algorithm: shows all valid simplification steps for a loaded flat-foldable crease pattern. | Semi-automatic — you click to assemble the sequence yourself. No diagrams, no layer visualization, unmaintained since 2022. This is the closest thing to our 3->4 stage that exists, and it's still manual. |
| **TreeMaker** (Robert Lang) | Given a flap tree (topology + target lengths), solves the continuous circle/river packing problem to produce a crease pattern for a base. | Design tool, not a sequencer — gives you a crease pattern, not fold order or diagrams. Continuous optimization needs human judgment in the loop. |
| **ORIPA** | Crease pattern editor + fold simulator (view the 3D result of a pattern). | Editing/viewing only, no sequence generation. |
| **Origami Simulator** (Ghassaei) | Given crease assignments, simulates the physical fold in 3D — useful for validating a crease pattern is physically realizable. | Not a design or sequencing tool. Good as a validation dependency for us. |
| **ReferenceFinder** | Given target points on a square, finds a short sequence of Huzita-Justin axiom folds that locates them. | Only solves the reference-point sub-problem, not general fold sequencing. Relevant to open problem #2 (sequence quality — "folds landing on existing references"). |
| **FOLD format** (Demaine et al.) | JSON standard for crease patterns: `vertices_coords`, `edges_vertices`, `edges_assignment`, `faces_vertices`. | Just a data format — no algorithms. This is what we use as our interchange format between modules. |
| **Akitaya (2013) / Akitaya, Demaine & Ku (2017)** | The actual sequencing *algorithm* Creasy implements, and the proof that simple folding is NP-hard. | Papers, not software — Creasy is the only implementation we're aware of. |

**Bottom line:** the design side (text/shape -> crease pattern) has real,
recent work behind it (COrigami, TreeMaker). The side we're building
(crease pattern -> sequence -> diagrams) has one unmaintained manual
tool and no automated, diagram-producing implementation that we could
find. That's the gap this project fills.

v1 exists specifically to sidestep all of the above: simple folds only,
a small fixed set of flat-foldable classical bases.

## Open problems, roughly in order we'd tackle them

1. **Layer-ordering solver** — faces as SAT/CSP variables, non-crossing
   constraints as clauses. Every later stage depends on this. Start here.
2. **Sequence quality objective** — many valid fold sequences exist for
   one crease pattern. Define "best for a human" (fewest steps? most
   symmetry preserved? every fold lands on an existing reference point,
   à la ReferenceFinder?) and optimize for it. Currently undefined in
   the literature — first team to write it down owns it.
3. **Diagram legibility as a cost function** — when to rotate/flip the
   view, when to split one fold into two pictures, how to avoid arrow
   crossings. Also undefined; currently just diagrammer judgment.
4. **A benchmark dataset** — (crease pattern, human-diagram sequence)
   pairs from classical models with published diagrams, scored against
   our generated output and our own physical-fold tests. No such
   dataset exists publicly. Probably our highest-value deliverable.
5. **Non-simple fold operators** (squash, petal, reverse, sink, crimp) —
   formalize each as a transformation on (geometry, layer order), with
   preconditions for when it applies. Needed for anything past
   classical bases. Open research, not engineering.
6. **RL over the search** — only after (1)-(3) work on simple folds.
   A learned policy for branch selection, not a replacement for search.
7. **Multi-layer collision reasoning** — required once models have
   15+ stacked layers (real complex models). Strictly harder than the
   single-fold collision checks in v1.
8. **Physical paper modeling** — thickness, minimum crease spacing,
   layer thinning. Currently paper is treated as an idealized
   zero-thickness sheet.

## Explicitly not a near-term goal

Models like Lang/Kamiya-tier complex figures (think competition-grade
insects, dragons — 30-60+ flaps, box-pleated/circle-packed bases, built
almost entirely from stacked non-simple folds) are past what even
COrigami (DeepMind, 2026) or TreeMaker fully automate — COrigami's own
paper describes its output as a starting point for a human artist to
finish, not a finished model. That tier is a multi-year research
program, not a stretch goal for this club. Useful as motivating
context, not as a milestone.

## A realistic v2, if v1 succeeds

One level up from classical bases: traditional models needing exactly
one new operator (e.g. flapping bird = one squash fold beyond crane).
Add operators one at a time, each with its own tests, rather than
attempting the full operator set at once.
