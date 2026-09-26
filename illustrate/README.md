# illustrate
**Optional** · after Stage 5 · Difficulty: low (integration)

Turns exact step diagrams into photo-like or hand-drawn images with an
image-generation model, for people who read pictures better than line
diagrams.

**In:** `Step` + the exact SVG from `diagrams/`
**Out:** one image per step, always shown next to the exact diagram

## The rule

**Geometry first, pixels second.** The image model never decides what a fold
looks like. Every request carries the engine-rendered diagram as a
conditioning image (img2img / ControlNet-style structure guidance) and asks
only for a restyle. The reason is in RESEARCH.md §4: OrigamiBench, GamiBench
and ORIGAMISPACE all found frontier multimodal models fail at single-step
folding geometry. Asked to draw "step 12" from text, a model draws a plausible
wrong fold, and a wrong picture is worse than none (GOAL.md §3).

The same applies to video: `motion/` produces the exact animation (and
`npm run origami -- video` records it). A video model may restyle those frames;
it may not invent them.

## Status

- `illustrationRequests()` builds the per-step requests (prompt, negative
  prompt, conditioning SVG). The CLI writes them to `illustrate.json`.
- No provider is wired in. Picking one, and its API key and cost, is a
  project decision. Implement `ImageProvider` and call `illustrate()`.
- Open question for the fold tests (FOLDTESTS.md): do stylised images
  actually help a first-time folder, or only look nicer? Measure before
  shipping them as the default view.
