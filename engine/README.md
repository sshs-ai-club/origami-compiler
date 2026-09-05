# engine
Owner: ___

Folded-state representation and simple-fold operations.

In:  FOLD file (crease pattern, flat, unfolded)
Out: FoldedState — faces, current geometry, layer order

Responsibilities:
- Parse FOLD (vertices_coords, edges_vertices, edges_assignment M/V/B/F, faces_vertices)
- Apply a single simple fold, update face geometry + layer order
- Check flat-foldability locally (Kawasaki, Maekawa) at each vertex
- Detect layer collisions (a fold that isn't physically valid)

Out of scope: choosing which fold to apply next (-> sequencer),
non-simple folds (reverse/squash/sink) for v1.
