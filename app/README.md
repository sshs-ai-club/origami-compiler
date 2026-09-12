# app
**Owner: Person B** · Stage 7 · Difficulty: low, but lots of work

Ties everything together: the web UI and the assembled instruction book.

**In:** `[Candidate]`, `StepPlan`, SVG panels, `MotionKeyframes`
**Out:** a browsable and printable instruction book

## Responsibilities
- **Candidate chooser** — show the few designs with 3D previews, step
  counts, paper size, and detail level; let the user pick
- **Book view** — numbered steps, one diagram and one sentence each
- **Step text generation** — LLM, given the `FoldOp` and geometry, writes one
  imperative sentence. Must never contradict the diagram; the diagram is
  the source of truth.
- **Crease pattern export** — printable FOLD / SVG / PDF
- **Print / export view** — this is what gets physically fold-tested, so it
  is not a nice-to-have
- Embed the `motion/` player, synced to the step list

## Honesty requirements
The UI must surface, not hide:
- that a step estimate is an **estimate**
- when a `StepPlan` is **partial** (the sequencer stalled), and at which step
- a candidate's foldability **confidence**

A plausible-looking book that cannot actually be folded is worse than an
honest failure.
