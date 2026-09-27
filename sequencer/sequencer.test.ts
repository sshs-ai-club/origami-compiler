import { describe, expect, it } from "vitest";
import { creasePattern } from "../engine/foldfile.ts";
import { localFlatFoldability } from "../engine/local.ts";
import { layersAt, maxLayers } from "../engine/state.ts";
import { dartPlan } from "./library/dart.ts";
import { cost, replay } from "./plan.ts";
import { divisionRounds, precreaseBase, precreaseGrid } from "./precrease.ts";
import { LIBRARY } from "../design/library.ts";
import { packTree } from "../design/packing.ts";
import { boxPleatFromGrid } from "../design/boxpleat.ts";
import { type Domain, beamSearch } from "./search.ts";

describe("grid precrease", () => {
  it.each([4, 8, 16])("divides a power of two by halving (N=%i)", (N) => {
    const rounds = divisionRounds(N, null);
    expect(rounds).toHaveLength(Math.log2(N));
    expect(rounds.flat().map((r) => r.m).sort((a, b) => a - b)).toEqual(Array.from({ length: N - 1 }, (_, i) => i + 1));
  });

  it.each([3, 5, 7, 12, 21, 24, 31])("every fold lands a known line on a known line (N=%i)", (N) => {
    const P = 2 ** Math.floor(Math.log2(N));
    const have = new Set([0, N, ...(P === N ? [] : [P])]);
    for (const round of divisionRounds(N, P === N ? null : P)) {
      for (const { m, a, b } of round) {
        expect(have.has(a) && have.has(b)).toBe(true);
        expect(a + b).toBe(2 * m);
      }
      for (const { m } of round) have.add(m);
    }
    expect(have.size).toBe(N + 1);
  });

  it("the reference construction for 21 lands on 16/21", () => {
    const plan = precreaseGrid(21);
    const crossing = plan.steps.flatMap((s) => s.ops).find((o) => o.kind === "pinch" && o.reference === "the diagonal");
    expect(crossing && crossing.kind === "pinch" && crossing.at[0]).toBeCloseTo(16 / 21, 12);
    // the line from (0,1) to (1,c) really passes through the crossing
    const other = plan.steps.flatMap((s) => s.ops).find((o) => o.kind === "pinch" && o.reference.startsWith("the line from"));
    if (!other || other.kind !== "pinch") throw new Error("missing pinch");
    const [[x0, y0], [x1, y1]] = other.line;
    const x = 16 / 21;
    expect(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)).toBeCloseTo(x, 12);
  });

  it("21×21: replays through the engine into exactly the grid, and nothing else", () => {
    const plan = precreaseGrid(21);
    const frames = replay(plan);
    const final = frames.at(-1)!.after;
    expect(final.faces).toHaveLength(21 * 21);
    expect(maxLayers(final)).toBe(1);
    const cp = creasePattern(final);
    const creases = cp.edges_vertices.filter((_, i) => cp.edges_assignment![i] !== "B");
    // every crease is axis-parallel and on a k/21 line
    for (const [u, v] of creases) {
      const [a, b] = [cp.vertices_coords[u]!, cp.vertices_coords[v]!];
      const vertical = Math.abs(a[0]! - b[0]!) < 1e-9;
      const coord = vertical ? a[0]! : a[1]!;
      expect(Math.abs(coord * 21 - Math.round(coord * 21))).toBeLessThan(1e-9);
    }
    expect(cp.vertices_coords).toHaveLength(22 * 22);
    expect(cost(plan)).toBeLessThan(20);
  });

  it("step count grows like log2(N), not N", () => {
    expect(cost(precreaseGrid(32))).toBe(6); // 5 halving rounds + rotate-and-repeat
    expect(cost(precreaseGrid(64))).toBe(7);
  });
});

describe("dart plane (authored sequence)", () => {
  it("replays, including single-flap wing folds", () => {
    const frames = replay(dartPlan());
    const final = frames.at(-1)!.after;
    expect(maxLayers(final)).toBeGreaterThanOrEqual(4);
    // the wings went opposite ways: something now lies on the keel side of the wing crease
    expect(layersAt(final, [0.55, 0.5]).length).toBeGreaterThan(layersAt(frames[3]!.after, [0.55, 0.5]).length);
    const cp = creasePattern(final);
    expect(localFlatFoldability(cp)).toEqual([]);
  });
});

