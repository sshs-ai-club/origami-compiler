// Collapse stages: a crease pattern folded in nested stages, each stage being
// a subset of the verified pattern's creases.
//
// WARNING: flat-foldability of each stage is a NECESSARY condition only. A
// chain of flat-foldable stages does not mean the paper can move from one
// stage to the next without tearing or self-intersection. Motion between
// stages is NOT verified here.
//
// Each stage is checked by flat-folder (engine/flatfold.ts) on the sheet with
// only that stage's creases folded; every other crease is left flat ("F").
// The engine's global stack rank (engine/state.ts) is not used.

import type { Assignment, FoldFile } from "../engine/foldfile.ts";
import { solveFlatFold } from "../engine/flatfold.ts";
import { beamSearch, type Domain } from "./search.ts";

export type StageVerdict = { ok: true; states: bigint } | { ok: false; stage: string; reason: string };

export interface CollapseStage {
  /** Edge indices of the verified crease pattern that are folded in this stage. */
  creases: number[];
  verdict: StageVerdict;
}

/**
 * Is `subset` of the creases of `cp` flat-foldable on its own, with every
 * other crease left flat? Border edges stay borders. Never throws.
 */
export function verifyStage(cp: FoldFile, subset: readonly number[]): StageVerdict {
  try {
    const n = cp.edges_vertices.length;
    for (const i of subset) {
      if (!Number.isInteger(i) || i < 0 || i >= n) return { ok: false, stage: "input", reason: `crease index ${i} is not an edge of the pattern` };
    }
    const folded = new Set(subset);
    const src = cp.edges_assignment ?? cp.edges_vertices.map((): Assignment => "U");
    const edges_assignment = src.map((a, i): Assignment => (a === "B" ? "B" : folded.has(i) ? a : "F"));
    // Flat-folder drops F edges; a vertex left with no edge would make the
    // pattern look disconnected, so drop those vertices here and renumber.
    const live = cp.edges_vertices.map((_, i) => edges_assignment[i] !== "F");
    const used = new Set<number>();
    cp.edges_vertices.forEach(([a, b], i) => {
      if (live[i]) {
        used.add(a);
        used.add(b);
      }
    });
    const remap = new Map<number, number>();
    const vertices_coords: number[][] = [];
    cp.vertices_coords.forEach((p, v) => {
      if (used.has(v)) {
        remap.set(v, vertices_coords.length);
        vertices_coords.push(p);
      }
    });
    const stage: FoldFile = {
      file_spec: cp.file_spec,
      file_creator: cp.file_creator,
      frame_classes: ["creasePattern"],
      vertices_coords,
      edges_vertices: cp.edges_vertices.flatMap(([a, b], i) => (live[i] ? [[remap.get(a)!, remap.get(b)!] as [number, number]] : [])),
      edges_assignment: edges_assignment.filter((_, i) => live[i]),
    };
    const r = solveFlatFold(stage);
    return r.ok ? { ok: true, states: r.states } : { ok: false, stage: r.stage, reason: r.reason };
  } catch (e) {
    return { ok: false, stage: "input", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** True iff the creases of each stage are a subset of those of the next. */
export function isChain(stages: readonly CollapseStage[]): boolean {
  for (let i = 0; i + 1 < stages.length; i++) {
    const next = new Set(stages[i + 1]!.creases);
    if (!stages[i]!.creases.every((c) => next.has(c))) return false;
  }
  return true;
}

// ------------------------------------------------------------------ search

/** A candidate set of cp edges that is folded together, in one stage. */
export interface CreaseGroup {
  label: string;
  edges: number[];
}

export interface CollapseStats {
  /** Which search ran. */
  search: "exhaustive" | "beam";
  groups: number;
  /** Calls to flat-folder (cache misses of verifyStage). */
  verifyCalls: number;
  cacheHits: number;
  elapsedMs: number;
  /** False if the search hit the check budget before finishing. */
  complete: boolean;
}

/**
 * Result of `findCollapse`. WARNING: each stage is flat-foldable on its own (a
 * NECESSARY condition). Motion from one stage to the next is NOT verified, so
 * `ok: true` does not prove the sequence can be folded physically.
 */
export type CollapseResult =
  | { ok: true; stages: CollapseStage[]; stats: CollapseStats }
  | { ok: false; stoppedAt: CollapseStage | null; reason: string; stats: CollapseStats };

export interface CollapseOptions {
  /** Hard cap on flat-folder calls. Default 400. */
  maxChecks?: number;
  /** Use the exhaustive search up to this many groups, beam search above. Default 12. */
  exhaustiveLimit?: number;
  beamWidth?: number;
  nodeLimit?: number;
}

const isCrease = (a: Assignment | undefined) => a === "M" || a === "V";

type SegLike = { a: readonly number[]; b: readonly number[] };

/**
 * Map every M/V edge of `cp` (unit square, grid size `n`) to the indices of the
 * `lines` (grid units) that contain it. cp edges are the pieces the lines were
 * subdivided into, so an edge belongs to a line iff both its endpoints lie on
 * the line's segment. A well-formed pattern gives exactly one line per edge.
 */
export function creaseLines(cp: FoldFile, lines: readonly SegLike[], n: number): Map<number, number[]> {
  const eps = 1e-7;
  const on = (p: readonly number[], l: SegLike) => {
    const x = p[0]! * n, y = p[1]! * n;
    const ax = l.a[0]!, ay = l.a[1]!, bx = l.b[0]!, by = l.b[1]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (len < eps) return false;
    if (Math.abs((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / len > eps) return false;
    const t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len);
    return t > -eps && t < 1 + eps;
  };
  const out = new Map<number, number[]>();
  cp.edges_vertices.forEach(([u, v], i) => {
    if (!isCrease(cp.edges_assignment?.[i])) return;
    const p = cp.vertices_coords[u]!, q = cp.vertices_coords[v]!;
    const hit: number[] = [];
    lines.forEach((l, k) => {
      if (on(p, l) && on(q, l)) hit.push(k);
    });
    out.set(i, hit);
  });
  return out;
}

/**
 * Candidate groups of a verified box-pleat result: (a) all creases of one
 * (role, elevation) class, (b) each connected component of such a class. The
 * full set is added by `findCollapse`. `n` is the grid size of the result
 * (cp coordinates are grid / n).
 */
export function groupsOfBoxPleat(r: { cp: FoldFile; lines: readonly (SegLike & { role: string; elevation?: number })[] }, n: number): CreaseGroup[] {
  const map = creaseLines(r.cp, r.lines, n);
  const classes = new Map<string, number[]>();
  for (const [e, ls] of map) {
    if (ls.length === 0) continue;
    const l = r.lines[ls[0]!]!;
    const key = `${l.role}${l.elevation === undefined ? "" : `@${l.elevation}`}`;
    const arr = classes.get(key) ?? [];
    arr.push(e);
    classes.set(key, arr);
  }
  const groups: CreaseGroup[] = [];
  for (const [key, edges] of classes) {
    groups.push({ label: key, edges });
    const parent = new Map<number, number>();
    const find = (x: number): number => {
      const p = parent.get(x)!;
      if (p === x) return x;
      const root = find(p);
      parent.set(x, root);
      return root;
    };
    for (const e of edges) for (const v of r.cp.edges_vertices[e]!) if (!parent.has(v)) parent.set(v, v);
    for (const e of edges) {
      const [u, v] = r.cp.edges_vertices[e]!;
      parent.set(find(u), find(v));
    }
    const comps = new Map<number, number[]>();
    for (const e of edges) {
      const root = find(r.cp.edges_vertices[e]![0]);
      const arr = comps.get(root) ?? [];
      arr.push(e);
      comps.set(root, arr);
    }
    if (comps.size > 1) [...comps.values()].forEach((c, i) => groups.push({ label: `${key}#${i}`, edges: c }));
  }
  return groups;
}

const keyOf = (s: ReadonlySet<number>) => [...s].sort((a, b) => a - b).join(",");

/**
 * Find nested stages S1 < S2 < ... < Sk = all M/V creases of `cp`, each a union
 * of candidate `groups` and each flat-foldable (verifyStage). Prefers the chain
 * with the most stages found. NECESSARY condition only: motion between stages
 * is NOT verified. A one-stage result (the whole pattern at once) is reported
 * as ok:false. The work is capped by `maxChecks` flat-folder calls.
 */
export function findCollapse(cp: FoldFile, groups: readonly CreaseGroup[], opts: CollapseOptions = {}): CollapseResult {
  const t0 = Date.now();
  const maxChecks = opts.maxChecks ?? 400;
  const all = new Set<number>(cp.edges_vertices.flatMap((_, i) => (isCrease(cp.edges_assignment?.[i]) ? [i] : [])));
  const fullKey = keyOf(all);
  // candidates: restricted to creases, deduped, smallest first, full set last
  const seenG = new Set<string>();
  const cand: Set<number>[] = [];
  for (const g of [...groups].sort((a, b) => a.edges.length - b.edges.length)) {
    const s = new Set(g.edges.filter((e) => all.has(e)));
    const k = keyOf(s);
    if (s.size === 0 || k === fullKey || seenG.has(k)) continue;
    seenG.add(k);
    cand.push(s);
  }
  cand.push(new Set(all));
  const search: CollapseStats["search"] = cand.length <= (opts.exhaustiveLimit ?? 12) ? "exhaustive" : "beam";

  const cache = new Map<string, StageVerdict>();
  let calls = 0, hits = 0, aborted = false;
  const verify = (s: ReadonlySet<number>): StageVerdict | null => {
    const k = keyOf(s);
    const c = cache.get(k);
    if (c) {
      hits++;
      return c;
    }
    if (calls >= maxChecks) {
      aborted = true;
      return null;
    }
    calls++;
    const v = verifyStage(cp, [...s].sort((a, b) => a - b));
    cache.set(k, v);
    return v;
  };
  const stats = (): CollapseStats => ({ search, groups: cand.length, verifyCalls: calls, cacheHits: hits, elapsedMs: Date.now() - t0, complete: !aborted });
  const stage = (s: ReadonlySet<number>): CollapseStage => ({ creases: [...s].sort((a, b) => a - b), verdict: cache.get(keyOf(s))! });
  const stoppedAt = (): CollapseStage | null => {
    let best: Set<number> | null = null;
    for (const [k, v] of cache) {
      if (!v.ok || k === fullKey || k === "") continue;
      const n = k.split(",").length;
      if (best === null || n > best.size) best = new Set(k.split(",").map(Number));
    }
    return best ? stage(best) : null;
  };
  const fail = (reason: string): CollapseResult => ({ ok: false, stoppedAt: stoppedAt(), reason, stats: stats() });

  if (all.size === 0) return fail("the pattern has no M/V creases");
  const fv = verify(all);
  if (!fv || !fv.ok) return fail(`the full crease set does not verify: ${fv && !fv.ok ? fv.reason : "budget"}`);

  let chain: Set<number>[] | null = null;
  if (search === "exhaustive") {
    const memo = new Map<string, Set<number>[]>();
    const best = (cur: Set<number>): Set<number>[] => {
      const ck = keyOf(cur);
      if (ck === fullKey) return [];
      const m = memo.get(ck);
      if (m) return m;
      let bestSeq: Set<number>[] = [];
      for (const g of cand) {
        const u = new Set([...cur, ...g]);
        if (u.size === cur.size) continue;
        const v = verify(u);
        if (!v) break;
        if (!v.ok) continue;
        const seq = [u, ...best(u)];
        if (seq[seq.length - 1]!.size === all.size && seq.length > bestSeq.length) bestSeq = seq;
      }
      if (!aborted) memo.set(ck, bestSeq);
      return bestSeq;
    };
    const seq = best(new Set());
    chain = seq.length > 0 ? seq : null;
  } else {
    // Beam search stops at the first goal it pops, so the jump to the full set
    // is withheld until every finer group is already in (fine chain first), and
    // only a second pass lets it jump from any non-empty stage (shorter chain).
    type St = { e: Set<number>; key: string };
    const fine = cand.slice(0, -1);
    const run = (jumpAnywhere: boolean) => {
      const dom: Domain<St, Set<number>> = {
        initial: () => ({ e: new Set(), key: "" }),
        expand: (s) => (s.e.size > 0 && (jumpAnywhere || fine.every((g) => [...g].every((e) => s.e.has(e)))) ? cand : fine),
        apply: (s, g) => {
          const u = new Set([...s.e, ...g]);
          if (u.size === s.e.size) return null;
          const v = verify(u);
          return v && v.ok ? { e: u, key: keyOf(u) } : null;
        },
        cost: (ops) => ops.length,
        heuristic: (s) => cand.filter((g) => ![...g].every((e) => s.e.has(e))).length,
        isGoal: (s) => s.key === fullKey,
        key: (s) => s.key,
      };
      const r = beamSearch(dom, { budget: cand.length, beamWidth: opts.beamWidth ?? 8, nodeLimit: opts.nodeLimit ?? 5000 });
      if (!r.reachedGoal) return null;
      const seq: Set<number>[] = [];
      let cur = new Set<number>();
      for (const g of r.ops) {
        cur = new Set([...cur, ...g]);
        seq.push(cur);
      }
      return seq;
    };
    chain = run(false) ?? run(true);
  }

  if (!chain) return fail(aborted ? `budget exhausted after ${calls} stage checks` : "no chain of verified stages reaches the full pattern");
  if (chain.length < 2) return fail(aborted ? `budget exhausted after ${calls} stage checks; only the one-shot collapse verifies` : "only the one-shot collapse verifies");
  return { ok: true, stages: chain.map(stage), stats: stats() };
}
