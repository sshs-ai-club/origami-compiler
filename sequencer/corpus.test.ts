import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cost } from "./plan.ts";
import { dartPlan } from "./library/dart.ts";
import { precreaseGrid } from "./precrease.ts";
import { planToRecord, validateRecord } from "./corpus.ts";

const example = (): any => JSON.parse(readFileSync("data/sequences/EXAMPLE.json", "utf8"));
const errorsOf = (j: unknown): string[] => {
  const r = validateRecord(j);
  return r.ok ? [] : r.errors;
};

describe("corpus validator", () => {
  it("accepts EXAMPLE.json (unpublished)", () => {
    const r = validateRecord(example());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.published).toBe(false);
  });

  it("accepts TEMPLATE.json as a well-formed unpublished record", () => {
    const t = JSON.parse(readFileSync("data/sequences/TEMPLATE.json", "utf8"));
    expect(errorsOf(t)).toEqual([]);
  });

  it("names a total_panels mismatch", () => {
    const j = example();
    j.total_panels = 5;
    expect(errorsOf(j).join("\n")).toMatch(/total_panels/);
  });

  it("names a panel numbering gap", () => {
    const j = example();
    j.steps[2].panel = 7;
    expect(errorsOf(j).join("\n")).toMatch(/panel numbering/);
  });

  it("rejects a single batch with 2 folds", () => {
    const j = example();
    j.steps[0].primitive_folds = 2;
    expect(errorsOf(j).join("\n")).toMatch(/single.*primitive_folds/);
  });

  it("rejects primitive_folds < 1", () => {
    const j = example();
    j.steps[2].primitive_folds = 0;
    expect(errorsOf(j).length).toBeGreaterThan(0);
  });

  it("rejects non-monotone phases", () => {
    const j = example();
    j.steps[0].phase = "shaping";
    expect(errorsOf(j).join("\n")).toMatch(/phase/);
  });

  it("rejects a published record whose source is still <fill in>", () => {
    const j = example();
    j.published = true;
    expect(errorsOf(j).join("\n")).toMatch(/fill in/);
    j.source = "";
    expect(errorsOf(j).join("\n")).toMatch(/source/);
  });

  it("rejects an unknown batch kind", () => {
    const j = example();
    j.steps[0].batch = "magic";
    expect(errorsOf(j).length).toBeGreaterThan(0);
  });
});

describe("planToRecord", () => {
  it("precrease plan: total_panels === cost(plan), all phases precrease", () => {
    const plan = precreaseGrid(16);
    const rec = planToRecord(plan, { model: "grid16", source: "generated", grid_n: 16, flaps: 0, shaping_ops: 0 });
    expect(rec.total_panels).toBe(cost(plan));
    expect(rec.steps.every((s) => s.phase === "precrease")).toBe(true);
    expect(rec.published).toBe(false);
    expect(validateRecord(rec).ok).toBe(true);
  });

  it("the authored dart converts, validates and is never published", () => {
    const plan = dartPlan();
    const rec = planToRecord(plan, { model: "dart", source: "authored in this repo", grid_n: null, flaps: 1, shaping_ops: 1 });
    expect(rec.total_panels).toBe(plan.steps.length);
    expect(rec.published).toBe(false);
    const v = validateRecord(JSON.parse(JSON.stringify(rec)));
    expect(v.ok).toBe(true);
  });
});
