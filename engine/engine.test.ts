import { describe, expect, it } from "vitest";
import { applyFold, fold } from "./fold.ts";
import { creasePattern, foldedForm, validateFold } from "./foldfile.ts";
import { type Line, lineThrough, splitConvex, convexOverlap } from "./geom.ts";
import { localFlatFoldability } from "./local.ts";
import { type FlatState, bbox, isFlipped, layersAt, maxLayers, squareSheet } from "./state.ts";

const vertical = (x: number): Line => lineThrough([x, 0], [x, 1]); // direction +y: left side is x < x0
const horizontal = (y: number): Line => lineThrough([0, y], [1, y]); // direction +x: left side is y > y0

/** Right half over onto the left half (book fold). */
const bookFold = (s: FlatState) => fold(s, { line: vertical(0.5), sense: "valley", moving: "right", scope: "all" });
/** Top half down onto the bottom half. */
const topDown = (s: FlatState) => fold(s, { line: horizontal(0.5), sense: "valley", moving: "left", scope: "all" });

describe("geometry", () => {
  it("splits a square into two convex halves and tags the cut", () => {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;
    const { left, right } = splitConvex(sq, ["a", "b", "c", "d"], vertical(0.5), "cut");
    expect(left!.poly).toHaveLength(4);
    expect(right!.poly).toHaveLength(4);
    expect(left!.tags.filter((t) => t === "cut")).toHaveLength(1);
    expect(right!.tags.filter((t) => t === "cut")).toHaveLength(1);
  });

  it("does not treat edge contact as overlap", () => {
    const a = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;
    const b = [[1, 0], [2, 0], [2, 1], [1, 1]] as const;
    expect(convexOverlap(a, b)).toBe(false);
    expect(convexOverlap(a, [[0.5, 0.5], [2, 0.5], [2, 2]])).toBe(true);
  });
});

describe("simple folds", () => {
  it("book fold: two layers, moved half is flipped and on top", () => {
    const s = bookFold(squareSheet());
    expect(s.faces).toHaveLength(2);
    const stack = layersAt(s, [0.25, 0.5]);
    expect(stack).toHaveLength(2);
    expect(isFlipped(stack[0]!)).toBe(false);
    expect(isFlipped(stack[1]!)).toBe(true);
    expect(bbox(s)).toEqual([0, 0, 0.5, 1].map((v) => expect.closeTo(v, 9)));
  });

  it("mountain fold puts the flap behind", () => {
    const s = fold(squareSheet(), { line: vertical(0.5), sense: "mountain", moving: "right", scope: "all" });
    const stack = layersAt(s, [0.25, 0.5]);
    expect(isFlipped(stack[0]!)).toBe(true);
    expect(isFlipped(stack[1]!)).toBe(false);
  });

  it("folding in half twice gives four layers in the order a hand fold gives", () => {
    const s = topDown(bookFold(squareSheet()));
    const stack = layersAt(s, [0.25, 0.25]);
    expect(stack).toHaveLength(4);
    expect(maxLayers(s)).toBe(4);
    // bottom -> top, identified by where each layer sits on the unfolded sheet
    const where = stack.map((f) => {
      const c = f.paper.reduce((a, p) => [a[0] + p[0] / f.paper.length, a[1] + p[1] / f.paper.length], [0, 0]);
      return `${c[0] < 0.5 ? "L" : "R"}${c[1] < 0.5 ? "B" : "T"}`;
    });
    expect(where).toEqual(["LB", "RB", "RT", "LT"]);
  });

  it("crease-and-unfold records a valley crease and leaves the sheet flat", () => {
    const s = fold(squareSheet(), { line: vertical(0.5), sense: "valley", moving: "right", scope: "all", unfold: true });
    expect(s.faces).toHaveLength(2);
    expect(s.faces.every((f) => !isFlipped(f))).toBe(true);
    const cp = creasePattern(s);
    const creases = cp.edges_assignment!.map((a, i) => ({ a, angle: cp.edges_foldAngle![i] })).filter((e) => e.a !== "B");
    expect(creases).toEqual([{ a: "V", angle: 0 }]);
  });

  it("folds a single flap without disturbing the layer below", () => {
    const s0 = bookFold(squareSheet());
    const r = applyFold(s0, { line: vertical(0.25), sense: "valley", moving: "left", scope: { seed: [0.1, 0.5] } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(layersAt(r.state, [0.35, 0.5])).toHaveLength(3);
    expect(layersAt(r.state, [0.1, 0.5])).toHaveLength(1);
  });

  it("strict mode rejects a flap that wraps around layers that stay put", () => {
    // After two half-folds, the left-top and left-bottom layers are joined along the
    // y = 0.5 fold and sandwich the right-hand layers. Folding them alone would tear.
    const s = topDown(bookFold(squareSheet()));
    const r = applyFold(s, { line: vertical(0.25), sense: "valley", moving: "left", scope: { seed: [0.1, 0.25] }, strict: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/pinned/);
  });

  it("by default the sandwiched layers are carried along, and reported", () => {
    const s = topDown(bookFold(squareSheet()));
    const r = applyFold(s, { line: vertical(0.25), sense: "valley", moving: "left", scope: { seed: [0.1, 0.25] } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.moved).toHaveLength(4);
    expect(r.carried).toHaveLength(2);
    expect(layersAt(r.state, [0.1, 0.25])).toHaveLength(0);
  });

  it("a flap fold never carries layers underneath it", () => {
    const s0 = bookFold(squareSheet());
    const r = applyFold(s0, { line: vertical(0.25), sense: "valley", moving: "left", scope: { seed: [0.1, 0.5] } });
    expect(r.ok && r.carried).toEqual([]);
  });

  it("a flap fold that reaches every connected layer is allowed", () => {
    const s = topDown(bookFold(squareSheet()));
    const r = applyFold(s, { line: vertical(0.25), sense: "valley", moving: "right", scope: { seed: [0.4, 0.25] } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.moved.length).toBe(4);
  });
});

describe("crease pattern export", () => {
  it("half-fold twice: the centre vertex satisfies Kawasaki and Maekawa", () => {
    const cp = creasePattern(topDown(bookFold(squareSheet())));
    expect(validateFold(cp)).toEqual([]);
    const creases = cp.edges_assignment!.filter((a) => a === "M" || a === "V");
    expect(creases).toHaveLength(4);
    expect(creases.filter((a) => a === "M")).toHaveLength(1);
    expect(localFlatFoldability(cp)).toEqual([]);
  });

  it("flags a vertex that cannot fold flat", () => {
    const bad = {
      file_spec: 1.2,
      file_creator: "test",
      // a T-junction of three creases in the middle of the unit square
      vertices_coords: [[0.5, 0.5], [1, 0.5], [0, 0.5], [0.5, 1], [0, 0], [1, 0], [1, 1], [0, 1]],
      edges_vertices: [[0, 1], [0, 2], [0, 3], [4, 5], [5, 1], [1, 6], [6, 3], [3, 7], [7, 2], [2, 4]] as [number, number][],
      edges_assignment: ["V", "V", "M", "B", "B", "B", "B", "B", "B", "B"] as ("V" | "M" | "B")[],
    };
    expect(localFlatFoldability(bad)).toHaveLength(1);
  });

  it("folded form carries a layer order for every overlapping pair", () => {
    const ff = foldedForm(topDown(bookFold(squareSheet())));
    expect(ff.faceOrders).toHaveLength(6); // 4 stacked faces, all pairwise overlapping
  });
});
