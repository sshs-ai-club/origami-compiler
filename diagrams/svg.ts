// Styling half of diagrams/: geometry -> SVG in Yoshizawa–Randlett notation.
// Valley = dashed, mountain = dash-dot, fold arrow with a filled head, fold
// behind with a hollow head, crease-and-unfold with heads at both ends.
// This file never computes geometry beyond the page transform.

import type { Vec } from "../engine/geom.ts";
import type { FoldFile } from "../engine/foldfile.ts";
import type { CPLine } from "../design/boxpleat.ts";
import type { Packing } from "../design/packing.ts";
import { type FlapTree, leaves } from "../design/tree.ts";
import type { DiagramGeometry } from "./geometry.ts";

export const PALETTE = {
  front: "#ffffff",
  back: "#8fbfe0",
  edge: "#1d1d1f",
  crease: "#a3a9b0",
  valley: "#0a58ca",
  mountain: "#c2410c",
  arrow: "#1d1d1f",
};

const f = (v: number) => (Math.round(v * 100) / 100).toString();

function pageTransform(bbox: [number, number, number, number], size: number, pad: number) {
  const [x0, y0, x1, y1] = bbox;
  const k = (size - 2 * pad) / Math.max(x1 - x0, y1 - y0, 1e-9);
  const w = (x1 - x0) * k + 2 * pad;
  const h = (y1 - y0) * k + 2 * pad;
  // Folded coordinates are y-up; SVG is y-down.
  return { k, w, h, at: (p: Vec): [number, number] => [(p[0] - x0) * k + pad, (y1 - p[1]) * k + pad] };
}

export function diagramSvg(g: DiagramGeometry, opts: { size?: number; label?: string } = {}): string {
  const size = opts.size ?? 360;
  const T = pageTransform(g.bbox, size, 34);
  const pts = (ps: readonly Vec[]) => ps.map((p) => T.at(p).map(f).join(",")).join(" ");
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(T.w)} ${f(T.h)}" width="${f(T.w)}" height="${f(T.h)}" font-family="system-ui, sans-serif">`);
  out.push(`<defs>
  <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${PALETTE.arrow}"/></marker>
  <marker id="hollow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fff" stroke="${PALETTE.arrow}" stroke-width="1.2"/></marker>
</defs>`);
  for (const face of g.faces) {
    out.push(`<polygon points="${pts(face.pts)}" fill="${face.back ? PALETTE.back : PALETTE.front}" stroke="none"/>`);
    for (const e of face.edges) {
      const [a, b] = [T.at(e.a), T.at(e.b)];
      const style = e.kind === "edge" ? `stroke="${PALETTE.edge}" stroke-width="1.3"` : `stroke="${PALETTE.crease}" stroke-width="0.6"`;
      out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${style} stroke-linecap="round"/>`);
    }
  }
  for (const l of g.polylines) {
    const style =
      l.kind === "valley"
        ? `stroke="${PALETTE.valley}" stroke-width="1.8" stroke-dasharray="7 5"`
        : l.kind === "mountain"
          ? `stroke="${PALETTE.mountain}" stroke-width="1.8" stroke-dasharray="9 4 2 4"`
          : l.kind === "pinch"
            ? `stroke="${PALETTE.valley}" stroke-width="2.2"`
            : `stroke="${PALETTE.crease}" stroke-width="0.8" stroke-dasharray="2 3"`;
    out.push(`<polyline points="${pts(l.pts)}" fill="none" ${style} stroke-linecap="round"/>`);
  }
  for (const m of g.marks) {
    const [x, y] = T.at(m);
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${PALETTE.crease}"/>`);
  }
  for (const a of g.arrows) {
    const [p, q] = [T.at(a.from), T.at(a.to)];
    const m: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const d: [number, number] = [q[0] - p[0], q[1] - p[1]];
    const bend = 0.35 * a.bend;
    const c: [number, number] = [m[0] - d[1] * bend, m[1] + d[0] * bend];
    const head = a.kind === "fold-behind" ? "hollow" : "head";
    const start = a.kind === "fold-unfold" ? ` marker-start="url(#head)"` : "";
    out.push(`<path d="M${f(p[0])},${f(p[1])} Q${f(c[0])},${f(c[1])} ${f(q[0])},${f(q[1])}" fill="none" stroke="${PALETTE.arrow}" stroke-width="1.3" marker-end="url(#${head})"${start}/>`);
  }
  if (g.view.rotate_deg) {
    out.push(`<g transform="translate(${f(T.w - 26)},22)"><path d="M-9,4 A10,10 0 1,1 4,9" fill="none" stroke="${PALETTE.arrow}" stroke-width="1.3" marker-end="url(#head)"/><text x="0" y="28" font-size="10" text-anchor="middle">${g.view.rotate_deg}°</text></g>`);
  }
  if (opts.label) out.push(`<text x="10" y="20" font-size="16" font-weight="600">${escapeXml(opts.label)}</text>`);
  out.push("</svg>");
  return out.join("\n");
}

