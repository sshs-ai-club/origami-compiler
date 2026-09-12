# MATH

What to study, in what order, and — separately — what is actually **open**
and attackable by us.

Two different things get confused constantly, so they are kept apart here:

- **§1–4: the ladder.** Established theory. You learn it; you do not improve it.
- **§5: open problems.** Things nobody has settled, ranked by whether *we*
  can realistically settle them.

---

## 1. Flat foldability — single vertex

Start here. It is small, complete, and unreasonably beautiful.

A crease pattern folds flat *locally* at an interior vertex iff:

- **Kawasaki's theorem** — alternating angles around the vertex sum to 180°.
  Equivalently `α₁ − α₂ + α₃ − ⋯ = 0`. The degree is necessarily even.
- **Maekawa's theorem** — `#mountains − #valleys = ±2`.
- **Big-little-big lemma** — a strictly-smaller angle flanked by two larger
  ones must have its two creases assigned oppositely.
- **Justin's non-crossing condition** — the layers must not pass through
  each other. This is the one that stops being local.

**What to notice:** Kawasaki and Maekawa are *necessary but not sufficient*
globally. A pattern can satisfy both at every single vertex and still be
unfoldable, because no consistent global layer order exists. This gap is the
entire subject.

**Worth doing as an exercise:** count the valid mountain/valley assignments
of a degree-2n flat-foldable vertex. It is a clean combinatorics problem
with a known answer, and doing it yourself builds the right intuition for
why the global problem explodes.

**Read:** Hull, *The Combinatorics of Flat Folds: a Survey* (arXiv 1307.1065).

---

## 2. Complexity — why the global problem is hard

- **Bern & Hayes 1996** — flat foldability is NP-hard. Reduction from
  **NAE3SAT**. *Actually read the reduction.* It is the single most
  instructive thing in the field, because it shows you concretely that the
  hardness lives in **layer assignment**, not in angles. Once you have seen
  the gadgets you stop looking for a clever geometric shortcut.
- **Akitaya, Demaine & Ku 2017**, *Simple Folding is Really Hard* — strongly
  NP-complete for square paper with creases at multiples of 45°. Note what
  is *not* hard: **map folding** (rectangular paper, orthogonal creases) is
  polynomial. Studying exactly where the boundary sits tells you which
  restrictions buy tractability — which is directly how we choose our design
  family.
- **Akitaya et al. 2020**, *Rigid Foldability is NP-Hard* — and interestingly,
  hardness here comes from per-vertex configuration combinatorics, **not**
  from self-intersection. Different source of difficulty from flat folding.
- **Akitaya, Demaine & Ku 2024**, *Computing Flat-Folded States* — the
  facewise formulation: O(n³) ordering conditions on overlapping face pairs,
  provably equivalent to the pointwise definition, verifiable in O(n³).
  **This is the paper `engine/` implements.** Read it twice.

**Read:** Demaine & O'Rourke, *Geometric Folding Algorithms* — the textbook.

---

## 3. Design algorithms

- **The tree method / universal molecule** (Lang, Meguro). A metric tree of
  flaps → circle-and-river packing → a uniaxial base. The packing is
  *continuous optimization with combinatorial structure*: the combinatorics
  of which circles touch, and a nonlinear program inside each configuration.
  Rigorous treatment: **Bowers & Streinu**, *Lang's Universal Molecule
  Algorithm* (Ann. Math. AI 2014).
- **Box pleating** — the same idea restricted to an N×N grid at 0/45/90°.
  The continuous program collapses to a discrete one. This is what makes
  Plan B tractable, and it is where our design work lives.
- **Origamizer** (Demaine & Tachi 2017) — the surface-approximation branch.
  Polygons laid out on the sheet, excess paper hidden in **tucking
  molecules**, crease structure from a **Voronoi diagram** of the layout.
  Universal and guaranteed to terminate. Genuinely elegant; worth reading
  even though Plan C is not our main path.

---

## 4. Rigid origami and kinematics — the deep end

If you want the part that connects to real geometry and to physics, this is it.

Fix a crease pattern. Assign a fold angle `ρᵢ ∈ (−π, π)` to each crease. The
constraint is **loop closure**: going around any interior vertex, the product
of the rotation matrices about its incident creases must be the identity.

```
∏ᵢ R(nᵢ, ρᵢ)  =  I        for every interior vertex
```

That is a system of polynomial equations in the `ρᵢ` (after the Weierstrass
substitution `t = tan(ρ/2)`, literally polynomial). So:

- **The configuration space of a crease pattern is a real algebraic variety.**
- Its **dimension** at a point is the corank of the constraint Jacobian —
  i.e. the mechanism's degrees of freedom.
- Its **singularities** are exactly the configurations where folding
  *bifurcates*: the same partly-folded state can continue into two different
  final shapes. This is why some models "snap" one way or the other.
- Tachi's simulator is numerically nothing more than: project the desired
  angular velocity onto the tangent space of this variety, integrate, and
  kill the drift with Newton–Raphson.

