# GOAL

The single sentence version:

> **Type what you want to fold. Get back a few foldable 3D designs, pick one,
> and receive a real instruction book — plus a video of it folding.**

Everything in this repository exists to serve that sentence. This document
pins down exactly what it means, because every word of it hides a decision.

## The target interaction

```
USER:    "I want to make a 3D shaped Eiffel tower with less than
          300 steps, single paper"

SYSTEM:  Here are 4 designs that fit:

         (A) 24x24 grid box pleat      ~180 steps   30cm sq   ★★★☆☆ detail
         (B) 32x32 grid box pleat      ~290 steps   35cm sq   ★★★★★ detail
         (C) axisymmetric tower        ~120 steps   25cm sq   ★★☆☆☆ detail
         (D) 16x16 simplified          ~90 steps    20cm sq   ★★☆☆☆ detail

         [3D preview of each]

USER:    (picks B)

SYSTEM:  -> crease pattern (printable, FOLD + SVG + PDF)
         -> 290 numbered steps, one diagram each, one sentence each
         -> [Watch it fold] -> 3D animation, scrubable, step-synced
```

## What each phrase in the request actually demands

| Phrase | What it demands of the system | Difficulty |
|---|---|---|
| *"I want to make ..."* | Natural language -> a formal design specification | Easy. LLM work. |
| *"Eiffel tower"* | A target 3D form the system can reason about geometrically | Medium. Retrieval or text-to-3D, then heavy simplification. |
| *"3D shaped"* | The **final** state is not flat. This leaves the regime where almost all origami theory lives. | **Hard.** See ARCHITECTURE.md §3. |
| *"less than 300 steps"* | A **hard budget on sequence length**, enforced during design, not checked afterward | **Hardest. Nobody has done this.** |
| *"single paper"* | One uncut sheet. No glue, no modular units, no cutting. | Medium. Rules out the easy escape hatches. |
| *"a few models"* | Design must be **generative and diverse**, then ranked | Medium. |
| *"user chooses"* | Candidates need comparable, honest cost estimates before committing | Medium. |
| *"step by step instructions"* | Exact geometry + layer order per step, in standard notation | **Hard.** Not image generation. |
| *"3D folding video"* | A continuous motion between consecutive folded states | Easy *if* steps are simple folds. Hard otherwise. |

## Definition of done

Not "the output looks plausible." The bar is:

> **A person who has never folded this model, given only our output,
> folds it correctly, alone, and the result is recognisable as the thing
> they asked for.**

This is a physical test with a human and a sheet of paper. It is the only
acceptance criterion. Every module's tests roll up to it.

A secondary, cheaper criterion used during development:

> Every generated step, when applied by the geometry kernel to the
> previous state, yields a state that is physically valid (no
> self-intersection, consistent layer order) and the final state matches
> the design target within tolerance.

Passing the secondary criterion does not imply passing the first. A
sequence can be geometrically perfect and humanly unfoldable.

## Non-goals

These are excluded permanently, not just from v1. They are each a separate
project.

- **Cutting, glue, multiple sheets.** "Single paper" is load-bearing;
  modular origami removes the interesting problem entirely.
- **Wet folding, thickness compensation, real paper mechanics.** Paper is
  an ideal zero-thickness surface. Real folders compensate; we do not model it.
- **Competition-grade figurative complexity** (Lang/Kamiya-tier insects,
  60+ flaps). See RESEARCH.md §6 — past what any automated system does today.
- **Beating human designers on aesthetics.** We generate *foldable and
  correct*; human designers generate *beautiful*. Different objective.
- **Being a crease pattern editor.** Oriedita and ORIPA exist and are good.

## Why this is worth doing

Two halves of computational origami are well studied and one gap between
them is not:

```
   target shape  ->  crease pattern  ->  folding sequence  ->  instructions
   |________________________________|   |_______________________________|
        heavily researched                    almost nothing
     TreeMaker, Origamizer, COrigami        Creasy (manual, 2022),
                                            Akitaya-Mitani (2013, posters)
```

Every design tool in existence stops at the crease pattern and hands you a
piece of paper covered in lines. The step from there to "a human can
actually fold this" is done by hand, by a small number of expert
diagrammers, one model at a time.

**The step budget is the sharpest form of that gap.** "Design me something
foldable in under 300 steps" is a question no existing tool can even
represent, because none of them model steps at all.

That is the contribution this project is aiming at. Everything else is
plumbing around it.
