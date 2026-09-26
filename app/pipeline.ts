// The whole pipeline, in memory: request -> spec -> candidates -> plan ->
// diagrams, crease pattern, keyframes. The CLI writes the result to disk; a
// web shell would render it. No file or DOM access here.

import { type Candidate, type DesignResult, generateCandidates } from "../design/candidates.ts";
import { variantsFor } from "../design/library.ts";
import { proposeStickFigure } from "../design/llm.ts";
import type { FlapTree } from "../design/tree.ts";
import { resultGeometry, stepGeometry } from "../diagrams/geometry.ts";
import { creasePatternSvg, designSvg, diagramSvg } from "../diagrams/svg.ts";
import { type FoldFile, creasePattern, foldedForm } from "../engine/foldfile.ts";
import { localFlatFoldability } from "../engine/local.ts";
import { maxLayers } from "../engine/state.ts";
import { type IllustrationRequest, illustrationRequests } from "../illustrate/illustrate.ts";
import { parseRequestAuto } from "../intent/llm.ts";
import type { DesignSpec } from "../intent/spec.ts";
import { type MotionKeyframes, keyframes } from "../motion/keyframes.ts";
import { type StepPlan, replay } from "../sequencer/plan.ts";
import { precreaseGrid } from "../sequencer/precrease.ts";

export interface RenderedPlan {
  plan: StepPlan;
  diagrams: string[];
  finalSvg: string;
  cp: FoldFile;
  folded: FoldFile;
  cpSvg: string;
  keyframes: MotionKeyframes;
  illustrate: IllustrationRequest[];
  checks: { maxLayers: number; localViolations: number };
}

export interface PipelineResult {
  spec: DesignSpec;
  trees: FlapTree[];
  design: DesignResult;
  chosen: Candidate | null;
  designSvgs: Record<string, string>;
  rendered: RenderedPlan | null;
  /** Things the user must be told, in order. */
  notes: string[];
}

/** Replay a plan through the engine and produce every visual output. Throws if any step is invalid. */
export function renderPlan(plan: StepPlan): RenderedPlan {
  const frames = replay(plan);
  const diagrams = plan.steps.map((s, i) => diagramSvg(stepGeometry(s, frames[i]!), { label: String(s.id) }));
  const final = frames.at(-1)!.after;
  const cp = creasePattern(final, plan.title);
  return {
    plan,
    diagrams,
    finalSvg: diagramSvg(resultGeometry(final), { label: "result" }),
    cp,
    folded: foldedForm(final, plan.title),
    cpSvg: creasePatternSvg(cp),
    keyframes: keyframes(plan, frames),
    illustrate: illustrationRequests(plan.steps, diagrams),
    checks: { maxLayers: maxLayers(final), localViolations: localFlatFoldability(cp).length },
  };
}

export async function runPipeline(request: string, opts: { useClaude: boolean; pick?: number }): Promise<PipelineResult> {
  const notes: string[] = [];
  const spec = await parseRequestAuto(request, opts.useClaude);

  // Stick figures: the library for known subjects, Claude for the rest.
  let trees: FlapTree[] = spec.target ? variantsFor(spec.target, spec.detail) : [];
  if (trees.length === 0 && spec.target === null && spec.target_text && opts.useClaude) {
    try {
      trees = [await proposeStickFigure(spec.target_text, spec.detail)];
      notes.push(`Stick figure for "${spec.target_text}" was proposed by Claude and validated as a metric tree.`);
    } catch (err) {
      notes.push(`Could not get a stick figure for "${spec.target_text}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const design = generateCandidates(spec, trees);
  const designSvgs: Record<string, string> = {};
  for (const c of design.candidates) designSvgs[c.id] = designSvg(c.tree, c.packing);
  if (!design.route.supported) notes.push(`Stopped at design: ${design.route.reason}`);
  else if (design.candidates.length === 0) notes.push("No candidate fits the constraints. See the rejected list for why.");

  const chosen = design.candidates[opts.pick ?? 0] ?? null;
  let rendered: RenderedPlan | null = null;
  if (chosen) {
    const N = chosen.paper_spec.grid_n;
    const plan = precreaseGrid(N);
    plan.title = `${chosen.subject.replace("_", " ")} (${chosen.variant}) — ${N}×${N} grid`;
    plan.status = "partial";
    plan.stalled_at = {
      phase: "collapse",
      reason: "The crease pattern for this design is not generated yet (molecule filling, M5), so there is nothing to collapse. The sequencer for the collapse is M4.",
    };
    plan.remaining_estimate = { collapse: chosen.est_steps.collapse, shaping: chosen.est_steps.shaping };
    rendered = renderPlan(plan);
    notes.push(
      `Generated and engine-verified: steps 1–${plan.steps.length} (precreasing the ${N}×${N} grid). ` +
        `Not generated yet: the collapse (~${chosen.est_steps.collapse} steps) and shaping (~${chosen.est_steps.shaping} steps). ` +
        `Estimated total ${chosen.est_steps.total}; the collapse and shaping constants are placeholders until Milestone 2.`,
    );
  }
  return { spec, trees, design, chosen, designSvgs, rendered, notes };
}
