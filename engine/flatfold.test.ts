import { describe, expect, it } from "vitest";
import { dartPlan } from "../sequencer/library/dart.ts";
import { replay } from "../sequencer/plan.ts";
import { fold } from "./fold.ts";
import { type Assignment, creasePattern } from "./foldfile.ts";
import { foldFromLines, solveFlatFold } from "./flatfold.ts";
import { lineThrough } from "./geom.ts";
import { localFlatFoldability } from "./local.ts";
import { squareSheet } from "./state.ts";

type Pt = [number, number];
const boundary: [Pt, Pt, Assignment][] = [
  [[0, 0], [1, 0], "B"],
  [[1, 0], [1, 1], "B"],
  [[1, 1], [0, 1], "B"],
  [[0, 1], [0, 0], "B"],
];
/** Preliminary / waterbomb base: both diagonals and both midlines. */
const prelim = (diag: Assignment, mid: Assignment, fixFirst?: Assignment) =>
  foldFromLines([
    ...boundary,
    [[0, 0], [1, 1], fixFirst ?? diag],
    [[1, 0], [0, 1], diag],
    [[0.5, 0], [0.5, 1], mid],
    [[0, 0.5], [1, 0.5], mid],
  ]);

const halfTwice = () => {
  let s = squareSheet();
  s = fold(s, { line: lineThrough([0.5, 0], [0.5, 1]), sense: "valley", moving: "right", scope: "all" });
  s = fold(s, { line: lineThrough([0, 0.5], [1, 0.5]), sense: "valley", moving: "left", scope: "all" });
  return creasePattern(s);
};

describe("flat-folder wrapper", () => {
  it("accepts a crease pattern the engine folded, keeping its assignment", () => {
    const cp = halfTwice();
    const r = solveFlatFold(cp);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const creases = (a: FoldFileLike) => a.edges_assignment!.filter((x) => x === "M" || x === "V").sort().join("");
    expect(creases(r.cp)).toBe(creases(cp));
  });

  it("assigns an unassigned preliminary base, and the result is locally flat-foldable", () => {
    const r = solveFlatFold(prelim("U", "U"), { limit: 1000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.states).toBeGreaterThan(1n); // preliminary and waterbomb, at least
    expect(localFlatFoldability(r.cp)).toEqual([]);
  });

  it("keeps creases that were fixed in advance", () => {
    const r = solveFlatFold(prelim("U", "U", "V"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const V = r.cp.vertices_coords;
    const diagonal = r.cp.edges_vertices.findIndex(([a, b]) => {
      const [p, q] = [V[a]!, V[b]!];
      return Math.abs(p[0]! - p[1]!) < 1e-9 && Math.abs(q[0]! - q[1]!) < 1e-9;
    });
    expect(r.cp.edges_assignment![diagonal]).toBe("V");
  });

  it("rejects an impossible assignment (Maekawa: all four valleys at one vertex... all eight)", () => {
    const r = solveFlatFold(prelim("V", "V"));
    expect(r.ok).toBe(false);
  });

  it("rejects a crease pattern that violates Kawasaki", () => {
    const r = solveFlatFold(
      foldFromLines([...boundary, [[0.5, 0.5], [1, 0.5], "U"], [[0.5, 0.5], [0, 0.5], "U"], [[0.5, 0.5], [0.5, 1], "U"]]),
    );
    expect(r.ok).toBe(false);
  });

  it("verifies the dart plane's crease pattern end to end", () => {
    const cp = creasePattern(replay(dartPlan()).at(-1)!.after);
    const r = solveFlatFold(cp);
    expect(r.ok).toBe(true);
  });
});

type FoldFileLike = { edges_assignment?: string[] };
