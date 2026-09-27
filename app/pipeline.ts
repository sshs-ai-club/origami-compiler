// The whole pipeline, in memory: request -> spec -> candidates -> plan ->
// diagrams, crease pattern, keyframes. The CLI writes the result to disk; a
// web shell would render it. No file or DOM access here.

import { type Candidate, type DesignResult, completeCandidate, generateCandidates, stepLimit } from "../design/candidates.ts";
import { variantsFor } from "../design/library.ts";
import { proposeStickFigure } from "../design/llm.ts";
import type { FlapTree } from "../design/tree.ts";
import { resultGeometry, stepGeometry } from "../diagrams/geometry.ts";
import { creasePatternSvg, designSvg, diagramSvg, foldedXraySvg, structuralSvg } from "../diagrams/svg.ts";
import { type FoldFile, creasePattern, foldedForm } from "../engine/foldfile.ts";
import { localFlatFoldability } from "../engine/local.ts";
import { maxLayers } from "../engine/state.ts";
import { type IllustrationRequest, illustrationRequests } from "../illustrate/illustrate.ts";
import { parseRequestAuto } from "../intent/llm.ts";
import type { DesignSpec } from "../intent/spec.ts";
import { type MotionKeyframes, keyframes } from "../motion/keyframes.ts";
import { type StepPlan, replay } from "../sequencer/plan.ts";
import { precreaseBase, precreaseGrid } from "../sequencer/precrease.ts";

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
  /** Per candidate: the box-pleat layout in structural colours (problems circled), then the verified crease pattern if any. */
  cpSvgs: Record<string, string>;
  rendered: RenderedPlan | null;
  /**
   * The collapse, as one panel after the precrease steps: where the paper must
   * end up (verified by flat-folder and the base check), not how to move it.
   */
  collapse: { structuralSvg: string; mvSvg: string; xraySvg: string; text: string } | null;
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

/**
 * `complete`: how many candidates, in rank order, to try completing into a
 * verified crease pattern (each can take a minute: flat-folder). 0 skips it.
 */
export async function runPipeline(
  request: string,
  opts: { useClaude: boolean; pick?: number; complete?: number; progress?: (msg: string) => void },
): Promise<PipelineResult> {
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
  // Complete candidates in rank order; stop at the first that flat-folder verifies.
  const toComplete = Math.min(opts.complete ?? 3, design.candidates.length);
  for (let i = 0; i < toComplete; i++) {
    opts.progress?.(`completing ${design.candidates[i]!.id} (Lang box pleating + flat-folder; can take minutes)`);
    design.candidates[i] = completeCandidate(design.candidates[i]!, { stepLimit: spec.step_budget ? stepLimit(spec) : undefined });
    opts.progress?.(`${design.candidates[i]!.id}: ${design.candidates[i]!.cp_status}`);
    if (design.candidates[i]!.base_cp) break;
  }
  const designSvgs: Record<string, string> = {};
  const cpSvgs: Record<string, string> = {};
  for (const c of design.candidates) {
    designSvgs[c.id] = designSvg(c.tree, c.packing);
    const r = c.completion;
    if (!r) cpSvgs[c.id] = "";
    else if (r.status === "verified") cpSvgs[c.id] = structuralSvg(r.lines, c.packing.grid_n) + creasePatternSvg(r.cp, 300);
    else cpSvgs[c.id] = structuralSvg(r.lines, c.packing.grid_n, r.problems);
  }
  if (!design.route.supported) notes.push(`Stopped at design: ${design.route.reason}`);
  else if (design.candidates.length === 0) notes.push("No candidate fits the constraints. See the rejected list for why.");

  // Prefer a candidate with a verified crease pattern over a higher-ranked one without.
  const verifiedIdx = design.candidates.findIndex((c) => c.base_cp !== null);
  if (opts.pick === undefined && verifiedIdx > 0) {
    const top = design.candidates[0]!;
    notes.push(`The top-ranked design (${top.id}) has no verified crease pattern (${top.cp_status}); using ${design.candidates[verifiedIdx]!.id}, which has one.`);
  }
  const chosen = design.candidates[opts.pick ?? Math.max(0, verifiedIdx)] ?? null;
  let rendered: RenderedPlan | null = null;
  let collapse: PipelineResult["collapse"] = null;
  if (chosen) {
    const N = chosen.paper_spec.grid_n;
    const r = chosen.completion?.status === "verified" ? chosen.completion : null;
    const plan = r ? precreaseBase(N, r.lines) : precreaseGrid(N);
    plan.title = `${chosen.subject.replace("_", " ")} (${chosen.variant}) — ${N}×${N} grid`;
    plan.status = "partial";
    plan.stalled_at = {
      phase: "collapse",
      reason: r
        ? "Every crease of the base is now precreased. The collapse is shown below as one panel — its end state is verified (flat-folder and the base check), the motion is not. Lang (ODS §14.9) notes most box-pleated bases have no step-by-step collapse; generating one where it exists is Milestone 4."
        : chosen.completion
          ? `The crease pattern could not be completed and verified: ${chosen.completion.status === "incomplete" ? chosen.completion.reason : ""}. There is nothing to collapse until it is.`
          : "Crease-pattern completion was not run for this candidate.",
    };
    plan.remaining_estimate = { collapse: chosen.est_steps.collapse, shaping: chosen.est_steps.shaping };
    rendered = renderPlan(plan);
    if (r) collapse = collapsePanel(r, N);
    notes.push(
      `Generated and engine-verified: steps 1–${plan.steps.length} (precreasing ${r ? "every crease of the base" : `the ${N}×${N} grid`}). ` +
        (r ? "Shown but not sequenced: the collapse, as one panel with its verified end state. " : "") +
        `Not generated yet: a step-by-step collapse (~${chosen.est_steps.collapse} steps) and shaping (~${chosen.est_steps.shaping} steps). ` +
        `Estimated total ${chosen.est_steps.total}; the collapse and shaping constants are placeholders until Milestone 2.`,
    );
  }
  return { spec, trees, design, chosen, designSvgs, cpSvgs, rendered, collapse, notes };
}

