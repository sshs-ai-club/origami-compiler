# diagrams
**Split ownership** · Stage 5 · Difficulty: medium-high

One step -> one diagram panel in standard origami notation.

The module splits at a clean seam:

| Half | Owner | Work |
|---|---|---|
| **Geometry** | **Person A** | Project `FoldedState` to 2D; hidden-line removal using layer order; arrow anchor points; view rotation/flip choice. Emits `DiagramGeometry`. |
| **Styling** | **Person B** | `DiagramGeometry` -> styled SVG in Yoshizawa–Randlett notation. Never computes geometry. |

```
DiagramGeometry {
  polylines: [ { pts: [[x,y]...], kind: edge|valley|mountain|xray,
                 visible: bool } ]
  arrows:    [ { from: [x,y], to: [x,y], kind: fold|rotate|flip|push } ]
  view:      { rotate_deg, flip }
  bbox:      [x0, y0, x1, y1]
}
```

## Notation to emit
Valley = dashed · mountain = dash-dot · X-ray (hidden edge) = light dotted ·
fold arrow · rotate and flip symbols · hollow cleft-tail arrow for "apply
pressure here". References:
[Yoshizawa–Randlett](https://en.wikipedia.org/wiki/Yoshizawa%E2%80%93Randlett_system) ·
[Lang's conventions](https://langorigami.com/article/origami-diagramming-conventions/)

## The hard parts
- **Hidden-line removal** needs the layer order, not just the projection.
  This is why the geometry half belongs with `engine/`.
- **View selection** — when to rotate or flip between steps. Currently pure
  diagrammer judgment; formalising it as a cost function is open problem #4
  in RESEARCH.md §8.

## Out of scope
Step text (-> `app/`), sequence order (-> `sequencer/`).

## Status (v0)
`geometry.ts` (faces bottom-to-top with outlines, so painting in order is exact hidden-line removal; fold lines, arrows, reference marks), `svg.ts` (step panels, crease pattern, stick figure + packing).
