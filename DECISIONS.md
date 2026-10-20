# Decisions

The authoritative log is `docs/decisions.md`. Add new entries there and mirror them here.

- 2026-09-26 Unit-less "NxN" in a request is read as sheet size. Reason: recorded with other owner decisions in `docs/decisions.md` (commit 1b23567).
- 2026-10-11 Integer-aware packing: lengths chosen with tip placement, short edges inflated; every length change noted. Reason: bird 8×8 unused 29→15; fish is layout-limited.
- 2026-10-11 Contour parity is an invariant on the grid; the "needs a level shifter" conflict is an internal error. Level shifters wait for the midline axial. Reason: bipartite contour graph; Lang's gadget preserves parity.
- 2026-10-11 Step-cost model fitted phase-wise, judged leave-one-out, used only with ≥ 12 published sequences. Reason: honest M2 exit test; corpus stays human work.
- 2026-10-11 Graded M/V hint ladder lang → one → none; only "one planar edge fixed" is proved lossless, the rest empirical (hintbench). Reason: one wrong hint refutes a foldable pattern.
- 2026-10-20 Collapse stages as nested crease subsets (M4a): verifyStage/findCollapse exist; on Lang 6×6 no staged chain found (coarse groups: none verify; per-line closures all grow to the full 151 creases). Stages are a necessary condition only, motion unverified; the subset model likely cannot express simultaneous collapse. Reason: honest first measurement for M4.
