# FOLD TESTS

What to fold, in what order, and what to write down.

**Right now the purpose is not to test our output — there is none.** It is to
build the ground truth that M2's step-cost model gets fitted against
(ROADMAP.md). Every hour of folding now buys a constant in a formula later.

Later, the same protocol becomes the acceptance test for generated output.

---

## 1. Setup

**Paper.** Duo paper (different colour each side) is worth buying — you can
see at a glance which face is which and whether a crease is mountain or
valley. Thin enough to see through helps for reading layer stacks. 15cm
squares for bases; 25–35cm for anything box-pleated.

**Numbering.** Before folding, **number the faces on the crease pattern in
pencil** — same indices as the FOLD file's `faces_vertices`. After folding
flat you can read the stack directly off the open edge. This is the single
technique that makes layer-order recording possible at all.

**Photos.** One photo per step, from a fixed position, plus one of the open
edge showing the layer stack. These are the diagram ground truth and cost
nothing to collect while you're already folding.

**Time.** Record wall-clock minutes. It correlates with step count and is a
free sanity check on the cost model.

---

## 2. What to fold, in order

### Tier 0 — the 1D warm-up · do this first, it takes 20 minutes

A strip of paper divided into 4 equal segments by 3 creases. Fold it flat
**every way you can**, and for each one record the stacking as a permutation
of segments 1–4 (bottom to top). Then try to find orderings you *cannot*
achieve and write down why.

This is the whole layer-order concept at a scale you can hold in your hand,
and it has a known answer (*stamp folding*) to check against. It is also the
exact test fixture for the 1D solver in START.md Step 3.

Repeat for 5 segments if you have patience. Record both.

### Tier 1 — the classical bases · the core of the corpus

| # | Model | Why this one |
|---|---|---|
| 1 | **Kite base** | 2 folds. Smoke test for the whole pipeline. |
| 2 | **Preliminary base** | 4 layers, the simplest interesting layer structure |
| 3 | **Waterbomb base** | **Same crease pattern as the preliminary, opposite assignment.** Fold both and compare — the clearest possible demonstration that geometry alone does not determine the folded state. |
| 4 | **Fish base** | Introduces the rabbit-ear molecule |
| 5 | **Bird base** | From preliminary, via petal folds. The canonical base. |
| 6 | **Frog base** | From waterbomb, via squash + petal. Most complex classical base. |

Do 2 and 3 back to back. That pair teaches more about layers than anything
else on this list.

### Tier 2 — complete models with published diagrams

| # | Model | Why |
|---|---|---|
| 7 | **Crane** | The canonical model, ~20 panels, diagrams everywhere. First end-to-end target. |
| 8 | **Flapping bird** | Crane plus one squash fold — tests the "one new operator" v2 idea |
| 9 | **Traditional waterbomb (balloon)** | **Flat-foldable base, inflated to a 3D final state.** This is ARCHITECTURE.md §2's central claim in physical form. Fold it and the base+shaping split stops being abstract. |
| 10 | **Masu box** | 3D final state, different flavour from a uniaxial base |

### Tier 3 — box pleating · required for M2

| # | Model | Why |
|---|---|---|
| 11 | Any simple model on an **8×8 grid** | |
| 12 | Any simple model on a **16×16 grid** | |
| 13 | Any simple model on a **32×32 grid** | |

**These three matter more than they look.** `precrease(N)` — how many diagram
panels it takes to pre-crease an N×N grid — is a constant in the cost model
and can only be measured, not derived. Three grid sizes give you the curve.
If you fold nothing else in Tier 3, fold these.

**Sources for published sequences:** Oriedita and ORIPA ship example patterns;
the British Origami Society magazine archive; Lang's and Montroll's published
books; `flat-folder`'s `examples/` folder for crease patterns.

---

## 3. What to record per step

This is the part that determines whether the corpus is useful. Fields marked
★ are the ones nobody else records — they are why this corpus would be novel.

| Field | What | Why it matters |
|---|---|---|
| `panel` | Panel number in the published diagram | The unit `cost(StepPlan)` counts |
| ★ `batch` | `single` / `symmetry` / `repeat:n` / `precrease` / `collapse` | **The key field.** One panel can be many folds — this is the whole step-cost model |
| ★ `primitive_folds` | How many individual creases this panel actually asks for | With `batch`, gives the batching ratio |
| `op` | `valley` `mountain` `reverse` `squash` `petal` `sink` `crimp` `pleat` | Operator frequency — tells us which non-simple operators to build first |
| `line` | The fold line in landmarks ("corner A to corner C", "edge to centre crease") | Reference-point analysis |
| ★ `reference` | `exact` (lands on existing crease/corner/edge) or `judged` (by eye) | Feeds the sequence-quality objective, MATH.md §5.3 |
| ★ `layers_before` / `layers_after` | Max layer count at the thickest point | **Validates the log₂ admissible bound**, MATH.md §5.2, and feeds the cost model |
| `through_layers` | How many layers this fold passes through | Feeds `foldability_cost` — folds through many layers are physically hard |
| ★ `view_change` | `none` / `rotate:90` / `flip` | Feeds diagram legibility, MATH.md §5.4 |
| ★ `hesitation` | 0–3, plus a free-text note | **The most valuable field.** Where a human stalls is the signal our sequencer needs |

### On layer order specifically — you asked about this

Recording the **full layer permutation** at every step is only practical up
to about 8 layers. So:

- **Tiers 0 and 1 (≤8 layers):** record the full permutation. Read it off
  the open edge using your pencilled face numbers. This is your solver's
  ground truth — you will compare `engine/`'s output against these by hand.
- **Tiers 2 and 3 (many layers):** record `layers_before`, `layers_after`,
  and **which flap moved**, not the full permutation. Trying to transcribe a
  40-layer stack by hand will burn an afternoon and produce errors.

The full permutations from Tier 1 are enough to validate the solver. The
counts from Tiers 2–3 are enough to fit the cost model. You do not need both
everywhere.

---

## 4. File layout

```
data/
  cp/<model>.fold            crease pattern
  sequences/<model>.json     the per-step record (schema below)
  foldtests/<model>-<date>-<folder>.md   free-text report
  foldtests/photos/<model>/  step photos
```

`sequences/*.json` is machine-readable because the cost-model fitting script
consumes it. `foldtests/*.md` is prose because the useful observations never
fit a schema.

See `data/foldtests/TEMPLATE.md` and `data/sequences/EXAMPLE.json`.

---

## 5. The rule

**Nothing enters `data/` without a fold test.** A crease pattern nobody has
folded is a hypothesis, not data.

**Record failures.** A step you could not follow, a diagram that was
ambiguous, a fold that turned out impossible — that is more informative than
a clean success, and it is exactly the signal `sequencer/`'s
`foldability_cost` heuristic needs to learn from.

---

## 6. Later: testing generated output (from M3)

Same protocol, one change: **the folder must not know the model.** Hand them
only our generated book. Record where they stall, what they get wrong, and
whether the finished model is recognisable.

That is the GOAL.md definition of done, and it is the only test that counts.