export function creasePatternSvg(cp: FoldFile, size = 420): string {
  const T = pageTransform([0, 0, 1, 1], size, 12);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(T.w)} ${f(T.h)}" width="${f(T.w)}" height="${f(T.h)}">`, `<rect x="0" y="0" width="${f(T.w)}" height="${f(T.h)}" fill="#fff"/>`];
  const order = { F: 0, U: 0, V: 1, M: 1, B: 2 } as const;
  const idx = cp.edges_vertices.map((_, i) => i).sort((a, b) => order[cp.edges_assignment?.[a] ?? "U"] - order[cp.edges_assignment?.[b] ?? "U"]);
  for (const i of idx) {
    const [u, v] = cp.edges_vertices[i]!;
    const a = T.at(cp.vertices_coords[u] as unknown as Vec);
    const b = T.at(cp.vertices_coords[v] as unknown as Vec);
    const as = cp.edges_assignment?.[i] ?? "U";
    const style =
      as === "B"
        ? `stroke="${PALETTE.edge}" stroke-width="1.6"`
        : as === "M"
          ? `stroke="${PALETTE.mountain}" stroke-width="1" stroke-dasharray="6 3 1.5 3"`
          : as === "V"
            ? `stroke="${PALETTE.valley}" stroke-width="1" stroke-dasharray="5 3"`
            : `stroke="${PALETTE.crease}" stroke-width="0.8"`;
    out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${style}/>`);
  }
  out.push("</svg>");
  return out.join("\n");
}

/**
 * A box-pleated layout in Lang's structural colouring (ODS §13.5): hinges
 * blue, ridges red, axial contours green, higher contours brown and lighter
 * with elevation. Grid-unit lines on an n×n sheet; `problems` are circled.
 */
export function structuralSvg(lines: readonly CPLine[], n: number, problems: readonly Vec[] = [], size = 300): string {
  const T = pageTransform([0, 0, 1, 1], size, 12);
  // same orientation as designSvg and the FOLD crease pattern (grid / n)
  const at = (p: Vec) => T.at([p[0] / n, p[1] / n]);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(T.w)} ${f(T.h)}" width="${f(T.w)}" height="${f(T.h)}">`, `<rect width="100%" height="100%" fill="#fff"/>`];
  for (let k = 1; k < n; k++) {
    const [a, b, c, d] = [at([k, 0]), at([k, n]), at([0, k]), at([n, k])];
    out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#f1f3f5" stroke-width="0.5"/><line x1="${f(c[0])}" y1="${f(c[1])}" x2="${f(d[0])}" y2="${f(d[1])}" stroke="#f1f3f5" stroke-width="0.5"/>`);
  }
  const maxE = Math.max(1, ...lines.map((l) => l.elevation ?? 0));
  const colour = (l: CPLine) =>
    l.role === "hinge" ? "#1f5fbf" : l.role === "ridge" ? "#d92d20" : l.elevation === 0 ? "#2f9e44" : shade("#8a5a2b", "#e3c9a8", (l.elevation ?? 0) / maxE);
  const order = { contour: 0, hinge: 1, ridge: 2 } as const;
  for (const l of [...lines].sort((x, y) => order[x.role] - order[y.role])) {
    const [a, b] = [at(l.a), at(l.b)];
    out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${colour(l)}" stroke-width="${l.role === "contour" ? 0.9 : 1.2}" stroke-linecap="round"/>`);
  }
  const [p0, p1] = [at([0, 0]), at([n, n])];
  out.push(`<rect x="${f(Math.min(p0[0], p1[0]))}" y="${f(Math.min(p0[1], p1[1]))}" width="${f(Math.abs(p1[0] - p0[0]))}" height="${f(Math.abs(p1[1] - p0[1]))}" fill="none" stroke="${PALETTE.edge}" stroke-width="1.6"/>`);
  for (const v of problems) {
    const [x, y] = at(v);
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="none" stroke="#d92d20" stroke-width="1.6"/>`);
  }
  out.push("</svg>");
  return out.join("\n");
}

/**
 * X-ray of a folded state (Lang's convention, ODS Fig 13.7): every crease of
 * every layer drawn where it lands, in the colour of its structural role when
 * `roleOf` is given. Geometry comes from flat-folder's folded coordinates.
 */
export function foldedXraySvg(folded: FoldFile, roleOf?: (edge: number) => CPLine["role"] | "border", size = 300): string {
  const V = folded.vertices_coords;
  const xs = V.map((v) => v[0]!), ys = V.map((v) => v[1]!);
  const T = pageTransform([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], size, 12);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(T.w)} ${f(T.h)}" width="${f(T.w)}" height="${f(T.h)}">`, `<rect width="100%" height="100%" fill="#fff"/>`];
  const col = { hinge: "#1f5fbf", ridge: "#d92d20", contour: "#2f9e44", border: PALETTE.edge };
  folded.edges_vertices.forEach(([u, v], i) => {
    const [a, b] = [T.at(V[u] as unknown as Vec), T.at(V[v] as unknown as Vec)];
    const role = roleOf?.(i) ?? (folded.edges_assignment?.[i] === "B" ? "border" : "contour");
    out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${col[role]}" stroke-width="${role === "border" ? 1.1 : 0.7}" stroke-opacity="0.55"/>`);
  });
  out.push("</svg>");
  return out.join("\n");
}

