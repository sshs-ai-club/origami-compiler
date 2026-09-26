# origami-compiler

**Type what you want to fold. Get back foldable 3D designs, an instruction
book, and a video of it folding.**

```
"I want to make a 3D shaped Eiffel tower with less than 300 steps, single paper"

  -> 4 candidate designs, with honest step counts
  -> pick one
  -> 290 numbered steps, one diagram + one sentence each
  -> [watch it fold]
```

## Why this doesn't already exist

Origami research splits cleanly in two, and only one half is crowded:

```
  target shape ───► crease pattern ───► folding sequence ───► instructions
  └──────────────────────────────┘     └──────────────────────────────┘
      30 years, several teams              one 2013 poster,
   TreeMaker, Origamizer, COrigami,        one dead GUI, nothing else
   Learn2Fold, Freeform Origami
```

Every design tool in existence stops at the crease pattern and hands you a
square covered in lines. Turning that into something a person can fold is
still done by hand, by a handful of expert diagrammers, one model at a time.

**And no tool anywhere can represent the constraint "foldable in under 300
steps"** — because none of them model steps at all. That constraint is the
sharpest form of the gap, and it's what we're aiming at.

## Pipeline

```
[1] intent/      NL -> DesignSpec                       LLM
[2] design/      DesignSpec -> candidate designs        geometry + search
[3] engine/      folded state, layer order, validity    geometry kernel
[4] sequencer/   crease pattern -> steps, under budget  heuristic search
[5] diagrams/    step -> SVG panel                      exact projection
[6] motion/      steps -> 3D animation                  interpolation
[7] app/         assemble the book, UI, export          web
[8] data/        corpus, benchmark, physical tests      humans + paper
```

Modules 3 and 4 are the project. The rest is support.

## Two ideas hold this up

**1. Flat-foldable base + 3D shaping tail.** Nearly all origami theory is
about patterns that fold *flat* — but the user asked for a *3D* tower. Real
complex origami resolves this by being flat for ~80% of the fold (a
flat-foldable base, where all the theory applies) and 3D only in the last
~20% (shaping, which is heuristic). We copy that split exactly.
→ ARCHITECTURE.md §2

**2. A step is a diagram panel, not a crease.** A 31×31 grid has ~1900
creases, yet the published Eiffel Tower is a two-hour intermediate fold.
Human diagrams *batch* — "repeat behind", "pleat every line", "collapse
along existing creases". Defining that batching precisely is the thing
nobody has written down, and it's our main intended contribution.
→ ARCHITECTURE.md §3

## Scope

**Anything foldable**, routed by target class: tree-like figures (our primary
path), axisymmetric forms (cheap bonus), arbitrary surfaces (possible, but no
step sequence exists — see GOAL.md §2). The Eiffel Tower is a worked example
throughout these docs, not the goal.

## Status

**v0 walking skeleton (2026-09-26).** Every stage exists and runs end to end;
what is not built yet is stubbed *and says so in the output*.

```bash
npm install
npm run origami -- "I want to make a realistic dragon, with 21x21 paper, with about ~ 200 steps or less."
# -> out/realistic-dragon/book.html   (spec, candidates, 14 verified steps, crease pattern)
# -> out/realistic-dragon/player.html (watch it fold)
npm run origami -- demo dart          # a complete model, every step engine-verified
npm run origami -- video out/demo-dart/player.html   # -> fold.webm
npm run check                         # typecheck + tests
```

| Stage | v0 | Not yet |
|---|---|---|
| `intent/` | Rule parser (offline) + Claude parser (`--claude`); flags ambiguity, never guesses a budget | — |
| `design/` | Router; stick-figure library + Claude proposals; box-pleat grid packing (L∞ tree condition); step estimate; budget pruning | **Crease pattern from packing** (molecule filling, M5); fitted constants (M2) |
| `engine/` | Exact simple folds (valley/mountain, all layers or one flap), layer order, FOLD export, Kawasaki/Maekawa | Layer solver for arbitrary CPs (flat-folder port, M1); non-simple folds |
| `sequencer/` | StepPlan + replay-as-verification; exact N×N grid precrease planner; authored dart; beam-search skeleton | **Collapse and shaping sequences** (M4) |
| `diagrams/` | Exact Yoshizawa–Randlett SVG panels, layer-correct | View selection |
| `motion/` | Step-faithful keyframes; offline HTML player; `.webm` export | Non-simple operator templates |
| `illustrate/` | Image-model request builder (restyle exact diagrams only) | A provider |

So for the dragon today: the request is understood, three candidate designs
are packed and costed against the budget, and the first 14 steps
(precreasing the 21×21 grid) are generated, verified and animated. The
collapse (~80 steps) and shaping (~32) are the research ahead.

**No GPUs, no model training.** The core is exact geometry and search; the
only neural component is an LLM API call for parsing requests and proposing
stick figures. The whole v1 runs on a laptop. See STACK.md.

## Documents

| | |
|---|---|
| [docs/GOAL.md](docs/GOAL.md) | What we're building and what "done" means |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Literature survey — what exists, what's proven, where the hole is |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The eight stages, the data contracts, the load-bearing decisions |
| [docs/PLANS.md](docs/PLANS.md) | Four routes, rated by mathematical depth and risk |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones M0–M6 with exit tests |
| [docs/OWNERSHIP.md](docs/OWNERSHIP.md) | Who owns what, and the seam between them |
| [docs/START.md](docs/START.md) | **Where to begin** — the first month, step by step |
| [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) | What we reuse, what we build, and the GPL trap |
| [docs/FOLDTESTS.md](docs/FOLDTESTS.md) | What to fold by hand, and what to record |
| [docs/MATH.md](docs/MATH.md) | Study ladder, and the open problems we could actually settle |
| [docs/STACK.md](docs/STACK.md) | TypeScript core, no GPUs, library + thin shells |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | **Read this first** if you're new — the vocabulary is treacherous |
| [docs/decisions.md](docs/decisions.md) | Running log of why we chose things |

**New to the project?** GLOSSARY.md, then GOAL.md, then START.md, then your
own module's README. "Flat-foldable" in particular does not mean what it
sounds like.

**Papers:** `./papers/fetch.sh 1` downloads the five essential ones.

## The plan in one line

Ship a library-backed instruction-book generator first (Plan A), use it to
build the corpus, use the corpus to fit a step-cost model (the contribution),
then build the budget-aware designer on top (Plan B). → [PLANS.md](docs/PLANS.md)

## Workflow

- Branch per change, PR into `main`, one review, no self-merges
- Keep PRs small
- Interface changes (`DesignSpec`, `Candidate`, `StepPlan`,
  `DiagramGeometry`, `MotionKeyframes`) are a joint decision and need a
  `docs/decisions.md` entry
- Stuck more than 48h? Say so immediately, not at the weekly sync

## Standing on

[FOLD format](https://github.com/edemaine/fold) ·
[Rabbit Ear](https://rabbitear.org/) ·
[flat-folder](https://github.com/origamimagiro/flat-folder) ·
[Origami Simulator](https://origamisimulator.org/) ·
[Oriedita](https://oriedita.github.io/)
