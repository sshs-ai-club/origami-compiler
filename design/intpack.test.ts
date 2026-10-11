// Integer-aware packing (Lang, Origami Design Secrets 2nd ed., §13.2–13.3):
// choose whole-square edge lengths together with the tip placement, then
// inflate edges that were rounded down. Fixtures are hand calculations; the
// bird's is worked in the comments below.
//
// "Squares used" = N² − unused, where unused is the paper left over after the
// hinge polygons and rivers are placed (the smallest over all choices of root).

import { describe, expect, it } from "vitest";
import { parseRequest } from "../intent/rules.ts";
import { buildRegions, gapComponents, gridTree, uniaxialDeviation } from "./boxpleat.ts";
import { completeCandidate, generateCandidates } from "./candidates.ts";
import { LIBRARY, variantsFor } from "./library.ts";
import { leafSlots, packTree, packTreeInteger, placeTips, verifyIntegerPacking, withLengths } from "./packing.ts";
import { type FlapTree, leaves } from "./tree.ts";

const bird = LIBRARY.bird![0]!; // head 1.2, wings 2, tail 1.5, legs 0.8
const fish = LIBRARY.fish![0]!; // head 1, tail 1.5, fins 0.8, dorsal 0.8
const crane = LIBRARY.crane![0]!;

/** Unused paper for a tree whose lengths are already whole squares: smallest over roots. */
function unused(tree: FlapTree, tips: Record<string, [number, number]>, N: number): number {
  const lv = new Set(leaves(tree));
  let best = Infinity;
  for (const root of tree.nodes.filter((v) => !lv.has(v))) {
    try {
      best = Math.min(best, gapComponents(buildRegions(tree, tips, N, root)).reduce((s, c) => s + c.cells.length, 0));
    } catch {
      /* this root does not build */
    }
  }
  return best;
}
const used = (tree: FlapTree, tips: Record<string, [number, number]>, N: number) => N * N - unused(tree, tips, N);

/** What the legacy path does: packTree, then gridTree at its scale with the tips. */
function legacyUsed(tree: FlapTree, N: number, sym: "diagonal" | "book"): number {
  const p = packTree(tree, N, sym)!;
  const g = gridTree(tree, p.scale, p.positions);
  return typeof g === "string" ? 0 : used(g, p.positions, N);
}

const edgeOf = (t: FlapTree, name: string) => t.edges.findIndex((e) => e.a === name || e.b === name);

describe("integer packing: the bird on 8×8, diagonal", () => {
  // Scale 1.75 = 3.5 / 2 is the lower end of the band where the wings (2 × s) round to 4:
  // head 1.2·1.75 = 2.1 → 2, wings 3.5 → 4, tail 2.625 → 3, legs 1.4 → 1.
  // Hand check: wings (8,0)/(0,8), tail (0,0), head (8,8), legs (8,5)/(5,8).
  //   wing–wing 8 ≥ 8, tail–wing 8 ≥ 7, head–wing 8 ≥ 6, head–tail 8 ≥ 5,
  //   leg–wing 5 ≥ 5, leg–head 3 ≥ 3, leg–leg 3 ≥ 2, leg–tail 8 ≥ 4.
  // The next band up (s = 1.875, legs → 2) cannot place: a leg must be ≥ 6 from both
  // wings, which leaves positions within 2 of its mirror image, but leg–leg needs 4.
  const p = packTreeInteger(bird, 8, "diagonal")!;

  it("chooses head 2, wings 4, tail 3, legs 1 at target scale 1.75", () => {
    expect(p).not.toBeNull();
    const L = (n: string) => p.lengths[edgeOf(bird, n)]!;
    expect([L("head"), L("wing L"), L("wing R"), L("tail"), L("leg L"), L("leg R")]).toEqual([2, 4, 4, 3, 1, 1]);
    expect(p.target_scale).toBeCloseTo(1.75, 9);
    expect(p.scale).toBe(p.target_scale);
    expect(p.flap_radius["wing L"]).toBe(4);
    expect(p.flap_radius["leg L"]).toBe(1);
    expect(verifyIntegerPacking(bird, p.lengths, p.positions, 8)).toEqual([]);
  });

  it("the hand-placed tips satisfy every bound", () => {
    const tips = { "wing L": [8, 0], "wing R": [0, 8], tail: [0, 0], head: [8, 8], "leg L": [8, 5], "leg R": [5, 8] } as Record<string, [number, number]>;
    expect(verifyIntegerPacking(bird, [2, 4, 4, 3, 1, 1], tips, 8)).toEqual([]);
    // and a leg one square too close to the wing is caught
    expect(verifyIntegerPacking(bird, [2, 4, 4, 3, 1, 1], { ...tips, "leg L": [8, 4] }, 8)).not.toEqual([]);
  });

  it("the next band (legs 2) has no placement", () => {
    const t = withLengths(bird, [2, 4, 4, 3, 2, 2]);
    const ls = leafSlots(t, "diagonal", 8)!;
    expect(placeTips(ls.leaves, ls.d, ls.slots, 1, 8, "diagonal", 200_000)).toBeNull();
  });

  it("legs were rounded down and cannot be inflated; every change is listed", () => {
    expect(p.inflated).toEqual([]);
    const legs = p.rounded.filter((r) => r.edge.startsWith("leg"));
    expect(legs.map((r) => r.length)).toEqual([1, 1]);
    expect(legs[0]!.target).toBeCloseTo(1.4, 9);
  });

  it("uses at least 49 of 64 squares (legacy: 35)", () => {
    expect(legacyUsed(bird, 8, "diagonal")).toBe(35);
    expect(used(withLengths(bird, p.lengths), p.positions, 8)).toBeGreaterThanOrEqual(49);
  });

  it("completes into a verified base with at most 15 squares absorbed", () => {
    const spec = parseRequest("a bird on a 8x8 grid");
    const res = generateCandidates(spec, variantsFor("bird", spec.detail).filter((t) => t.variant === "standard"));
    const c0 = res.candidates.find((c) => c.paper_spec.grid_n === 8 && c.packing.symmetry === "diagonal")!;
    const c = completeCandidate(c0);
    expect(c.cp_status).toMatch(/verified by flat-folder/);
    const r = c.completion!;
    if (r.status !== "verified") throw new Error("not verified");
    expect(uniaxialDeviation(r.lines, 8, Object.values(c.packing.positions), r.cp, r.folded)).toBeLessThan(1e-9);
    expect(Object.values(r.expanded).reduce((s, k) => s + k, 0)).toBeLessThanOrEqual(15);
  }, 60_000);
});