describe("beam search skeleton", () => {
  // Toy domain: reach 37 from 1 using +1 and ×2. Each op is one step.
  const toy: Domain<number, "+1" | "x2"> = {
    initial: () => 1,
    expand: () => ["+1", "x2"],
    apply: (s, op) => (op === "+1" ? s + 1 : s * 2 <= 64 ? s * 2 : null),
    cost: (ops) => ops.length,
    heuristic: (s) => (s === 37 ? 0 : s > 37 ? 99 : Math.max(1, Math.ceil(Math.log2(37 / s)))),
    isGoal: (s) => s === 37,
    key: (s) => String(s),
  };

  it("finds a plan within budget", () => {
    const r = beamSearch(toy, { budget: 10 });
    expect(r.reachedGoal).toBe(true);
    expect(r.cost).toBeLessThanOrEqual(10);
  });

  it("reports honestly when the budget is too small", () => {
    const r = beamSearch(toy, { budget: 3 });
    expect(r.reachedGoal).toBe(false);
    expect(r.stopReason).not.toBe("goal");
  });
});

describe("box-pleat base precrease", () => {
  /** Every point along each base crease (quarter-grid spacing) lies on a crease of the precreased sheet. */
  function uncovered(plan: ReturnType<typeof precreaseBase>, lines: { a: [number, number]; b: [number, number] }[], N: number): string[] {
    const cp = creasePattern(replay(plan).at(-1)!.after);
    const segs = cp.edges_vertices.filter((_, i) => cp.edges_assignment![i] !== "B").map(([u, v]) => [cp.vertices_coords[u]!, cp.vertices_coords[v]!]);
    const onSome = (p: number[]) =>
      segs.some(([a, b]) => {
        const cr = (b![0]! - a![0]!) * (p[1]! - a![1]!) - (b![1]! - a![1]!) * (p[0]! - a![0]!);
        return Math.abs(cr) < 1e-9 && Math.min(a![0]!, b![0]!) - 1e-9 <= p[0]! && p[0]! <= Math.max(a![0]!, b![0]!) + 1e-9 && Math.min(a![1]!, b![1]!) - 1e-9 <= p[1]! && p[1]! <= Math.max(a![1]!, b![1]!) + 1e-9;
      });
    const out: string[] = [];
    for (const l of lines) {
      const k = Math.round(4 * Math.max(Math.abs(l.b[0] - l.a[0]), Math.abs(l.b[1] - l.a[1])));
      for (let i = 0; i <= k; i++) {
        const p = [(l.a[0] + ((l.b[0] - l.a[0]) * i) / k) / N, (l.a[1] + ((l.b[1] - l.a[1]) * i) / k) / N];
        if (p[0]! <= 1e-9 || p[1]! <= 1e-9 || p[0]! >= 1 - 1e-9 || p[1]! >= 1 - 1e-9) continue; // paper edge
        if (!onSome(p)) out.push(`(${p[0]! * N}, ${p[1]! * N})`);
      }
    }
    return out;
  }

  it("realistic dragon: every crease of the verified base is precreased, and every fold replays", () => {
    const t = LIBRARY.dragon!.find((x) => x.variant === "realistic")!;
    const p = packTree(t, 16, "diagonal")!;
    const r = boxPleatFromGrid(t, p.positions, 16, p.scale);
    if (r.status !== "verified") throw new Error("fixture must verify");
    const plan = precreaseBase(16, r.lines);
    expect(plan.steps.length).toBeGreaterThan(precreaseGrid(16).steps.length);
    expect(uncovered(plan, r.lines, 16)).toEqual([]);
    // the grid alone misses the diagonals: the check can fail
    expect(uncovered(precreaseGrid(16), r.lines, 16).length).toBeGreaterThan(0);
  }, 120_000);
});
