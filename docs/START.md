# START

Where to begin. Written for the first month, assuming you will be pairing
with Claude Code.

---

## The one warning that matters

**The geometry kernel is hostile to AI-assisted coding. Everything else is
friendly.**

SVG rendering, FOLD parsing, the web UI, Three.js — vibe freely. You see
immediately when it's wrong.

The layer solver is different. **A subtly wrong layer order produces a
diagram that looks fine and a model nobody can fold.** It fails silently, and
you will not notice for weeks. That failure mode is what kills projects like
this one.

> **Rule: if you can't write a test that catches wrongness, don't vibecode it.**

Which means the checkable examples come *before* the code. That's why Step 0
and Step 3 below look like they're not programming.

---

## Step 0 — fold paper. Actually do it. (1 hour)

Fold a **preliminary base** and a **waterbomb base** — same crease pattern,
opposite mountain/valley assignment. Pencil-number the faces first. Then read
the layer stack off the open edge of each.

Then try to fold something on layer 3 without disturbing layers 1 and 2.

You cannot design a data structure for a thing you have not held. This is the
highest-value hour in the whole first month. See FOLDTESTS.md §2.

---

## Step 1 — decide the licence, then scaffold (half a day)

**First: DEPENDENCIES.md §1.** Rabbit Ear is GPLv3 and our repo is MIT.
Decide whether to avoid it (recommended) or relicense. Reversing this later
means rewriting whatever touched it. Record the choice in `decisions.md`.

Then scaffold: TypeScript, a `core/` with no DOM imports, a Node CLI shell,
Vitest, and a `CLAUDE.md` holding the invariants — TypeScript, no DOM in
core, FOLD at every boundary, never invent a layer formulation, use the
facewise conditions. A good `CLAUDE.md` stops Claude Code re-deciding settled
questions every session and is worth more than any other half-day.

---

## Step 2 — FOLD in, SVG out. No folding at all. (2–3 days)

Load a crease pattern, render it with mountain/valley styling, write it back
out. That's the whole step.

This is your **visual debugger**. You will lean on it for everything after,
and every hour it takes now saves five later. Ship it before touching
anything that folds.

---

## Step 3 — the 1D case ⭐ (1 week)

**Before 2D. Do not skip this.**

A strip of *n* segments with *n−1* creases. Fold it flat. Enumerate the valid
layer orders; detect the invalid ones.

Why this is the right first real milestone:

- It is the entire layer-order concept at a scale you can hold in your hand
- It has **known answers** — *stamp folding* — to check against
- The taco/tortilla constraints appear in their simplest possible form
- You can verify every case with an actual strip of paper (FOLDTESTS.md, Tier 0)
- It is small enough to debug completely

**If you can't get 1D right, 2D is hopeless. If you can, you understand layers.**

Fold the Tier 0 test first so you have ground truth before you write the solver.

---

## Step 4 — the 2D layer solver (3–4 weeks)

Now the real thing. **Do not write your own from scratch.**

`flat-folder` (MIT) is Jason Ku's implementation of the paper you're about to
implement. Fork it, strip the UI, expose the solver as a library. See
DEPENDENCIES.md §3 — this is bounded, high-value work, and reading the solver
alongside the 2024 paper is the fastest way to actually understand layer
ordering.

Validate against the Tier 1 bases you folded in Step 0, whose full layer
permutations you recorded by hand.

---

## Then

ROADMAP.md M1 onward. By this point you have a visual debugger, a working
layer solver, and hand-verified ground truth — which is everything the
sequencer needs to stand on.

---

## Working with Claude Code on this project

- **Point it at sources.** "Read `flat-folder`'s solver before writing this"
  beats any amount of prompt detail.
- **Test-first for the kernel.** Write the expected output — from paper you
  folded — then let it implement against that.
- **Fixture everything.** Every hand-verified case goes in `data/` the moment
  you verify it.
- **Never accept geometry code you can't test.** "It looks right" is not a
  signal here.
- **Small PRs, one review.** See OWNERSHIP.md.

## Reading, in parallel

`./papers/fetch.sh 1` gets the five essential papers. Start with
`hull-survey`, then `flatfolder-2024` while you're on Step 4. MATH.md §6 has
a six-month reading schedule.