describe("integer packing: the fish on 8×8, diagonal", () => {
  const p = packTreeInteger(fish, 8, "diagonal")!;
  const L = (n: string) => p.lengths[edgeOf(fish, n)]!;

  it("head 2, tail 3, fins 2 (inflated from 1), dorsal 1, target scale 5/3", () => {
    expect(p.target_scale).toBeCloseTo(5 / 3, 9);
    expect([L("head"), L("tail"), L("fin L"), L("fin R"), L("dorsal")]).toEqual([2, 3, 2, 2, 1]);
    expect(p.inflated.sort()).toEqual(["fin L", "fin R"]);
    expect(verifyIntegerPacking(fish, p.lengths, p.positions, 8)).toEqual([]);
  });

  it("raising the dorsal too (2,3,2,2,2) has no placement", () => {
    const ls = leafSlots(withLengths(fish, [2, 3, 2, 2, 2]), "diagonal", 8)!;
    expect(placeTips(ls.leaves, ls.d, ls.slots, 1, 8, "diagonal", 200_000)).toBeNull();
  });

  it("uses at least 25 of 64 squares, never worse than today", () => {
    const now = used(withLengths(fish, p.lengths), p.positions, 8);
    expect(now).toBeGreaterThanOrEqual(25);
    expect(now).toBeGreaterThanOrEqual(legacyUsed(fish, 8, "diagonal"));
  });
});

describe("integer packing: regression guards", () => {
  it("crane on 16×16 diagonal: all lengths 8, tips at the four corners", () => {
    const p = packTreeInteger(crane, 16, "diagonal")!;
    expect(p.lengths).toEqual([8, 8, 8, 8]);
    // The brief expected target_scale 8, but by the band rule used for the bird (1.75 = lower end of
    // the band where 2·s rounds to 4) the band where 1·s rounds to 8 starts at 7.5.
    expect(p.target_scale).toBe(7.5);
    // every length is reported as differing from the ideal 7.5 (honest, and harmless: all are 8)
    expect(p.rounded.map((r) => r.length)).toEqual([8, 8, 8, 8]);
    expect(Object.values(p.positions).map((q) => q.join(",")).sort()).toEqual(["0,0", "0,16", "16,0", "16,16"]);
  });

  it("packTree is unchanged by the refactor (crane scale and a mirrored dragon bound)", () => {
    expect(packTree(crane, 16, "diagonal")!.scale).toBe(8);
    expect(packTree(LIBRARY.dragon![0]!, 21, "book")).toBeNull();
    expect(packTree(LIBRARY.dragon![0]!, 20, "book")).not.toBeNull();
  });
});

describe("integer packing: library property", () => {
  for (const N of [8, 16]) {
    for (const sym of ["diagonal", "book"] as const) {
      it(`every library tree on ${N}×${N}, ${sym}: valid, whole squares, mirror pairs equal`, () => {
        for (const trees of Object.values(LIBRARY)) {
          for (const t of trees) {
            const p = packTreeInteger(t, N, sym);
            if (!p) continue;
            expect(verifyIntegerPacking(t, p.lengths, p.positions, N), `${t.subject}/${t.variant}`).toEqual([]);
            expect(p.lengths.every((l) => Number.isInteger(l) && l >= 1)).toBe(true);
            for (const [a, b] of t.mirror) expect(p.lengths[edgeOf(t, a)]).toBe(p.lengths[edgeOf(t, b)]);
            // nothing changed silently: every edge not at its ideal length is reported
            const reported = new Set(p.rounded.map((r) => r.edge));
            p.lengths.forEach((l, i) => {
              if (Math.abs(l - p.target_scale * t.edges[i]!.length) > 1e-6) {
                const e = t.edges[i]!;
                expect([e.a, e.b, `${e.a}–${e.b}`].some((x) => reported.has(x))).toBe(true);
              }
            });
          }
        }
      }, 60_000);
    }
  }
});

describe("integer packing in candidates", () => {
  it("the completed bird names every rounded edge in its notes", () => {
    const spec = parseRequest("a bird on a 8x8 grid");
    const res = generateCandidates(spec, variantsFor("bird", spec.detail).filter((t) => t.variant === "standard"));
    const c0 = res.candidates.find((c) => c.paper_spec.grid_n === 8 && c.packing.symmetry === "diagonal")!;
    expect(c0.lengths).toBeDefined();
    const c = completeCandidate(c0);
    expect(c.base_cp).not.toBeNull();
    const text = c.notes.join("\n");
    expect(text).toMatch(/leg L 1 \(asked 1\.40 at scale 1\.75/);
    expect(text).toMatch(/leg R 1 \(asked 1\.40 at scale 1\.75/);
    // each edge whose length differs from the ideal appears
    const ip = packTreeInteger(bird, 8, "diagonal")!;
    for (const r of ip.rounded) expect(text).toContain(`${r.edge} ${r.length} (asked ${r.target.toFixed(2)}`);
  }, 60_000);
});
