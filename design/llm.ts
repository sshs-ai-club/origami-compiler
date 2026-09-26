// Claude proposes a stick figure for subjects the library does not know
// (the "semantic stick figure" stage of COrigami). Claude names the flaps and
// their proportions; everything after this — packing, estimates, geometry —
// is deterministic and checked. A proposed tree that fails validation is
// rejected, never repaired silently.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CLAUDE_MODEL } from "../intent/llm.ts";
import { type FlapTree, validateTree } from "./tree.ts";

const TreeSchema = z.object({
  edges: z.array(z.object({ a: z.string(), b: z.string(), length: z.number() })).describe("Tree edges between named nodes; leaves are flaps"),
  mirror: z.array(z.array(z.string())).describe("Left/right mirror-image leaf pairs, each [left, right]"),
  shaping: z.array(
    z.object({
      op: z.enum(["reverse", "crimp", "sink", "curl", "thin", "spread", "pleat", "swivel"]),
      region: z.string(),
      count: z.number().int(),
    }),
  ),
});

const SYSTEM = `You design origami stick figures (flap trees) in the style of Robert Lang's TreeMaker.

Output a metric tree:
- Leaves are flaps: every appendage that sticks out (head, horns, legs, wings, tail, antennae...).
- Internal nodes are where flaps join (shoulders, hips, skull...). Use as few as possible.
- Edge lengths are relative proportions of the real subject (a tail twice as long as a leg gets twice the length).
- Detail "simple": 4-6 flaps. "medium": 6-9. "high": 9-12. Never more than 14 flaps.
- List mirror-image flap pairs as [left, right]. Flaps on the midline (head, tail) are in no pair.
- shaping lists the 3D shaping operations the finished model needs (reverse folds for joints, crimps for necks, curls for tails, spreading wings).`;

export async function proposeStickFigure(subject: string, detail: "simple" | "medium" | "high" | null, client: Anthropic = new Anthropic()): Promise<FlapTree> {
  const response = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Subject: ${subject}\nDetail: ${detail ?? "medium"}` }],
    output_config: { effort: "medium", format: betaZodOutputFormat(TreeSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to propose a stick figure");
  const out = response.parsed_output;
  if (!out) throw new Error(`no parseable stick figure (stop_reason: ${response.stop_reason})`);
  const nodes = [...new Set(out.edges.flatMap((e) => [e.a, e.b]))];
  const tree: FlapTree = {
    subject,
    variant: `proposed (${detail ?? "medium"})`,
    nodes,
    edges: out.edges,
    mirror: out.mirror.filter((p): p is [string, string] => p.length === 2) as [string, string][],
    shaping: out.shaping,
  };
  const errs = validateTree(tree);
  if (errs.length) throw new Error(`proposed stick figure is invalid: ${errs.join("; ")}`);
  return tree;
}
