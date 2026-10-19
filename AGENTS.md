# origami-compiler

Turns a natural-language request into foldable 3D origami designs, an instruction book and a folding video. Overview: `README.md`; rules and layout: `CLAUDE.md`.

## Invariants
- The invariants are in `CLAUDE.md` (TypeScript core with no DOM, FOLD at every boundary, no GPL deps, flat-folder verifies crease patterns, never lie, geometry first, neural = semantics only). They are settled.
- Re-deciding one needs a `docs/decisions.md` entry.
- Write the test before the geometry code (`docs/START.md`).
- `npm run check` passes before every commit.

## How to work here
- Read PLAN.md and DECISIONS.md first.
- DECISIONS.md entries are settled; don't re-open them unless sunwoo asks.
- Keep PLAN.md updated.
- Follow design.md for UI work (none exists yet).

## Failure recovery
- Same check fails twice on the same cause: stop, print the exact error, restate the plan and ask.
- Max 3 attempts per unit. Retry only with the failure reason in hand.
- A fix touches only the failing unit. Adjacent issues are listed, not fixed.

## Delegation
- Use explorer for searches touching >5 files; reviewer before declaring a milestone done.
- Fan out workers only when PLAN.md lists a graph for the milestone. If the work splits cleanly and there is none, write it first. Otherwise work in one session.
- Edit-nodes run in their own worktree. Return only failed units on retry.
- All checks go through `scripts/check.sh` (Stop hook, merge step, worker self-check).
