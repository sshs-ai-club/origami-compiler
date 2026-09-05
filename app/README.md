# app
Owner: ___

Ties everything together: web UI, FOLD import, LLM-written step text, demo.

In:  FOLD file (upload or from data/)
Out: full instruction book — diagrams/ output + one sentence per step

Responsibilities:
- FOLD file import/validation before handing to engine/
- Call sequencer/ -> diagrams/ per step, assemble into a page
- Generate short step text (LLM), given the fold operation + geometry
- Print/export view for physical-fold testing
