# design
**Owner: Person A** · Stage 2 · Difficulty: high

DesignSpec -> several candidate designs, ranked, each with an honest step estimate.

**In:** `DesignSpec`
**Out:** `[Candidate]`

```json
{
  "id": "eiffel_g32",
  "tier": 1,
  "family": "box_pleat",
  "base_cp": "<FOLD>",
  "shaping_plan": [ { "op": "...", "region": "..." } ],
  "est_steps": 290,
  "paper_spec": { "size_cm": 35, "grid_n": 32, "sheet": "square" },
  "confidence": 0.7
}
```

## Stage 2a — the router (do this first)

There is no single design algorithm for "anything foldable." The module
**classifies the target and routes it** to the right family. Getting this
wrong means producing a crease pattern that cannot represent what was asked
for — a stick figure is the right abstraction for a dragon and useless for
a mask.

| Tier | Target class | Route |
|---|---|---|
| 1 | tree-like — limbs, flaps, branches | flap tree -> grid packing (**our primary path**) |
| 2 | axisymmetric / swept — vases, cones, domes | rotational sweep (Mitani / ORI-REVO style) |
| 3 | arbitrary polyhedral surface — masks, busts | surface approximation (Origamizer). **No step sequence exists.** Route to fidelity mode and label it honestly. |
| 4 | out of reach | refuse with a reason |

See GOAL.md §2. The router's verdict, and its confidence, must reach the user.

## Stage 2b — Tier 1 pipeline (the main path)

- **Target geometry** — retrieve from `data/`, or generate and aggressively
  simplify
- **Flap-tree extraction** — 3D form -> metric tree of flaps (skeleton /
  medial axis, then simplify to ~6–12 flaps)
- **Grid packing** — place flaps on an N×N box-pleating grid; the discrete
  analogue of Lang's circle/river packing
- **Molecule filling** — fill packed regions with standard crease molecules
- **Step estimation** *before* sequencing: `precrease(N) + c1·F + c2·S`,
  with constants fitted in `data/`
- **Prune, diversify, rank** — drop over-budget candidates; vary grid size,
  flap topology, and detail level to produce genuinely different options

## The critical constraint

`base_cp` must be **flat-foldable**. All 3D-ness lives in `shaping_plan`.
See ARCHITECTURE.md §2.

**The two are co-designed, not sequential.** Do not design a flat base and
then ask how to make it 3D — the base must already carry flaps in the right
places for the shaping to be possible. A `Candidate` is always the pair.

## Out of scope

Sequencing (-> `sequencer/`). This module *estimates* step count; it does not
compute the sequence. That separation is what lets the user see honest
numbers before committing (ARCHITECTURE.md §5).

## Status (v0)
`router.ts`, `library.ts` (stick figures), `llm.ts` (Claude-proposed stick figures, validated), `packing.ts` (box-pleat grid packing, L∞ tree condition, symmetric search), `blueprint.ts` (BP Studio layout of the packing), `complete.ts` (blueprint -> crease pattern, verified by flat-folder), `estimate.ts` (precrease exact, collapse/shaping placeholder constants), `candidates.ts`.

### Crease-pattern completion — the open problem

BP Studio gives flap/river contours (hinges) and ridges. Inside a flap region
nothing more is needed (the crane's blueprint is the complete preliminary base
and verifies). Where flap regions leave paper between them, the blueprint has
vertices where a ridge meets two hinges — degree 3, never flat-foldable. The
leftover paper must be filled with elevation / axial-parallel creases so it
folds into the base. Sources: Lang, *Origami Design Secrets* 2nd ed.
ch. 13–14 (uniaxial box pleating); Lang & Tsai, *Generalized Offset
Pythagorean Stretches*, OSME 7 (2018); Tsai, OSME 8 (2025); Lang & Demaine,
*Facet Ordering and Crease Assignment in Uniaxial Bases*. The test for any
completion is already in place: `creasePatternFromBlueprint` must return
"verified", and the folded form must show one flap per leaf.
