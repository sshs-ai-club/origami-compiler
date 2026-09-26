# vendor/flat-folder

The layer-order solver from [flat-folder](https://github.com/origamimagiro/flat-folder)
by Jason S. Ku, an implementation of *Computing Flat-Folded States*
(Akitaya, Demaine & Ku, OSME 2024). MIT licence (see `LICENSE`).

- Source commit: `d50004815fb738d009e5b87b2307fbaefa717ef0` (2026-06-25)
- Files copied **unmodified** from `src/`: `math.js note.js constraints.js
  conversion.js avl.js solver.js`. The GUI, SVG, worker and I/O files are not
  included; the solver never touches the DOM.
- `*.d.ts` files here are ours: minimal types for the functions we call.
- Our wrapper is `engine/flatfold.ts`. Do not edit the `.js` files; to update,
  copy them again from a newer commit and record it here.
