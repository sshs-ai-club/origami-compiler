# motion
**Split ownership** · Stage 6 · Difficulty: low for simple folds

StepPlan -> a 3D animation the user can watch and scrub, synced to the steps.

| Half | Owner | Work |
|---|---|---|
| **Keyframes** | **Person A** | Per step, the rigid transform from `before` to `after`: rotation axis, angle, moving face set, resulting layer update. |
| **Rendering** | **Person B** | Three.js scene, camera, scrub bar synced to the step list. |

```
MotionKeyframes {
  steps: [ { step_id, axis: [[x,y,z],[x,y,z]], angle_deg: 180,
             moving_faces: [id], layer_update: {...},
             duration_ms: 800 } ]
}
```

## Why this is nearly free
For a **simple fold**, the animation is one rigid rotation of the moving
faces about the crease line, 0° → 180°, then a layer-order update. No
solver, no physics. Restricting the base sequence to simple folds makes the
whole "watch it fold" feature almost trivial — this is an independent
argument for that restriction.

Non-simple operators (reverse, squash, sink, petal, crimp) each need a
hand-authored animation template. Add them one at a time.

## Two strategies, and why we picked one
- **Step-faithful** (ours): animate `before -> after` per step. Matches what
  the human is being told to do.
- **Physical collapse** ([Origami Simulator](https://origamisimulator.org/)):
  a GPU compliant-constraint solver that folds *every crease simultaneously*
  from one global fold-angle parameter. Beautiful, but it cannot illustrate
  step 147.

We use step-faithful as the primary path and Origami Simulator for physical
validation and as a fallback. See docs/decisions.md.

## Status (v0)
`keyframes.ts` (per op: faces already cut, moving set, axis, signed angle), `player.ts` (self-contained HTML canvas player, scrub + step captions, `?autoplay=1`). `npm run origami -- video <player.html>` records a `.webm` with headless Chromium.
