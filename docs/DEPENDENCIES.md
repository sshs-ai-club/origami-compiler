# DEPENDENCIES

What we reuse, what we adapt, what we must build, and the licensing trap.

Licenses below were read from each project's `LICENSE` / `package.json` on
2026-09-12. **Re-verify before shipping anything publicly.**

---

## 1. The licensing decision — read this first

| Project | License | Effect on us |
|---|---|---|
| **flat-folder** (Ku) | **MIT** | ✅ Free to fork, adapt, relicense |
| **FOLD** (Demaine, Ku, Kraft) | **MIT** | ✅ Free |
| **Origami Simulator** (Ghassaei) | **MIT** | ✅ Free |
| **rigid-origami** (Geiger) | MIT-style | ✅ Free |
| **Rabbit Ear** (Kraft) | **GPLv3** | ⚠️ **Copyleft — see below** |
| **Creasy** (xkevio) | **GPL-3.0** | ⚠️ Copyleft, and Java |

Our repo is currently **MIT** (`LICENSE`, © 2026 sshs-ai-club).

**The trap:** STACK.md previously recommended Rabbit Ear as the core
substrate. Rabbit Ear is **GPLv3**. Linking it into an MIT core and
distributing the result is not permitted — the combined work would have to
be GPLv3. That recommendation was wrong and is corrected here.

**Three options:**

1. **Avoid Rabbit Ear; stay MIT.** ← **recommended**
   `flat-folder` (MIT) is the piece we actually need. FOLD parsing is a
   small JSON schema, and SVG output we must write ourselves anyway to get
   Yoshizawa–Randlett notation. The realistic cost of dropping Rabbit Ear is
   a couple of weeks of geometry utilities — meaningful, not fatal.
2. **Adopt GPLv3 for the whole project.** Perfectly respectable for an
   academic/club project. Costs: anyone reusing our work inherits copyleft,
   and we can no longer relicense later without every contributor's consent.
3. **Rabbit Ear in the web shell only.** ✗ Does not work. GPL obligations
   attach at distribution of the combined work, and the shell ships with the
   core.

**Decide this before writing code**, not after — reversing it later means
rewriting whatever touched Rabbit Ear.

---

## 2. What we reuse, per module

| Stage | Existing tool | License | How we use it | Work needed |
|---|---|---|---|---|
| format | **FOLD spec** | MIT | Interchange at every boundary | None. Use as-is. |
| `engine/` layer order | **flat-folder** | MIT | **The** layer-order solver | **Extract into a library — see §3** |
| `engine/` validation | **Origami Simulator** | MIT | Physically validate a candidate CP | Headless harness — see §4 |
| `sequencer/` | **Creasy** | GPL | ⚠️ **Reference only, do not link** — see §5 | — |
| `design/` Tier 1 | TreeMaker (Lang) | check | Algorithm reference for tree packing | We implement the grid case ourselves |
| `design/` Tier 3 | Origamizer (Tachi) | check | Optional fidelity mode, Plan C | Out of scope until post-M5 |
| motion (3D arm) | **rigid-origami** (Geiger) | MIT-style | Rigid-origami design search, Python | Not needed before M5 |
| authoring | **Oriedita**, **ORIPA** | verify | Desktop CP editors for making test data by hand | None — tools, not dependencies. No linking, so no license issue. |
| evaluation | **GamiBench**, **ORIGAMISPACE** | verify | Ready-made benchmark data | Check dataset licenses before use |

---

## 3. flat-folder — the one integration that matters

**This is the highest-value piece of existing software for us, and it needs
real work to be usable.**

What it is: Jason Ku's implementation of *Computing Flat-Folded States*
(Akitaya, Demaine & Ku, OSME 2024). Given a crease pattern it computes valid
flat-folded states — exactly what `engine/` needs. Confirmed from its README,
it builds the overlap graph and enforces four constraint families:

- **taco–taco**
- **taco–tortilla**
- **tortilla–tortilla**
- **transitivity**

and it **decomposes the `faceOrder` variables into independent components**,
solving each separately — the polynomial decomposition plus per-component
exponential solve from the paper. It can return *all* states, or cap the
count per component at 1/10/100/1000.

It reads FOLD, SVG, OPX and CP; for FOLD it needs only `vertices_coords` and
`edges_vertices`, and will construct faces itself if `faces_vertices` is
absent. It flags Maekawa and Kawasaki violations on import.

**The problem: it is a browser application, not a library.** You upload a
file to a web page and click "Fold". There is no `solveLayerOrders(fold)`
function to call.

**The work:** fork it, strip the UI, expose the solver as a module. MIT
licence makes this unambiguously allowed.

