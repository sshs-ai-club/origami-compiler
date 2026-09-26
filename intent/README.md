# intent
**Owner: Person B** · Stage 1 · Difficulty: low

Natural language -> a formal design specification.

**In:** a free-text request
**Out:** `DesignSpec` JSON

```json
{
  "target":     "eiffel_tower",
  "style":      "3d",
  "step_budget": 300,
  "sheet":      { "shape": "square", "count": 1, "cut": false },
  "detail":     null,
  "ambiguous":  []
}
```

## Responsibilities
- Extract target object, style (`3d` | `flat`), step budget, sheet constraints
- Normalise the target against the corpus vocabulary in `data/`
- Detect **incompatible constraints** and ask one clarifying question
  (e.g. "highly detailed" + "under 50 steps" is not satisfiable — say so
  rather than silently returning nothing)
- Never guess a step budget. Absent budget means unconstrained, not 300.

## Out of scope
Any geometry whatsoever. This module does not know what a crease is.

## Note on priority
This is the most visible part of the demo and the least technically
interesting. It can be a hardcoded dropdown for months. Do not let it
consume time that `data/` needs. See OWNERSHIP.md.

## Status (v0)
`rules.ts` (offline, deterministic), `llm.ts` (Claude structured output, falls back to rules), `vocabulary.ts` (shared with design/), `spec.ts` (the contract).
