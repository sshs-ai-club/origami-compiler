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
