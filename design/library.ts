// Hand-written stick figures for the subjects in intent/vocabulary.ts.
//
// Lengths are rough anatomical proportions, not tuned designs. They exist so
// the pipeline has honest input for known subjects without an API call; the
// Claude-backed generator (design/llm.ts) covers everything else.

import type { FlapTree, ShapingOp, TreeEdge } from "./tree.ts";

const e = (a: string, b: string, length: number): TreeEdge => ({ a, b, length });
const s = (op: ShapingOp["op"], region: string, count = 1): ShapingOp => ({ op, region, count });

function tree(subject: string, variant: string, edges: TreeEdge[], mirror: [string, string][], shaping: ShapingOp[]): FlapTree {
  const nodes = [...new Set(edges.flatMap((x) => [x.a, x.b]))];
  return { subject, variant, nodes, edges, mirror, shaping };
}

export const LIBRARY: Record<string, FlapTree[]> = {
  dragon: [
    tree(
      "dragon",
      "realistic",
      [
        e("shoulders", "hips", 2),
        e("shoulders", "skull", 1.5),
        e("skull", "snout", 0.6),
        e("skull", "horn L", 0.6),
        e("skull", "horn R", 0.6),
        e("shoulders", "wing L", 2.6),
        e("shoulders", "wing R", 2.6),
        e("shoulders", "foreleg L", 1.1),
        e("shoulders", "foreleg R", 1.1),
        e("hips", "hindleg L", 1.3),
        e("hips", "hindleg R", 1.3),
        e("hips", "tail", 3),
      ],
      [
        ["horn L", "horn R"],
        ["wing L", "wing R"],
        ["foreleg L", "foreleg R"],
        ["hindleg L", "hindleg R"],
      ],
      [s("reverse", "legs", 8), s("crimp", "neck", 2), s("curl", "tail", 1), s("spread", "wings", 2), s("thin", "horns", 2), s("reverse", "snout", 1)],
    ),
    tree(
      "dragon",
      "standard",
      [
        e("shoulders", "hips", 2),
        e("shoulders", "head", 2),
        e("shoulders", "wing L", 2.6),
        e("shoulders", "wing R", 2.6),
        e("shoulders", "foreleg L", 1.1),
        e("shoulders", "foreleg R", 1.1),
        e("hips", "hindleg L", 1.3),
        e("hips", "hindleg R", 1.3),
        e("hips", "tail", 3),
      ],
      [
        ["wing L", "wing R"],
        ["foreleg L", "foreleg R"],
        ["hindleg L", "hindleg R"],
      ],
      [s("reverse", "legs", 4), s("crimp", "neck", 1), s("spread", "wings", 2), s("reverse", "head", 1)],
    ),
    tree(
      "dragon",
      "simple",
      [
        e("body", "head", 2),
        e("body", "wing L", 2.4),
        e("body", "wing R", 2.4),
        e("body", "leg L", 1.2),
        e("body", "leg R", 1.2),
        e("body", "tail", 3),
      ],
      [
        ["wing L", "wing R"],
        ["leg L", "leg R"],
      ],
      [s("reverse", "head", 1), s("spread", "wings", 2)],
    ),
  ],
  bird: [
    tree("bird", "standard", [e("body", "head", 1.2), e("body", "wing L", 2), e("body", "wing R", 2), e("body", "tail", 1.5), e("body", "leg L", 0.8), e("body", "leg R", 0.8)], [["wing L", "wing R"], ["leg L", "leg R"]], [s("reverse", "head", 1), s("reverse", "legs", 2), s("spread", "wings", 2)]),
    tree("bird", "simple", [e("body", "head", 1.2), e("body", "wing L", 2), e("body", "wing R", 2), e("body", "tail", 1.5)], [["wing L", "wing R"]], [s("reverse", "head", 1)]),
  ],
  crane: [tree("crane", "traditional", [e("body", "head", 1), e("body", "tail", 1), e("body", "wing L", 1), e("body", "wing R", 1)], [["wing L", "wing R"]], [s("reverse", "head", 1), s("spread", "wings", 1)])],
  quadruped: [
    tree("quadruped", "realistic", [e("shoulders", "hips", 2), e("shoulders", "head", 1.4), e("head", "ear L", 0.4), e("head", "ear R", 0.4), e("head", "muzzle", 0.5), e("shoulders", "foreleg L", 1.5), e("shoulders", "foreleg R", 1.5), e("hips", "hindleg L", 1.5), e("hips", "hindleg R", 1.5), e("hips", "tail", 1.2)], [["ear L", "ear R"], ["foreleg L", "foreleg R"], ["hindleg L", "hindleg R"]], [s("reverse", "legs", 8), s("crimp", "neck", 1), s("thin", "ears", 2), s("curl", "tail", 1)]),
    tree("quadruped", "simple", [e("shoulders", "hips", 2), e("shoulders", "head", 1.4), e("shoulders", "foreleg L", 1.5), e("shoulders", "foreleg R", 1.5), e("hips", "hindleg L", 1.5), e("hips", "hindleg R", 1.5), e("hips", "tail", 1.2)], [["foreleg L", "foreleg R"], ["hindleg L", "hindleg R"]], [s("reverse", "legs", 4), s("reverse", "head", 1)]),
  ],
  human: [tree("human", "standard", [e("chest", "pelvis", 1.5), e("chest", "head", 0.8), e("chest", "arm L", 1.6), e("chest", "arm R", 1.6), e("pelvis", "leg L", 2.2), e("pelvis", "leg R", 2.2)], [["arm L", "arm R"], ["leg L", "leg R"]], [s("reverse", "arms", 2), s("reverse", "legs", 2), s("sink", "head", 1)])],
  insect: [tree("insect", "standard", [e("thorax", "abdomen", 1.5), e("thorax", "head", 0.6), e("head", "antenna L", 1.2), e("head", "antenna R", 1.2), e("thorax", "leg 1L", 1.2), e("thorax", "leg 1R", 1.2), e("thorax", "leg 2L", 1.2), e("thorax", "leg 2R", 1.2), e("abdomen", "leg 3L", 1.4), e("abdomen", "leg 3R", 1.4), e("abdomen", "tip", 0.8)], [["antenna L", "antenna R"], ["leg 1L", "leg 1R"], ["leg 2L", "leg 2R"], ["leg 3L", "leg 3R"]], [s("reverse", "legs", 12), s("thin", "antennae", 2)])],
  spider: [tree("spider", "standard", [e("cephalothorax", "abdomen", 1), e("abdomen", "spinneret", 0.6), ...[1, 2, 3, 4].flatMap((i) => [e("cephalothorax", `leg ${i}L`, 2), e("cephalothorax", `leg ${i}R`, 2)])], [1, 2, 3, 4].map((i) => [`leg ${i}L`, `leg ${i}R`] as [string, string]), [s("reverse", "legs", 16)])],
  fish: [tree("fish", "standard", [e("body", "head", 1), e("body", "tail", 1.5), e("body", "fin L", 0.8), e("body", "fin R", 0.8), e("body", "dorsal", 0.8)], [["fin L", "fin R"]], [s("pleat", "tail", 1), s("swivel", "fins", 2)])],
  eiffel_tower: [
    tree("eiffel_tower", "standard", [e("platform", "spire", 3), ...["NE", "NW", "SE", "SW"].map((c) => e("platform", `leg ${c}`, 2))], [["leg NW", "leg NE"], ["leg SW", "leg SE"]], [s("pleat", "legs", 4), s("thin", "spire", 2), s("pleat", "platform", 2)]),
  ],
};

/** Variants ordered so the one matching the requested detail comes first. */
export function variantsFor(subject: string, detail: "simple" | "medium" | "high" | null): FlapTree[] {
  const all = LIBRARY[subject] ?? [];
  const rank = (v: FlapTree) => {
    const lvl = v.variant === "realistic" ? "high" : v.variant === "simple" ? "simple" : "medium";
    if (detail === null) return lvl === "medium" ? 0 : 1;
    return lvl === detail ? 0 : Math.abs(["simple", "medium", "high"].indexOf(lvl) - ["simple", "medium", "high"].indexOf(detail));
  };
  return [...all].sort((a, b) => rank(a) - rank(b));
}