/** Linear blend of two #rrggbb colours (plain hex: every SVG renderer reads it). */
function shade(from: string, to: string, t: number): string {
  const c = (h: string, k: number) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
  return `#${[0, 1, 2].map((k) => Math.round(c(from, k) + (c(to, k) - c(from, k)) * Math.min(1, Math.max(0, t))).toString(16).padStart(2, "0")).join("")}`;
}

/** Stick figure (left) and its grid packing (right). */
export function designSvg(tree: FlapTree, packing: Packing, size = 300): string {
  const N = packing.grid_n;
  const cell = (size - 24) / N;
  const gx = (x: number) => 12 + x * cell;
  const gy = (y: number) => size - 12 - y * cell;
  const lv = leaves(tree);
  const hue = (i: number) => `hsl(${Math.round((i * 360) / lv.length)} 65% 55%)`;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * 2 + 20} ${size}" width="${size * 2 + 20}" height="${size}" font-family="system-ui, sans-serif" font-size="10">`];

  // --- stick figure: radial layout from the most central node
  const layout = radialLayout(tree);
  const sx = (p: Vec) => size / 2 + p[0] * (size * 0.42);
  const sy = (p: Vec) => size / 2 - p[1] * (size * 0.42);
  for (const e of tree.edges) {
    const a = layout.get(e.a)!, b = layout.get(e.b)!;
    out.push(`<line x1="${f(sx(a))}" y1="${f(sy(a))}" x2="${f(sx(b))}" y2="${f(sy(b))}" stroke="#444" stroke-width="2.2" stroke-linecap="round"/>`);
  }
  for (const n of tree.nodes) {
    const p = layout.get(n)!;
    const i = lv.indexOf(n);
    out.push(`<circle cx="${f(sx(p))}" cy="${f(sy(p))}" r="${i >= 0 ? 4 : 2.5}" fill="${i >= 0 ? hue(i) : "#444"}"/>`);
    if (i >= 0) out.push(`<text x="${f(sx(p) + 6)}" y="${f(sy(p) + 3)}">${escapeXml(n)}</text>`);
  }

  // --- packing on the grid
  out.push(`<g transform="translate(${size + 20},0)">`);
  out.push(`<rect x="12" y="12" width="${f(N * cell)}" height="${f(N * cell)}" fill="#fff" stroke="#1d1d1f" stroke-width="1.2"/>`);
  for (let k = 1; k < N; k++) {
    out.push(`<line x1="${f(gx(k))}" y1="12" x2="${f(gx(k))}" y2="${f(12 + N * cell)}" stroke="#eceff1" stroke-width="0.6"/>`);
    out.push(`<line x1="12" y1="${f(gy(k))}" x2="${f(12 + N * cell)}" y2="${f(gy(k))}" stroke="#eceff1" stroke-width="0.6"/>`);
  }
  out.push(`<clipPath id="sheet"><rect x="12" y="12" width="${f(N * cell)}" height="${f(N * cell)}"/></clipPath><g clip-path="url(#sheet)">`);
  lv.forEach((l, i) => {
    const [x, y] = packing.positions[l]!;
    const r = packing.flap_radius[l]!;
    out.push(`<rect x="${f(gx(x - r))}" y="${f(gy(y + r))}" width="${f(2 * r * cell)}" height="${f(2 * r * cell)}" fill="${hue(i)}" fill-opacity="0.28" stroke="${hue(i)}" stroke-width="1"/>`);
  });
  out.push(`</g>`);
  lv.forEach((l, i) => {
    const [x, y] = packing.positions[l]!;
    out.push(`<circle cx="${f(gx(x))}" cy="${f(gy(y))}" r="3.5" fill="${hue(i)}" stroke="#fff"/>`);
  });
  out.push(`</g></svg>`);
  return out.join("\n");
}

