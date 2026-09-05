# diagrams
Owner: ___

Turns one fold step into one SVG diagram in standard origami notation.

In:  a single FoldedState + the fold operation applied to reach it
Out: SVG (valley = dashed, mountain = dash-dot, fold arrow, rotate/flip symbol)

Responsibilities:
- Render current paper outline + crease lines
- Draw the fold arrow for the step being illustrated
- Handle X-ray (hidden edge) lines
- Decide when to rotate/flip the view between steps

Out of scope: text instructions (-> app), sequence order (-> sequencer).
