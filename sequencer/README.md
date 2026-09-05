# sequencer
Owner: ___

Search over folding sequences using engine/ as the fold-applying primitive.

In:  FoldedState (from engine)
Out: ordered list of fold operations, ending in the fully folded model

Responsibilities:
- At each state, ask engine/ which simple folds are currently valid
- Search (start with plain BFS/greedy; RL only after this works)
- Stop condition: fully collapsed, matches target folded outline

Out of scope: rendering, layer-order visualization.
