# SPEC — v1

## Goal
Crease pattern in -> printable instruction book out. Physically
fold-tested, not just "looks right."

## Pipeline
FOLD file -> engine (folded state + layers) -> sequencer (fold order)
-> diagrams (SVG per step) -> app (assembled book + step text)

## Definition of done
Someone with no prior knowledge of the model folds it correctly using
only our generated output.

## In scope
- Flat-foldable crease patterns
- Simple folds only (single fold along one line)
- Fixed set of classical bases as test inputs

## Out of scope
- Designing new crease patterns
- Reverse / sink / squash / crimp folds
- Arbitrary user models, non-square paper
- RL (revisit only after plain search works)

## Data format
FOLD (JSON): vertices_coords, edges_vertices, edges_assignment (M/V/B/F),
faces_vertices. Used at every module boundary.
