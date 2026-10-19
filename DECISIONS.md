# Decisions

The authoritative log is `docs/decisions.md`. Add new entries there and mirror them here.

- 2026-09-26 Unit-less "NxN" in a request is read as sheet size. Reason: recorded with other owner decisions in `docs/decisions.md` (commit 1b23567).
- 2026-10-11 Integer-aware packing: lengths chosen with tip placement, short edges inflated; every length change noted. Reason: bird 8×8 unused 29→15; fish is layout-limited.
- 2026-10-11 Contour parity is an invariant on the grid; the "needs a level shifter" conflict is an internal error. Level shifters wait for the midline axial. Reason: bipartite contour graph; Lang's gadget preserves parity.
- 2026-10-11 Step-cost model fitted phase-wise, judged leave-one-out, used only with ≥ 12 published sequences. Reason: honest M2 exit test; corpus stays human work.
- 2026-10-11 Graded M/V hint ladder lang → one → none; only "one planar edge fixed" is proved lossless, the rest empirical (hintbench). Reason: one wrong hint refutes a foldable pattern.
