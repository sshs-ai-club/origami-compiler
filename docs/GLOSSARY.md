# GLOSSARY

Terms used throughout this repo. Origami vocabulary is unusually treacherous
because several words mean something different from what they sound like.

## The three that cause the most confusion

**Flat-foldable** — The final folded state can be pressed flat into a plane
*without adding new creases*. **It does not mean the model looks flat or 2D.**
Almost every complex figurative model — dragons, insects, human figures — is
built on a flat-foldable base; the 3D appearance arrives in the last ~20% of
steps, during shaping. Confusing "flat-foldable" with "looks flat" will lead
you to think 3D targets are out of reach. They are not. See ARCHITECTURE.md §2.

**Simple fold** — A fold that rotates one region of paper by ±180° about a
single straight line, through some or all layers. **Most real origami folds
are not simple folds.** Reverse, squash, petal, sink, and crimp folds are
not. Restricting to simple folds is what makes v1 tractable — and it is a
severe restriction, not a mild one.

**Step** — **One diagram panel**, which may contain several primitive fold
operations batched by symmetry or repetition. Not "one crease." A 31×31 grid
has ~1900 creases and fits in a couple hundred panels. See ARCHITECTURE.md §3.

## Geometry

**Crease pattern (CP)** — The flat sheet with all fold lines drawn on it,
each assigned mountain / valley / border / flat. Compact, complete, and
unreadable to non-experts.

**FOLD** — The JSON interchange format for origami
([spec](https://github.com/edemaine/fold)). Stores `vertices_coords`,
`edges_vertices`, `edges_assignment` (M/V/B/F), `faces_vertices`, and
`faceOrders` (layer stacking). Our format at every module boundary.

**Folded state** — Not just the geometry. A folded state is *(face positions,
layer order)*. Two models can have identical face positions and different
layer orders, and only one of them may be physically achievable.

**Layer order** — Which face is on top of which, for every pair of
overlapping faces. **This is where the computational difficulty lives** —
Bern & Hayes' NP-hardness comes from layer assignment, not from angles.

**Mountain / valley** — A mountain fold points the crease toward you (paper
folds away); a valley folds toward you. Drawn dash-dot and dashed respectively.

**Base** — A standard intermediate folded form that many models start from
(bird base, frog base, waterbomb base, preliminary base). Flat, uniaxial,
and the natural output of the design stage.

**Uniaxial base** — A base whose flaps all lie along a single axis. The
output of the tree method; what TreeMaker and box pleating produce.

**Flap** — A projecting tongue of paper that becomes a leg, wing, head, or
antenna. Design algorithms think in flaps, not in shapes.

**Box pleating** — Design restricted to an N×N grid with creases only at
0°, 45°, 90°. The discrete cousin of circle packing. Most modern complex
models, including the published Eiffel Tower, are box-pleated.

**Developable** — A surface that can be flattened into a plane without
stretching. Paper is developable; a sphere is not. Constrains everything.

## Theorems you will meet constantly

**Kawasaki's theorem** — At any interior vertex of a flat-foldable crease
pattern, alternating angles around the vertex sum to 180°. A *local*
necessary condition; cheap to check.

**Maekawa's theorem** — At any interior vertex, (# mountains) − (# valleys)
= ±2. Also local, also cheap.

**The catch:** Kawasaki and Maekawa together are necessary but **not
sufficient** for global flat-foldability. A pattern can satisfy both at
every vertex and still be unfoldable because no consistent layer order
exists. Testing all vertices is fast and proves nothing globally.

**Huzita–Justin axioms** — The seven fold operations constructible with
paper (analogous to compass-and-straightedge). Strictly more powerful than
compass and straightedge; can trisect angles and double cubes.

**Hausdorff distance** — A similarity measure between two shapes. Used by
Akitaya–Mitani (2013) as the objective when searching folding sequences,
and by us for the same purpose.

## Complexity vocabulary

**NP-hard / NP-complete** — Informally: no known algorithm solves all
instances efficiently, and finding one would resolve P vs NP. **It does not
mean "impossible in practice"** — SAT solvers routinely crush NP-complete
instances with thousands of variables. It means: no complete polynomial
algorithm, so use a solver or a heuristic, and expect some inputs to be slow.

**Rigid foldability** — Whether the model can be folded with flat, rigid
panels hinged at the creases (no bending of facets mid-motion). Matters for
animation and for engineering applications. NP-hard (Akitaya et al. 2020),
and interestingly for reasons unrelated to self-intersection.

## Our own terms

**DesignSpec** — Structured output of `intent/`: target, style, step budget,
sheet constraints.

**Candidate** — A proposed design: a flat-foldable `base_cp` plus a
`shaping_plan` plus an estimated step count. What the user picks between.

**StepPlan** — The ordered list of `Step`s, the central artifact flowing
from `sequencer/` to `diagrams/` and `motion/`.

**Shaping tail** — The final, non-flat-foldable portion of the sequence that
makes the model 3D. Handled by an operator library, never by the solver.

**Step-cost model** — Our formalisation of what counts as a step and how
batching reduces panel count. The project's main intended contribution.
