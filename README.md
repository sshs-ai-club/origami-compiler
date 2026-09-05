# origami-compiler

Turn a crease pattern into a folding instruction book: numbered steps,
one diagram per step, that a human can actually fold from.

## Why

Crease patterns are compact but unreadable to non-experts. Diagram books
are readable but hand-drawn one model at a time. We're building the
missing piece in between.

## Pipeline
FOLD file (crease pattern)
-> engine/ folded state + layer ordering, one fold at a time
-> sequencer/ search for a valid sequence of folds
-> diagrams/ render each step as an SVG diagram
-> app/ assemble into an instruction book, add step text

Each stage is one module, one owner — see that folder's README for its
exact input/output contract.

## v1 scope

- Input: flat-foldable crease patterns only, from a small fixed set of
  classical bases (waterbomb, bird base, frog base, crane)
- Output: ordered simple-fold steps, one diagram + one sentence each
- **Done** = someone who has never folded the model does it correctly
  from our output alone, no help

**Out of scope for v1:** designing crease patterns from scratch,
non-simple folds (reverse/sink/squash), non-square paper, arbitrary
user-uploaded models.

## Modules

| Folder | Owner | Contract |
|---|---|---|
| `engine/` | | folded state, layer order, foldability checks |
| `sequencer/` | | search over fold sequences |
| `diagrams/` | | crease pattern + fold -> SVG |
| `app/` | | FOLD import, UI, step text, print/export |
| `data/` | | FOLD test files + expected results |

See `docs/SPEC.md` for more detail, `docs/decisions.md` for why we
chose things the way we did.

## Workflow

- Branch per change, PR into `main`, 1 review required (CODEOWNERS
  auto-requests the right person)
- Keep PRs small
- Stuck >48h? Say so in the group chat
