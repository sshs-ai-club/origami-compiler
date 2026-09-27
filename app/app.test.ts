import { describe, expect, it } from "vitest";
import { dartPlan } from "../sequencer/library/dart.ts";
import { bookHtml, planBookHtml } from "./book.ts";
import { renderPlan, runPipeline } from "./pipeline.ts";
import { precreaseGrid } from "../sequencer/precrease.ts";

describe("end-to-end pipeline (rule-based, offline)", () => {
  it("reference request: spec -> candidates -> partial plan -> book, and says what is missing", async () => {
    const res = await runPipeline("I want to make a realistic dragon, with 21x21 paper, with about ~ 200 steps or less.", { useClaude: false, complete: 0 });
    expect(res.chosen?.variant).toBe("realistic");
    expect(res.chosen?.paper_spec.size_cm).toBe(21);
    const r = res.rendered!;
    expect(r.plan.status).toBe("partial");
    expect(r.plan.stalled_at?.phase).toBe("collapse");
    expect(r.diagrams).toHaveLength(r.plan.steps.length);
    expect(r.keyframes.steps).toHaveLength(r.plan.steps.length);
    expect(r.checks.maxLayers).toBe(1);
    expect(res.notes.join(" ")).toMatch(/Not generated yet/);
    const html = bookHtml(res);
    expect(html).toContain("Partial.");
  });

  it("a verified base: precrease every crease, then one collapse panel marked as not a sequence", async () => {
    const res = await runPipeline("a traditional crane on a 16x16 grid", { useClaude: false, complete: 1 });
    expect(res.chosen?.base_cp).not.toBeNull();
    const r = res.rendered!;
    expect(r.plan.steps.length).toBeGreaterThan(precreaseGrid(16).steps.length); // the two diagonals
    expect(r.plan.stalled_at?.reason).toMatch(/Every crease of the base is now precreased/);
    expect(res.collapse).not.toBeNull();
    const html = bookHtml(res);
    expect(html).toContain("Collapse — one move");
    expect(html).toContain("not a verified fold sequence");
  });

  it("unsupported tiers stop at design with the reason", async () => {
    const res = await runPipeline("a vase with 50 steps", { useClaude: false });
    expect(res.rendered).toBeNull();
    expect(res.notes.join(" ")).toMatch(/rotational sweep/i);
  });

  it("a complete authored model renders every output", () => {
    const r = renderPlan(dartPlan());
    expect(r.plan.status).toBe("complete");
    expect(r.checks.localViolations).toBe(0);
    expect(planBookHtml(r)).toContain("Dart plane");
    expect(r.illustrate).toHaveLength(r.plan.steps.length);
    expect(r.illustrate[0]!.prompt).toMatch(/exactly/);
  });
});
