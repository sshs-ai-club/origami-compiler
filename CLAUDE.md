# CLAUDE.md

Invariants for anyone (human or Claude Code) changing this repository. They
are settled; re-deciding them needs a `docs/decisions.md` entry.

## Commands

```bash
npm install
npm run check                 # both typechecks + all tests; run before every commit
npm run origami -- "I want to make a realistic dragon, 21x21, about 200 steps"
npm run origami -- demo dart  # a complete authored model
npm run origami -- video out/demo-dart/player.html
```

Output goes to `out/` (gitignored). Open `book.html` and `player.html`.

## Invariants

- **TypeScript core, no DOM.** Core modules (`engine intent design sequencer
  diagrams motion illustrate`) are checked by `tsconfig.core.json`, which has
  no DOM and no Node types. Anything touching the filesystem, a browser or a
  process lives in `app/`.
- **FOLD at every boundary.** Crease patterns and folded states leave the
  engine as FOLD (`engine/foldfile.ts`). Do not invent a format.
- **No GPL dependencies.** Rabbit Ear and Creasy are GPL; the repo is MIT
  (DEPENDENCIES.md §1). Creasy is a behavioural oracle only.
- **Never invent a layer formulation.** The engine's global stack rank is
  valid only for states built by simple folds. For any other crease pattern
  use `engine/flatfold.ts` (flat-folder, facewise conditions).
- **A crease pattern is done only when flat-folder verifies it.** Anything
  else is a blueprint and must be shown as one.
- **Base + shaping tail.** `sequencer/` sequences flat-foldable bases;
  shaping is a library estimate. Do not mix them.
- **A step is a diagram panel.** `cost(plan) = plan.steps.length`.
- **Never lie.** Estimates are labelled as estimates; unfitted constants say
  "placeholder"; partial plans say where they stop; unsupported tiers say why.
  Never add a code path that renders a plausible-looking but unverified step.
- **Geometry first, pixels second.** Image/video models may restyle exact
  engine renders; they never originate fold geometry (illustrate/README.md).
- **Neural = semantics only.** Claude parses requests and proposes stick
  figures; its output is schema-validated and checked. Everything geometric is
  exact and deterministic. The rule-based parser must keep working offline.

## Testing rule (START.md)

The geometry kernel fails silently. **If you can't write a test that catches
wrongness, don't write the code.** Every engine behaviour has a test built from
a case checked by hand or by paper; add the fixture before the code.

## Layout

```
engine/      geometry, FlatState, simple folds, FOLD I/O, Kawasaki/Maekawa
intent/      request -> DesignSpec (rules.ts offline, llm.ts Claude)
design/      stick figures, router, box-pleat packing, estimates, candidates
sequencer/   StepPlan, replay, grid precrease planner, beam-search skeleton
diagrams/    exact step geometry -> Yoshizawa–Randlett SVG
motion/      keyframes (rigid rotations) -> self-contained HTML player
illustrate/  optional image-model restyling of exact diagrams (no provider)
app/         pipeline, CLI, instruction book, video recorder
vendor/      flat-folder solver (unmodified) and the BP Studio core bundle;
             never edit, rebuild/copy from the pinned commit (see each README)
```
