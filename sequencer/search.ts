// Budget-constrained sequence search, written against an abstract Domain
// (STACK.md §4, decisions.md 2026-09-12). Nothing here knows about paper.
//
// This is the M4 skeleton: beam search with a hard node budget that always
// returns the best plan found and says whether it reached the goal
// (sequencer/README.md: never hang, never lie).

export interface Domain<State, Op> {
  initial(): State;
  /** Valid operations from this state. */
  expand(s: State): Op[];
  /** Apply an op; null if it turns out to be invalid. */
  apply(s: State, op: Op): State | null;
  /** Step cost of a whole op sequence (the step-cost model: panels, not primitives). */
  cost(ops: readonly Op[]): number;
  /** Lower bound on steps still needed. */
  heuristic(s: State): number;
  isGoal(s: State): boolean;
  /** Stable identity for duplicate detection. */
  key(s: State): string;
}

export interface SearchResult<State, Op> {
  ops: Op[];
  state: State;
  cost: number;
  reachedGoal: boolean;
  nodes: number;
  stopReason: "goal" | "budget" | "node_limit" | "exhausted";
}

export function beamSearch<S, O>(domain: Domain<S, O>, opts: { budget: number; beamWidth?: number; nodeLimit?: number }): SearchResult<S, O> {
  const width = opts.beamWidth ?? 32;
  const nodeLimit = opts.nodeLimit ?? 100_000;
  type Node = { s: S; ops: O[]; g: number; f: number };
  const start = domain.initial();
  let beam: Node[] = [{ s: start, ops: [], g: 0, f: domain.heuristic(start) }];
  let best: Node = beam[0]!;
  const seen = new Set<string>([domain.key(start)]);
  let nodes = 0;
  let stopReason: SearchResult<S, O>["stopReason"] = "exhausted";

  while (beam.length > 0) {
    const next: Node[] = [];
    for (const n of beam) {
      if (domain.isGoal(n.s)) return { ops: n.ops, state: n.s, cost: n.g, reachedGoal: true, nodes, stopReason: "goal" };
      for (const op of domain.expand(n.s)) {
        if (++nodes > nodeLimit) {
          stopReason = "node_limit";
          return finish();
        }
        const s2 = domain.apply(n.s, op);
        if (s2 === null) continue;
        const k = domain.key(s2);
        if (seen.has(k)) continue;
        seen.add(k);
        const ops = [...n.ops, op];
        const g = domain.cost(ops);
        const h = domain.heuristic(s2);
        // The budget is a pruning constraint, not a post-hoc check.
        if (g + h > opts.budget) {
          stopReason = "budget";
          continue;
        }
        const node = { s: s2, ops, g, f: g + h };
        next.push(node);
        if (h < domain.heuristic(best.s) || (h === domain.heuristic(best.s) && g < best.g)) best = node;
      }
    }
    next.sort((a, b) => a.f - b.f);
    beam = next.slice(0, width);
  }
  return finish();

  function finish(): SearchResult<S, O> {
    return { ops: best.ops, state: best.s, cost: best.g, reachedGoal: domain.isGoal(best.s), nodes, stopReason };
  }
}
