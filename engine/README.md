# engine
**Owner: Person A** · Stage 3 · Difficulty: high — this is the foundation

The geometry kernel. Everything else trusts this module to be correct.

**In:** FOLD crease pattern, or a `FoldedState` + a `FoldOp`
**Out:** `FoldedState`, validity verdicts, layer orders

```
FoldedState {
  faces:       [Polygon]       # R^2 (flat) or R^3 (shaped)
  layer_order: PartialOrder    # on OVERLAPPING face pairs only
  cp:          FOLD
  creases:     { edge_id: angle }
}
```

## Responsibilities
- Parse and validate FOLD (`vertices_coords`, `edges_vertices`,
  `edges_assignment` M/V/B/F, `faces_vertices`, `faceOrders`)
- Apply a fold operation: update face geometry **and** layer order
- **Layer-order solving** — Akitaya–Demaine–Ku facewise conditions (O(n³)
  constraints between overlapping face pairs) encoded as SAT
- Local flat-foldability: Kawasaki (alternating angles sum to 180°) and
  Maekawa (M−V = ±2) per vertex
- Collision detection: layer crossing in 2D, face intersection in 3D
- Enumerate which fold operations are valid from a given state
  (the sequencer's expansion function)

## Read before writing code
- Akitaya, Demaine & Ku, *Computing Flat-Folded States* (OSME 2024) — the
  facewise formulation this module implements
- [`flat-folder`](https://github.com/origamimagiro/flat-folder) source —
  a working implementation. **Wrap or port it. Do not invent your own
  formulation.**

## Two warnings
1. **Kawasaki + Maekawa are necessary but not sufficient.** A pattern can
   pass at every vertex and still have no valid global layer order. Never
   report "flat-foldable" from local checks alone.
2. **Flat and 3D states need different validity predicates.** Keep both
   behind one interface; do not try to unify them.

## Out of scope
Choosing which fold to apply (-> `sequencer/`). This module answers "is this
valid and what does it produce", never "what should we do next".

## Status (v0)
`geom.ts`, `state.ts`, `fold.ts` (simple folds; flap folds carry resting layers), `foldfile.ts` (FOLD crease pattern + folded form with `faceOrders`), `local.ts` (Kawasaki/Maekawa). The layer order is a global stack rank, valid for simple-fold states only; the flat-folder port is still M1.
