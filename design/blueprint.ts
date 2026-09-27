// Stick figure + grid packing -> box-pleating layout, via BP Studio's core
// (vendor/bp-studio, MIT). BP Studio computes the flap and river contours,
// ridges and stretch gadgets. Its own manual is explicit that the result is a
// starting point, not a flat-foldable crease pattern: the axial-parallel
// creases and the mountain/valley assignment are left to the designer. That
// completion is design/complete.ts; foldability is checked by engine/flatfold.ts.

import { type BlueprintOutput, blueprint as bpStudio } from "../vendor/bp-studio/core.mjs";
import type { Vec } from "../engine/geom.ts";
import type { Packing } from "./packing.ts";
import { type FlapTree, leaves } from "./tree.ts";

export type LineRole = "border" | "ridge" | "hinge";

export interface Blueprint {
  grid_n: number;
  /** Segments in unit-square coordinates. */
  lines: { a: Vec; b: Vec; role: LineRole }[];
  /** Integer (grid-unit) length of every tree edge as given to BP Studio. */
  edge_lengths: Record<string, number>;
  diagnostics: Omit<BlueprintOutput, "lines">;
}

/**
 * Integer tree lengths are required by BP Studio. Rounding each edge DOWN keeps
 * every leaf-to-leaf tree distance <= s * d <= the L∞ distance of the packing,
 * so the packing stays valid.
 */
export function layoutBlueprint(tree: FlapTree, packing: Packing): Blueprint {
  const N = packing.grid_n;
  const id = new Map(tree.nodes.map((n, i) => [n, i]));
  const edge_lengths: Record<string, number> = {};
  const edges = tree.edges.map((e) => {
    const length = Math.max(1, Math.floor(e.length * packing.scale + 1e-9));
    edge_lengths[`${e.a}–${e.b}`] = length;
    return { n1: id.get(e.a)!, n2: id.get(e.b)!, length };
  });
  const flaps = leaves(tree).map((l) => {
    const [x, y] = packing.positions[l]!;
    return { id: id.get(l)!, x, y, width: 0, height: 0 };
  });
  const out = bpStudio({ edges, flaps, width: N, height: N });
  const role = (t: number): LineRole => (t === 1 ? "border" : t === 2 ? "ridge" : "hinge");
  const { lines, ...diagnostics } = out;
  return {
    grid_n: N,
    lines: lines.map((l) => ({ a: [l.p1.x / N, l.p1.y / N], b: [l.p2.x / N, l.p2.y / N], role: role(l.type) })),
    edge_lengths,
    diagnostics,
  };
}
