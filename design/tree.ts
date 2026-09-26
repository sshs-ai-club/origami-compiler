// The stick figure: a metric tree of flaps (Lang's TreeMaker input).
// Leaves are flaps (head, legs, wings, tail); internal nodes are where they
// join; edge lengths are in abstract "tree units" — only ratios matter.

export interface TreeEdge {
  a: string;
  b: string;
  length: number;
}

export interface ShapingOp {
  /** A named operator from the shaping library. Heuristic, estimated only (ARCHITECTURE.md §2). */
  op: "reverse" | "crimp" | "sink" | "curl" | "thin" | "spread" | "pleat" | "swivel";
  /** Which flap or region, by leaf name. */
  region: string;
  count: number;
}

export interface FlapTree {
  subject: string;
  /** Detail variant, e.g. "simple" or "realistic". */
  variant: string;
  /** Node names. Leaves are the nodes of degree 1. */
  nodes: string[];
  edges: TreeEdge[];
  /** Mirror-image leaf pairs (left, right). Leaves in no pair lie on the symmetry axis. */
  mirror: [string, string][];
  shaping: ShapingOp[];
}

export function leaves(t: FlapTree): string[] {
  const deg = new Map<string, number>();
  for (const e of t.edges) {
    deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
    deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
  }
  return t.nodes.filter((n) => deg.get(n) === 1);
}

/** Problems that make the tree unusable; empty when it is a valid metric tree. */
export function validateTree(t: FlapTree): string[] {
  const errs: string[] = [];
  const names = new Set(t.nodes);
  if (names.size !== t.nodes.length) errs.push("duplicate node names");
  for (const e of t.edges) {
    if (!names.has(e.a) || !names.has(e.b)) errs.push(`edge ${e.a}-${e.b} names an unknown node`);
    if (!(e.length > 0)) errs.push(`edge ${e.a}-${e.b} has non-positive length`);
  }
  if (t.edges.length !== t.nodes.length - 1) errs.push("a tree on n nodes has n-1 edges");
  // connected?
  const adj = adjacency(t);
  const seen = new Set<string>();
  const stack = t.nodes.length ? [t.nodes[0]!] : [];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const [m] of adj.get(n) ?? []) stack.push(m);
  }
  if (seen.size !== t.nodes.length) errs.push("tree is not connected");
  const lv = new Set(leaves(t));
  for (const [l, r] of t.mirror) {
    if (!lv.has(l) || !lv.has(r)) errs.push(`mirror pair ${l}/${r} is not a pair of leaves`);
  }
  if (lv.size < 2) errs.push("need at least two flaps");
  return errs;
}

function adjacency(t: FlapTree): Map<string, [string, number][]> {
  const adj = new Map<string, [string, number][]>();
  for (const e of t.edges) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), [e.b, e.length]]);
    adj.set(e.b, [...(adj.get(e.b) ?? []), [e.a, e.length]]);
  }
  return adj;
}

/** Path length between every pair of leaves. */
export function leafDistances(t: FlapTree): { leaves: string[]; d: number[][] } {
  const lv = leaves(t);
  const adj = adjacency(t);
  const d = lv.map((src) => {
    const dist = new Map<string, number>([[src, 0]]);
    const stack = [src];
    while (stack.length) {
      const n = stack.pop()!;
      for (const [m, w] of adj.get(n) ?? []) {
        if (!dist.has(m)) {
          dist.set(m, dist.get(n)! + w);
          stack.push(m);
        }
      }
    }
    return lv.map((l) => dist.get(l)!);
  });
  return { leaves: lv, d };
}

/** Length of the edge that ends at a leaf: how long that flap is. */
export function flapLength(t: FlapTree, leaf: string): number {
  return t.edges.find((e) => e.a === leaf || e.b === leaf)?.length ?? 0;
}

export const shapingCount = (t: FlapTree): number => t.shaping.reduce((s, op) => s + op.count, 0);
