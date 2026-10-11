// Benchmark of the M/V hint strategies of design/mvhints.ts.
//
//   npx tsx app/hintbench.ts [--slow]
//
// For each pattern: complete it with the default ladder (that gives the lines
// and one verified solution), then give flat-folder the same crease pattern
// once per strategy and record the verdict (ok / refuted at stage "assignment"
// or "layers"), the time, and how far the hint agrees with the found solution
// ("vs one solution": mirror-normalised, over the creases the hint assigns).
// Unhinted-like strategies (one, none) are skipped above UNHINTED_LIMIT edges:
// flat-folder is synchronous and they take minutes there. A strategy that is
// ok is also checked with uniaxialDeviation, which must stay below 1e-9.
//
// The numbers are EMPIRICAL: a few dozen patterns on one machine, no proof.

import { parseRequest } from "../intent/rules.ts";
import { solveFlatFold } from "../engine/flatfold.ts";
import { boxPleatFromGrid, buildRegions, fillGaps, gridTree, toFold, uniaxialDeviation } from "../design/boxpleat.ts";
import type { CPLine, Pt } from "../design/boxpleat.ts";
import { generateCandidates } from "../design/candidates.ts";
import { LIBRARY, variantsFor } from "../design/library.ts";
import { agreement, assignmentOf, hintFor } from "../design/mvhints.ts";
import type { HintStrategy } from "../design/mvhints.ts";
import { packTree } from "../design/packing.ts";
import type { FlapTree } from "../design/tree.ts";

const SLOW = process.argv.includes("--slow");
const UNHINTED_LIMIT = 200;
const STRATEGIES: HintStrategy[] = ["lang", "peaks", "troughs", "flaptroughs", "one", "none"];

interface Case {
  name: string;
  tree: FlapTree;
  tips: Record<string, Pt>;
  n: number;
  scale: number;
}

const SIX: FlapTree = {
  subject: "lang-6x6",
  variant: "fig13.17",
  nodes: ["L", "R", "TL", "TM", "BL", "TR", "BR"],
  edges: [
    { a: "L", b: "R", length: 1 },
    { a: "L", b: "TL", length: 2 },
    { a: "L", b: "TM", length: 1 },
    { a: "L", b: "BL", length: 1 },
    { a: "R", b: "TR", length: 1 },
    { a: "R", b: "BR", length: 2 },
  ],
  mirror: [],
  shaping: [],
};

function cases(): Case[] {
  const out: Case[] = [{ name: "lang-6x6", tree: SIX, tips: { TL: [0, 1], TM: [3, 0], BL: [1, 6], TR: [6, 1], BR: [5, 4] }, n: 6, scale: 1 }];
  const add = (subject: string, N: number, sym: "diagonal" | "book", variant = 0) => {
    const tree = LIBRARY[subject]![variant]!;
    const p = packTree(tree, N, sym);
    if (p) out.push({ name: `${subject}-${N}-${sym}`, tree, tips: p.positions, n: N, scale: p.scale });
  };
  add("crane", 16, "diagonal");
  add("fish", 8, "diagonal");
  add("fish", 8, "book");
  for (const [s, N, sym] of [
    ["bird", 8, "book"],
    ["dragon", 8, "diagonal"],
    ["quadruped", 8, "diagonal"],
    ["human", 8, "diagonal"],
    ["human", 8, "book"],
    ["human", 12, "book"],
    ["spider", 12, "diagonal"],
    ["human", 12, "diagonal"],
    ["eiffel_tower", 8, "diagonal"],
    ["fish", 12, "diagonal"],
  ] as const) add(s, N, sym);
  if (SLOW) {
    // Small but pathological for the unhinted rungs: bird-8-diagonal `one` took ~51 s
    // and bird-12-diagonal `none` ~286 s (lang is refuted on both; peaks solves in 0.2 s).
    add("bird", 8, "diagonal");
    add("bird", 12, "diagonal");
    for (const [name, text, variant] of [
      ["dragon-simple", "a simple dragon", "simple"],
      ["dragon-realistic-16", "a realistic dragon on a 16x16 grid", "realistic"],
      ["dragon-realistic-21", "I want to make a realistic dragon, 21x21, about 200 steps", "realistic"],
    ] as const) {
      const spec = parseRequest(text);
      const c = generateCandidates(spec, variantsFor("dragon", spec.detail)).candidates.find((x) => x.variant === variant);
      if (c) out.push({ name, tree: c.tree, tips: c.packing.positions, n: c.packing.grid_n, scale: c.packing.scale });
    }
  }
  return out;
}

const pad = (s: string | number, w: number) => String(s).padEnd(w);

console.log(`${pad("pattern", 24)}${pad("edges", 6)}${pad("strategy", 12)}${pad("verdict", 22)}${pad("ms", 8)}vs one solution (agree/assigned)`);
const totals = new Map<HintStrategy, { ok: number; refuted: number; ms: number }>();
for (const cs of cases()) {
  const t0 = performance.now();
  const base = boxPleatFromGrid(cs.tree, cs.tips, cs.n, cs.scale);
  if (base.status !== "verified") {
    console.log(`${pad(cs.name, 24)}${pad("-", 6)}${pad("-", 12)}${pad("not completed", 22)}${pad(Math.round(performance.now() - t0), 8)}${base.reason.slice(0, 60)}`);
    continue;
  }
  const g = gridTree(cs.tree, cs.scale, cs.tips) as FlapTree;
  const filled = fillGaps(buildRegions(g, cs.tips, cs.n, base.root), base.fills);
  const lines: CPLine[] = base.lines;
  const solution = assignmentOf(lines, cs.n, base.cp);
  const tips = Object.keys(cs.tips).map((k) => cs.tips[k]!);
  for (const strategy of STRATEGIES) {
    const hint = hintFor(lines, strategy, filled);
    const cp = toFold(lines, cs.n, hint);
    const edges = cp.edges_vertices.length;
    const assigned = hint.filter((h) => h !== "U").length;
    if (assigned === 0 && strategy !== "none") {
      console.log(`${pad(cs.name, 24)}${pad(edges, 6)}${pad(strategy, 12)}${pad("no creases to assign", 22)}`);
      continue;
    }
    if ((strategy === "none" || strategy === "one") && edges > UNHINTED_LIMIT) {
      console.log(`${pad(cs.name, 24)}${pad(edges, 6)}${pad(strategy, 12)}${pad(`skipped (>${UNHINTED_LIMIT} edges)`, 22)}`);
      continue;
    }
    const t = performance.now();
    const r = solveFlatFold(cp);
    const ms = Math.round(performance.now() - t);
    let verdict: string;
    if (r.ok) {
      const dev = uniaxialDeviation(lines, cs.n, tips, r.cp, r.folded);
      verdict = dev < 1e-9 ? "ok" : `ok but deviates ${dev.toFixed(3)}`;
    } else verdict = `refuted (${r.stage})`;
    const agr = agreement(hint, solution);
    const tot = totals.get(strategy) ?? { ok: 0, refuted: 0, ms: 0 };
    if (r.ok) tot.ok++;
    else tot.refuted++;
    tot.ms += ms;
    totals.set(strategy, tot);
    console.log(`${pad(cs.name, 24)}${pad(edges, 6)}${pad(strategy, 12)}${pad(verdict, 22)}${pad(ms, 8)}${assigned ? `${agr.agree}/${agr.of}` : "-"}`);
  }
}
console.log("\nTotals over the patterns that completed (empirical):");
for (const [s, t] of totals) console.log(`${pad(s, 12)} ok ${t.ok}  refuted ${t.refuted}  total ${t.ms} ms`);