/** The collapse panel for a verified base: the map (structure), the assignment, and the result. */
function collapsePanel(r: Extract<NonNullable<Candidate["completion"]>, { status: "verified" }>, N: number): NonNullable<PipelineResult["collapse"]> {
  // Structural role of each crease-pattern edge, by the base line it lies on.
  const V = r.cp.vertices_coords;
  const roleOf = (i: number) => {
    if (r.cp.edges_assignment?.[i] === "B") return "border" as const;
    const [u, v] = r.cp.edges_vertices[i]!;
    const m = [((V[u]![0]! + V[v]![0]!) / 2) * N, ((V[u]![1]! + V[v]![1]!) / 2) * N];
    const l = r.lines.find((l) => {
      const cr = (l.b[0] - l.a[0]) * (m[1]! - l.a[1]) - (l.b[1] - l.a[1]) * (m[0]! - l.a[0]);
      return Math.abs(cr) < 1e-6 && Math.min(l.a[0], l.b[0]) - 1e-6 <= m[0]! && m[0]! <= Math.max(l.a[0], l.b[0]) + 1e-6 && Math.min(l.a[1], l.b[1]) - 1e-6 <= m[1]! && m[1]! <= Math.max(l.a[1], l.b[1]) + 1e-6;
    });
    return l?.role ?? "contour";
  };
  const maxE = Math.max(0, ...r.lines.map((l) => l.elevation ?? 0));
  return {
    structuralSvg: structuralSvg(r.lines, N, [], 360),
    mvSvg: creasePatternSvg(r.cp, 360),
    xraySvg: foldedXraySvg(r.folded, roleOf, 360),
    text:
      "Collapse all at once on the creases you made. Fold only the segments drawn in the map; the rest of each precreased line stays flat. " +
      "Every green (axial) crease comes together on one line, the axis; the brown contours stand parallel to it, " +
      `${maxE > 0 ? `up to ${maxE} grid square${maxE === 1 ? "" : "s"} above it; ` : ""}` +
      "the blue hinges end up perpendicular to it, one between each pair of flaps; the red ridges run diagonally. " +
      "Mountain and valley are as shown (from the side you drew the grid on). The x-ray shows every layer of the finished base.",
  };
}