function radialLayout(tree: FlapTree): Map<string, Vec> {
  const adj = new Map<string, { n: string; w: number }[]>();
  for (const e of tree.edges) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), { n: e.b, w: e.length }]);
    adj.set(e.b, [...(adj.get(e.b) ?? []), { n: e.a, w: e.length }]);
  }
  const root = [...adj.entries()].sort((a, b) => b[1].length - a[1].length)[0]![0];
  const leafCount = new Map<string, number>();
  const count = (n: string, parent: string | null): number => {
    const kids = adj.get(n)!.filter((k) => k.n !== parent);
    const c = kids.length === 0 ? 1 : kids.reduce((s, k) => s + count(k.n, n), 0);
    leafCount.set(n, c);
    return c;
  };
  count(root, null);
  const pos = new Map<string, Vec>([[root, [0, 0]]]);
  let maxR = 0;
  const place = (n: string, parent: string | null, a0: number, a1: number, r: number) => {
    const kids = adj.get(n)!.filter((k) => k.n !== parent);
    let a = a0;
    for (const k of kids) {
      const span = ((a1 - a0) * leafCount.get(k.n)!) / leafCount.get(n)!;
      const ang = a + span / 2;
      const rr = r + k.w;
      maxR = Math.max(maxR, rr);
      pos.set(k.n, [rr * Math.cos(ang), rr * Math.sin(ang)]);
      place(k.n, n, a, a + span, rr);
      a += span;
    }
  };
  place(root, null, Math.PI / 2, Math.PI / 2 + 2 * Math.PI, 0);
  for (const [k, v] of pos) pos.set(k, [v[0] / maxR, v[1] / maxR]);
  return pos;
}

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
