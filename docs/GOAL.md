# GOAL

The single sentence version:

> **Type what you want to fold. Get back a few foldable designs, pick one,
> and receive a real instruction book — plus a video of it folding.**

The target is **anything foldable**, not any particular model. The Eiffel
Tower below is a worked example used throughout these docs because it is
concrete and was actually designed by a human, so we can check our answers
against reality. It is not the goal.

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
| *"Eiffel tower"* | A target form the system can reason about geometrically — **and a decision about which design family it belongs to** (§2) | Medium-hard. |
| *"3D shaped"* | The **final** state is not flat. This leaves the regime where almost all origami theory lives. | **Hard.** See ARCHITECTURE.md §3. |
| *"less than 300 steps"* | A **hard budget on sequence length**, enforced during design, not checked afterward | **Hardest. Nobody has done this.** |
| *"single paper"* | One uncut sheet. No glue, no modular units, no cutting. | Medium. Rules out the easy escape hatches. |
| *"a few models"* | Design must be **generative and diverse**, then ranked | Medium. |
| *"user chooses"* | Candidates need comparable, honest cost estimates **before** the user commits | Medium. |
| *"step by step instructions"* | Exact geometry + layer order per step, in standard notation | **Hard.** Not image generation. |
| *"3D folding video"* | A continuous motion between consecutive folded states | Easy *if* steps are simple folds. Hard otherwise. |

---

## 2. "Anything foldable" — what that actually covers

"Fold anything" is unbounded, so the system must **classify the request and
route it**, then tell the user honestly which tier they landed in and what it
costs them. There is no single algorithm that covers all four.

| Tier | Shape class | Method | Sequence? | Our coverage |
|---|---|---|---|---|
| **1. Tree-like** | animals, insects, figures, towers, anything with limbs/flaps | flap tree -> circle-river or **grid packing** (Lang, box pleating) | **Yes** — this is where folding sequences are meaningful | **Primary target.** Plan B. |
| **2. Axisymmetric / swept** | vases, cones, domes, spirals, shells of revolution | Mitani's rotational sweep, ORI-REVO | Yes, usually short | **Secondary.** Cheap to add, good results. |
| **3. Arbitrary polyhedral surface** | masks, busts, scanned meshes, anything non-tree | Origamizer (Demaine–Tachi): tucking molecules + Voronoi | **No.** A simultaneous collapse of thousands of creases, not a sequence. | Optional "fidelity mode" (Plan C) — outputs a pre-creasing template and a collapse video, and *says so*. |
| **4. Out of reach** | disconnected parts, extreme aspect ratios, very high genus | — | — | Refuse, and explain why. |

**This routing decision is the first thing `design/` does.** A stick figure
(flap tree) is the right representation for Tier 1 and the *wrong* one for
Tiers 2 and 3 — a mask has no flaps. Getting this wrong means generating a
crease pattern that cannot represent the thing the user asked for.

**Honest coverage statement:** Tier 1 with ≤8–12 flaps is what we can
realistically do well. Tier 2 is a cheap bonus. Tier 3 is achievable but
fails the "step by step" requirement, which is most of the point. Tier 4 we
decline.

---

## 3. Definition of done

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

---

## 4. Non-goals

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

---

## 5. Beyond origami — the general shape of the problem

Worth naming early, because it explains why the contribution matters, and
because one cheap decision now keeps the door open.

Strip out the paper and the pipeline reads:

```
  declarative goal (natural language)
    -> candidate target structures
    -> design under hard feasibility constraints
    -> a VERIFIED, BUDGETED SEQUENCE of physical operations
    -> instructions an executor (human or machine) can follow
```

That is **budgeted constructive planning with an exact verifier**, and it
recurs well outside origami:

| Domain | The same problem | How close |
|---|---|---|
| **Sheet-metal bending / manufacturing** | Part geometry -> bend sequence, minimum operations, no tool collisions | **Nearly identical.** Akitaya's simple-fold work cites sheet-metal bending as its motivation. Same math. |
| **Self-folding robots, programmable matter** | Target shape -> actuation schedule for a hinged sheet | **Very close.** Rigid origami *is* this field (Tachi; *Automating Rigid Origami Design*, IJCAI 2023). Our sequence becomes an actuation order. |
| **Assembly planning / CAD** | Assembly -> feasible build order under reachability constraints | Close. Classic robotics problem, same search shape. |
| **Retrosynthesis (chemistry)** | Target molecule -> reaction sequence, shortest route, hard feasibility | **Structurally strong match**, different kernel. "Shortest synthesis" is literally a step budget. |
| **DNA origami** | Target nanostructure -> scaffold routing + staple design | Related, genuinely a design-and-sequence problem, but different constraints. |
| **Protein folding** | — | **Not analogous.** Energy-landscape driven, not a sequence of discrete operations. Shares the word "folding" and nothing else. Do not use this as the pitch. |

**What actually transfers is the architecture, not the code.** An origami
geometry kernel is useless for chemistry. What carries over is the pattern:
*propose semantically, verify exactly, search under a budget.*

**So: do not build for generality now.** Premature abstraction is the
standard way student projects die — you build a beautiful general planner and
never ship the origami. Instead, one cheap discipline:

> **Write `sequencer/` against an abstract `Domain` interface, not against
> origami.** (See STACK.md §4.) Search, budget pruning, and partial-plan
> reporting should know nothing about paper. Origami supplies one
> implementation.

That costs nothing today — it is better design regardless — and means the
natural first extension (sheet metal / self-folding robotics, where the state
space is nearly the same) is a new kernel rather than a rewrite.

---

## 6. Why this is worth doing

Two halves of computational origami are well studied and one gap between
them is not:

```
   target shape  ->  crease pattern  ->  folding sequence  ->  instructions
   |________________________________|   |_______________________________|
        heavily researched                    almost nothing
     TreeMaker, Origamizer, COrigami,       Creasy (manual, 2022),
     Learn2Fold, Freeform Origami           Akitaya-Mitani (2013, poster)
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
