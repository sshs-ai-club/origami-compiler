# design
**Owner: Person A** · Stage 2 · Difficulty: high

DesignSpec -> several candidate designs, ranked, each with an honest step estimate.

**In:** `DesignSpec`
**Out:** `[Candidate]`

```json
{
  "id": "eiffel_g32",
  "base_cp": "<FOLD>",
  "shaping_plan": [ { "op": "...", "region": "..." } ],
  "est_steps": 290,
  "paper_spec": { "size_cm": 35, "grid_n": 32, "sheet": "square" },
  "confidence": 0.7
}
```

## Responsibilities
- Target 3D form: retrieve from `data/`, or generate + aggressively simplify
- **Flap-tree extraction** — 3D form -> metric tree of flaps (skeleton /
  medial axis, then simplify to ~6–12 flaps)
- **Grid packing** — place flaps on an N×N box-pleating grid; discrete
  analogue of Lang's circle/river packing
- **Molecule filling** — fill packed regions with standard crease molecules
- **Step estimation** *before* sequencing: `precrease(N) + c1·F + c2·S`,
  with constants fitted in `data/`
- Prune over-budget candidates; generate diversity across grid size, flap
  topology, and detail level; rank

## The critical constraint
`base_cp` must be **flat-foldable**. All 3D-ness lives in `shaping_plan`.
See ARCHITECTURE.md §2 — this separation is what makes the project tractable.

## Out of scope
Sequencing (-> `sequencer/`). This module estimates step count; it does not
compute the sequence.
