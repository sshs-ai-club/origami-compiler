// Optional stylisation of exact step diagrams by an image-generation model.
//
// The order matters and is the whole design: geometry first, pixels second.
// Every request carries the exact engine-rendered diagram as its conditioning
// image and asks the model to restyle it (photographic paper, hands, lighting)
// WITHOUT changing the geometry. The exact SVG stays the source of truth and
// is always shown next to any generated image, because frontier multimodal
// models fail at single-step folding geometry (RESEARCH.md §4: OrigamiBench,
// GamiBench, ORIGAMISPACE). An image model asked to invent step 12 from text
// will draw a plausible, wrong fold.
//
// No provider is wired in. Choosing one (and its API key) is a project
// decision; implement `ImageProvider` for it. See illustrate/README.md.

import type { Step } from "../sequencer/plan.ts";

export interface IllustrationRequest {
  step_id: number;
  /** The exact diagram, SVG. Providers that need raster input should rasterise it. */
  conditioning_svg: string;
  prompt: string;
  negative_prompt: string;
  /** How strongly the output must follow the conditioning image, 0..1. Keep high. */
  structure_strength: number;
}

export interface ImageProvider {
  readonly name: string;
  /** Returns image bytes (PNG or JPEG). */
  generate(req: IllustrationRequest): Promise<Uint8Array>;
}

export interface IllustrationStyle {
  paper: string;
  scene: string;
}

export const DEFAULT_STYLE: IllustrationStyle = {
  paper: "thin square origami paper, white on the front and light blue on the back",
  scene: "top-down photograph on a plain light wooden table, soft daylight, sharp focus",
};

export function illustrationRequests(steps: readonly Step[], svgs: readonly string[], style: IllustrationStyle = DEFAULT_STYLE): IllustrationRequest[] {
  return steps.map((step, i) => ({
    step_id: step.id,
    conditioning_svg: svgs[i]!,
    prompt: [
      `Instructional origami photo, step ${step.id}.`,
      `Restyle the reference diagram as ${style.paper}, ${style.scene}.`,
      `Keep every edge, crease and layer exactly where the diagram puts it; the paper outline must match the diagram exactly.`,
      `Show the fold described as: "${step.text}"`,
      `Dashed lines in the diagram are the fold to make now; keep them visible as faint pencil lines.`,
    ].join(" "),
    negative_prompt: "extra folds, missing layers, changed outline, torn paper, text, watermark, extra hands, distorted perspective",
    structure_strength: 0.9,
  }));
}

export async function illustrate(provider: ImageProvider, reqs: readonly IllustrationRequest[]): Promise<{ step_id: number; image: Uint8Array }[]> {
  const out: { step_id: number; image: Uint8Array }[] = [];
  for (const r of reqs) out.push({ step_id: r.step_id, image: await provider.generate(r) });
  return out;
}