This is mechanism theory and constrained-system dynamics in the same clothes
you would meet them in a mechanics course. If you want a problem with real
mathematical depth that is also directly useful to `motion/`, characterising
the bifurcation structure of the patterns we generate is it.

---

## 5. What is actually open — and what we could settle

Ranked by **(our chance of settling it) × (value if we do)**. The top two
are the reason this project is worth doing.

### 5.1 ★ The step-cost model — *best ratio of value to prerequisites*

**Open because:** nobody has defined what a "step" is. Every paper counts
creases or folds; every human counts diagram panels; nothing connects them.

**The problem.** Given a crease pattern and a fold sequence, predict the
number of diagram panels a human diagrammer would use. Formalise the
batching rules — symmetry ("repeat behind"), repetition ("pleat every
line"), pre-creasing, collapse — and show the model predicts real published
diagrams.

**Mathematics required:** combinatorics and careful definition. **No new
theory.** The hard part is honesty: it lives or dies on the ±15% test in
ROADMAP.md M2.

**Why it matters:** without it, "under 300 steps" is not a well-formed
constraint and the entire product premise is vapour.

### 5.2 ★ An admissible heuristic for the sequencer — *the best concrete problem*

**The problem.** A* needs `h(s) ≤ ` (true number of steps remaining). Find a
good one.

**Here is a real one you can prove this week.** Under a simple fold, part of
the paper is reflected onto another part. At any point `p` in the plane, the
layer count afterwards is `layers(p) + layers(p′)` where `p′` is `p`'s
mirror image — so the **maximum layer count at most doubles per fold**.
Therefore:

```
    steps_remaining  ≥  ⌈ log₂( L_target / L_current ) ⌉
```

where `L` is the maximum number of layers at any point. This is admissible,
easy to prove, and immediately usable.

It is also **weak** — logarithms grow slowly, so it prunes almost nothing on
realistic instances. That is the research: **strengthen it.** Candidate
directions, none settled:

- A bound from **flap count**: a uniaxial base with `F` flaps needs at least
  how many folds? Each fold can create at most how many new flaps?
- A bound from **crease-angle diversity**: creases at `k` distinct angles
  require at least `f(k)` folds, since one simple fold addresses one line
  direction at a time.
- A bound from **layer-order inversions**: treat the target layer order as a
  permutation; lower-bound the folds needed to realise it (a sorting-network
  style argument).

Any one of these, proved and shown to dominate the log bound, is a genuine
small result — well-posed, self-contained, and directly speeds up our search.
**If you want one theorem to chase, chase this one.**

### 5.3 Sequence quality — what makes a sequence good *for a human*

**Open because:** it has never been written down. Many valid sequences exist;
diagrammers pick among them by taste.

Candidate objectives, all defensible, none established: fewest panels; most
symmetry preserved across consecutive steps; every fold landing on an
**existing reference point** (the ReferenceFinder criterion — connects to
reachability under the Huzita–Justin axioms); minimal layer count folded
through; minimal view changes.

**Tractable version:** collect human rankings of alternative sequences for
the same model, then fit weights. Empirical, not theoretical, but nobody has
data at all.

### 5.4 Diagram legibility — and a nice reduction

**Open because:** also pure diagrammer judgment. When to rotate or flip the
view, when to split one fold across two panels, how to avoid arrow crossings.

**The nice part:** *arrow-crossing minimisation is a graph-drawing problem.*
Crossing minimisation is well studied, NP-hard in general, with good
heuristics available off the shelf. Framing diagram layout as a crossing
minimisation instance is a small, real observation that makes an
"undefined judgment call" into a solved problem with known algorithms.

### 5.5 Enumeration and counting

How many flat-folded states does a given crease pattern admit? The 2024
facewise paper computes them implicitly; the counting questions behind it
(especially for grid patterns) are open and combinatorially rich. Lower
value to the product, high value if you like pure combinatorics. See also
*On random locally flat-foldable origami* (arXiv 2502.04279) and the spin-model
treatment (arXiv 2403.07306) — origami statistical mechanics is a real thing.

---

## 6. A suggested six-month reading order

| | |
|---|---|
| Weeks 1–2 | Hull's *Combinatorics of Flat Folds* survey. Do the single-vertex counting exercise by hand. |
| Weeks 3–5 | Demaine & O'Rourke, flat-foldability chapters. Then the Bern–Hayes reduction, slowly. |
| Weeks 6–8 | *Computing Flat-Folded States* (2024) + read the `flat-folder` source alongside it. Implement the layer solver. |
| Weeks 9–12 | Lang, *Origami Design Secrets* ch. 11–12. Bowers & Streinu for the rigorous version. |
| Weeks 13–16 | Attack §5.2. Prove the log₂ bound yourself, then try to beat it. |
| Weeks 17–24 | §5.1 in earnest, against the corpus. This is the contribution. |
| Optional | Tachi, *Simulation of Rigid Origami* → §4, if the kinematics pulls you. |
