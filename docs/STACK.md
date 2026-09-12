# STACK

What we build it in, what it runs on, and what it does *not* need.

---

## 1. Does this need AI training / GPUs?

**No. Not for the core, and we should actively resist it.**

| Component | Compute needed |
|---|---|
| `engine/` — folded state, layer order, validity | **CPU.** Deterministic geometry + SAT. |
| `sequencer/` — budgeted search | **CPU.** Heuristic search. The expensive part, but it's branch-and-bound, not gradients. |
| `diagrams/` — projection, hidden-line removal | **CPU.** Trivial. |
| `motion/` — step-faithful animation | **CPU/GPU for rendering only.** A rigid rotation per step; any laptop. |
| `intent/` — NL -> DesignSpec | **An LLM API call.** No training. No GPU. Fractions of a cent per request. |
| step text generation | Same. |
| `design/` — target geometry | **Retrieval: free.** Text-to-3D generation: the only GPU-hungry piece, and it should be a hosted API, not self-hosted. Best avoided entirely in v1. |

**The whole v1 runs on a laptop plus an API key.**

This is not a compromise, it is the correct architecture. The two 2026 papers
closest to our work both make the same split:

- **Learn2Fold**: LLM proposes (API-shaped), symbolic simulator verifies
  exactly (CPU). The decoupling *is* the contribution.
- **COrigami**: the neuro part handles semantics; deterministic algorithms
  handle geometry. DeepMind's compute went into the RL **aesthetic polish**
  stage — not into the geometry, which is exact and cheap.

And **OrigamiBench / GamiBench / ORIGAMISPACE** all independently found that
frontier multimodal models fail at single-step folding geometry. So there is
no version of this where a neural net replaces the kernel. Training a model
to do what a SAT solver does exactly would be strictly worse.

**When GPUs would actually enter:** only in Plan D (learned search policy) or
a COrigami-style VLM aesthetic scorer. That is 2028 territory, after M5, and
it is optional even then.

One real cost to watch: SAT on a large crease pattern can take seconds to
minutes. That is CPU time, solvable with a better encoding or a WASM-compiled
solver — not a hardware problem.

---

## 2. Web app or program?

**Both — a headless core library plus two thin shells.**

```
        core library  (TypeScript)
        engine · sequencer · design · diagram geometry · motion keyframes
              |                                    |
       CLI / Node shell                       Web shell
       batch runs, tests,                     the product
       cost-model fitting
```

The core never imports a DOM API. The shells never compute geometry.

**Why not web-only:** you will run thousands of sequencer searches in batch
to fit the cost model and measure scaling. That needs a CLI. A web-only
architecture makes the research half of the project miserable.

**Why not CLI-only:** the deliverable is an instruction book with diagrams
and a 3D animation. That is a web page.

**Why this shape suits the team:** it *is* the split in OWNERSHIP.md. Person
A writes the core library. Person B writes the web shell. The file-based
boundaries (`StepPlan`, `DiagramGeometry`, `MotionKeyframes`) are exactly
the library's public API serialised to disk.

---

## 3. Language: TypeScript

**Decision: TypeScript for the core. Python only for offline analysis.**

The deciding fact: **every tool we want to reuse is JavaScript.**

| Tool | Language | Licence |
|---|---|---|
| [flat-folder](https://github.com/origamimagiro/flat-folder) — layer-order solving | JS | MIT |
| [Origami Simulator](https://origamisimulator.org/) — physical validation | JS / WebGL | MIT |
| [FOLD](https://github.com/edemaine/fold) reference tooling | JS | MIT |
| [Rabbit Ear](https://rabbitear.org/) — FOLD manipulation, geometry, SVG | JS | **GPLv3 ⚠️** |

If the core were Python we would either port `flat-folder` — which implements
a research paper and would cost weeks we do not have — or shell out to Node
anyway and pay the serialisation cost at every call.

> ⚠️ **Correction (2026-09-12).** An earlier version of this document named
> Rabbit Ear as the core substrate. **Rabbit Ear is GPLv3**, which is
> incompatible with our MIT licence: linking it would force the whole project
> to GPLv3. `flat-folder` — the piece we actually need — is MIT. See
> **DEPENDENCIES.md §1** for the three options and the recommendation, and
> settle it before writing code. The JavaScript argument above is unaffected:
> the three MIT tools are all JS.

**Second benefit: no backend.** A TypeScript core runs unmodified in the
browser. The entire product deploys as a **static site** — no server, no
hosting bill, no ops. For a two-person student project that is worth a great
deal.

**Where Python still earns its place:** offline research scripts — cost-model
fitting, corpus statistics, plots, scaling curves. These never ship and never
touch the core. If Plan D happens, it arrives as a separate Python service.

**The cost we accept:** SAT and heavy numerics are slower in JS. Mitigation
is a WASM-compiled solver, and if a specific bottleneck proves fatal we move
that one component, not the architecture.

---

## 4. Keeping the door open (see MATH.md §4 and GOAL.md §5)

One cheap discipline, adopted now, that makes non-origami extension possible
later:

**Write `sequencer/` against an abstract interface, not against origami.**

```ts
interface Domain<State, Op> {
  initial():                     State
  expand(s: State):              Op[]           // valid operations here
  apply(s: State, op: Op):       State | Invalid
  cost(ops: Op[]):               number         // the step-cost model
  heuristic(s: State):           number         // admissible lower bound
  isGoal(s: State):              boolean
  distanceToTarget(s: State):    number         // e.g. Hausdorff
}
```

Origami supplies one implementation of `Domain`. The search — A*, beam,
budget pruning, partial-plan reporting — knows nothing about paper.

This costs nothing now (it is better design regardless) and means that
retargeting to sheet-metal bending, assembly planning, or any other
budgeted constructive-planning problem is a matter of writing a new kernel
rather than rewriting the project. See GOAL.md §5.
