# data
**Owner: Person B** · Stage 8 · Difficulty: low skill, high value
**Start this before any code exists — it is on the critical path.**

The corpus and benchmark. Everything empirical in the project is fitted
against, or validated by, this directory.

```
data/
  cp/          crease patterns in FOLD
  sequences/   published step sequences, transcribed with batch annotations
  targets/     3D target forms (meshes / flap trees)
  foldtests/   physical fold test reports — one per attempt
  fitted/      step-cost model constants
```

## Why this blocks everyone
- **M2 (the step-cost model) cannot start without it.** The constants
  `precrease(N)`, `c1`, `c2` are fitted from these sequences. No corpus, no
  cost model, no step estimation, no designer.
- It is the **only** source of ground truth for whether generated sequences
  resemble human ones.

## Contents required by milestone
| Milestone | Needs |
|---|---|
| M0 | 5 models in FOLD with published step counts |
| M1 | 15 models |
| M2 | 20 published sequences transcribed to **panel counts with batch annotations** |
| M5 | 30 models |

## Sequence record schema (`data/sequences/*.json`)
Validated by `sequencer/corpus.ts`; run `npm run origami -- corpus validate`.
Copy `TEMPLATE.json`; `EXAMPLE.json` shows a filled record (not real data).

| Field | Meaning |
|---|---|
| `model`, `source`, `paper` | Name; author, book/URL and page; paper size and shape |
| `published` | `true` only for a transcription of a real published diagram sequence. Requires a real `source` (no `<fill in>`). Only these count toward the 20 and the fit. |
| `grid_n` | Precrease grid size N the model is built on, or `null` if not grid-based |
| `flaps` | F, number of flaps in the base |
| `shaping_ops` | S, number of shaping operations (rounding, sinks, reverse folds that finish the form) |
| `features_note` | optional, anything unusual |
| `total_panels` | must equal `steps.length` |
| `steps[].panel` | 1..n in order, no gaps |
| `steps[].phase` | `precrease`, `collapse` or `shaping`; non-decreasing along the sequence |
| `steps[].batch` | `single`, `symmetry`, `repeat`, `precrease`, `collapse` (see `sequencer/plan.ts`) |
| `steps[].primitive_folds` | folds done in that panel, at least 1; exactly 1 when `batch` is `single` |

### Transcription checklist (humans)
1. Work from the diagram itself. Never fill a record from memory; never guess a panel count.
2. **One panel = one drawn diagram box** (one numbered figure) in the source. A step number shared by two drawings is two panels. An "unfold" drawn as its own figure is a panel; an unfold stated only in the caption of the next figure is not.
3. "Repeat behind", "rotate and repeat", "repeat on the other side": **no extra panel** unless the source draws the result. Record the single drawn panel with `batch: "symmetry"` and `primitive_folds` set to all folds it implies (for example 2 for "repeat behind").
4. "Fold each of the four corners to the centre" in one drawing is one panel, `batch: "repeat"`, `primitive_folds: 4`.
5. Inset or enlarged detail drawings are panels only if they are numbered steps; a magnified duplicate of the previous figure is not.
6. A view change (flip, rotate) that is drawn as a figure of its own is a panel; one merely implied between figures is not (set `view_change`).
7. Set `phase`: `precrease` until the model is folded flat on the creases, `collapse` until the base is complete, `shaping` after.
8. Count `flaps` (F) on the finished base and `shaping_ops` (S) from the shaping phase. Write `grid_n` only if the source states a grid of N x N.
9. Check `total_panels` against the source's last figure number, then run `corpus validate`. Set `published: true` last.

## The rule
**Nothing enters this directory without a physical fold test.** A crease
pattern nobody has folded is a hypothesis, not data. Record failures — a
sequence that a human could not follow is more informative than one that worked.

## Fold test report format
```
model, folder_name, date, paper_size, minutes_taken,
completed: yes|no, failed_at_step: int|null,
notes: where they hesitated, what was ambiguous, what the diagram got wrong
```

The "where they hesitated" field is the most valuable data in the project.
It is the feedback signal for `sequencer/`'s `foldability_cost` heuristic.

## Longer term
Publishing this as a public (crease pattern, human sequence, diagram)
benchmark is Arm E in ROADMAP.md. No such dataset exists, and it may well be
cited more than the compiler itself.