```ts
// the interface we need to surface
solveLayerOrders(fold: FOLD, opts?: { limit?: number })
  : { states: FaceOrder[], components: Component[], violations: Vertex[] }
```

**Do this early.** It is bounded, it is the foundation of `engine/`, and
until it exists nothing downstream can be tested. Budget 2–3 weeks and treat
it as M1's real content. Reading the solver alongside the 2024 paper is also
the fastest way to actually understand layer ordering.

**Do not write your own layer solver first.** Port this, understand it, and
only reimplement if a measured limitation forces it.

---

## 4. Origami Simulator — headless validation

MIT, WebGL, GPU compliant-constraint solver. We use it to answer "is this
crease pattern physically foldable at all", not to animate steps
(ARCHITECTURE.md §6).

**Work needed:** it is interactive and browser-bound. For batch validation
over a corpus we need it headless.

**Approach:** drive it in headless Chromium via Playwright. That is a normal
integration, not a hack, and it avoids reimplementing a GPU solver.
*(Chromium and Playwright are already installed in this dev environment —
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Do not run `playwright install`.)*

---

## 5. Creasy — reference, never a dependency

Closest existing thing to our sequencer: a Java GUI implementing Akitaya's
simplification algorithm, showing all valid next simplification steps.
Unmaintained since 2022. **GPL-3.0.**

**Two reasons not to link it:** copyleft, and it is Java while our core is
TypeScript.

**How to use it instead:** as a **behavioural oracle**. Run it on a crease
pattern, record which next-steps it reports, and check our sequencer against
that list. Comparing outputs creates no derived work.

**Work from the papers, not the source.** Akitaya–Mitani 2013 and the 2017
hardness paper describe the algorithm. Reimplementing from a GPL codebase you
have studied line-by-line is legally murkier than implementing from the
published description — and the papers are clearer anyway.

---

## 6. What does not exist and we must build

The honest answer to "maybe this already exists but I couldn't find it":
**you couldn't find it because it doesn't exist.** Everything downstream of
layer ordering is ours to write.

| Thing | Prior art | Verdict |
|---|---|---|
| Layer-order solver | flat-folder | **Exists.** Port it. |
| FOLD parsing / geometry utilities | Rabbit Ear (GPL) | Exists but copyleft — write our own, ~2 weeks |
| **Step-cost model** | **none anywhere** | **Build. This is the contribution.** |
| **Budget-aware sequencer** | Creasy (manual), Akitaya–Mitani 2013 (poster) | **Build.** No usable implementation exists. |
| **Yoshizawa–Randlett diagram renderer** from a folded state | none | **Build.** Needs layer-aware hidden-line removal. |
| **Step-faithful animator** | none (simulators do simultaneous collapse) | **Build.** Easy for simple folds. |
| **Budget-aware designer** | TreeMaker, COrigami (no budget) | **Build**, restricted to the grid case |
| **(CP, human sequence, diagram) corpus** | none public | **Build.** Possibly our most-cited output. |

---

## 7. Recommended stack, revised

```
core (TypeScript, MIT)
├── FOLD I/O ................ own code, from the MIT spec
├── geometry utils .......... own code (replaces Rabbit Ear, avoids GPL)
├── layer solver ............ forked flat-folder (MIT), extracted to a library
├── sequencer ............... own code, abstract Domain interface (STACK.md §4)
├── diagram geometry ........ own code
└── motion keyframes ........ own code

shells
├── Node CLI ................ batch runs, corpus fitting, tests
└── web ..................... static site, no backend

validation (dev-time only, not shipped)
└── Origami Simulator via headless Playwright
```

---

## 7a. Status (2026-09-26)

- **flat-folder:** done. Solver files vendored unmodified in `vendor/flat-folder/`,
  wrapped by `engine/flatfold.ts`.
- **BP Studio** (MIT, TypeScript): added. Its core is bundled from a pinned
  commit into `vendor/bp-studio/core.mjs` and gives the box-pleating layout
  (`design/blueprint.ts`). It does not produce flat-foldable crease patterns.
- **Licence:** confirmed MIT, no GPL code (decisions.md).

## 8. Immediate actions

1. **Decide the licence question in §1.** Blocks everything else.
2. **Fork `flat-folder`** and open an issue for "extract solver as library."
3. **Verify licences** for Oriedita, ORIPA, TreeMaker, GamiBench,
   ORIGAMISPACE before depending on or redistributing any of them. The
   Oriedita repository path could not be resolved from this environment —
   confirm it by hand.
4. Record the outcome of (1) in `docs/decisions.md`.
