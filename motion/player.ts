// Rendering half of motion/: a self-contained HTML player (no dependencies,
// works offline) that animates the keyframes with a scrub bar synced to the
// step list. `?autoplay=1` plays once and sets window.__done, which the video
// exporter (app/video.ts) waits on.

import type { MotionKeyframes } from "./keyframes.ts";

export function playerHtml(k: MotionKeyframes): string {
  const data = JSON.stringify(k).replace(/</g, "\\u003c");
  const title = k.title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — watch it fold</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f9; --fg:#1d1d1f; --muted:#6b7280; --card:#fff; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111317; --fg:#e8eaed; --muted:#9aa0a6; --card:#1b1e23; } }
  body { margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--fg); }
  main { max-width:760px; margin:0 auto; padding:16px; }
  h1 { font-size:18px; margin:4px 0 12px; }
  canvas { width:100%; aspect-ratio: 4 / 3; background:var(--card); border-radius:10px; display:block; }
  .bar { display:flex; gap:8px; align-items:center; margin-top:10px; flex-wrap:wrap; }
  button, select { font:inherit; padding:4px 10px; border-radius:6px; border:1px solid #9994; background:var(--card); color:var(--fg); cursor:pointer; }
  input[type=range] { flex:1; min-width:160px; }
  #cap { margin-top:10px; min-height:3em; line-height:1.4; }
  #cap b { color:var(--muted); font-weight:600; margin-right:6px; }
</style></head>
<body><main>
<h1>${title}</h1>
<canvas id="c" width="1280" height="960"></canvas>
<div class="bar">
  <button id="prev" title="previous step">⏮</button>
  <button id="play">▶</button>
  <button id="next" title="next step">⏭</button>
  <input id="scrub" type="range" min="0" step="0.001" value="0">
  <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select>
</div>
<div id="cap"></div>
</main>
<script>
const K = ${data};
const timeline = [];
K.steps.forEach((s, si) => s.ops.forEach((op) => timeline.push({ si, op })));
const scrub = document.getElementById("scrub");
scrub.max = String(timeline.length);
const cv = document.getElementById("c"), g = cv.getContext("2d");

// Normalise the scene: centre the bounding box of every state, longest side = 1.
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const t of timeline) for (const f of t.op.faces) for (const [x, y] of f.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
for (const f of K.final) for (const [x, y] of f.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const S = 1 / Math.max(x1 - x0, y1 - y0), CX = (x0 + x1) / 2, CY = (y0 + y1) / 2;
const TILT = 0.5, DIST = 3.2, ZSTEP = 0.004;

function project([x, y, z]) {
  const X = (x - CX) * S, Y = (y - CY) * S, Z = z * S;
  const yy = Y * Math.cos(TILT) - Z * Math.sin(TILT);
  const zz = Y * Math.sin(TILT) + Z * Math.cos(TILT);
  const k = DIST / (DIST - zz);
  const scale = Math.min(cv.width, cv.height) * 0.78;
  return [cv.width / 2 + X * k * scale, cv.height / 2 - yy * k * scale, zz];
}

function rotate(P, A, u, th) {
  const v = [P[0] - A[0], P[1] - A[1], P[2] - A[2]];
  const c = Math.cos(th), s = Math.sin(th), d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [0, 1, 2].map((i) => A[i] + v[i] * c + cr[i] * s + u[i] * d * (1 - c));
}

const ease = (u) => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

function drawFaces(faces, moving, axis, theta, pinch) {
  const zmax = Math.max(0, ...faces.map((f) => f.z)) * ZSTEP;
  const [p, q] = axis || [[0, 0], [1, 0]];
  const dl = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  const u = [(q[0] - p[0]) / dl, (q[1] - p[1]) / dl, 0];
  // Rotate about an axis just above (or below) the whole stack so the flap lands on top (or underneath).
  let h = 0;
  const mv = faces.filter((f) => moving.has(f.id));
  if (mv.length) {
    const c = mv[0].pts.reduce((a, b) => [a[0] + b[0] / mv[0].pts.length, a[1] + b[1] / mv[0].pts.length], [0, 0]);
    const sideSign = Math.sign(u[0] * (c[1] - p[1]) - u[1] * (c[0] - p[0]));
    h = sideSign * Math.sign(theta) > 0 || theta === 0 ? zmax + ZSTEP : -ZSTEP;
  }
  const A = [p[0], p[1], h];
  const polys = faces.map((f) => {
    const pts3 = f.pts.map(([x, y]) => [x, y, f.z * ZSTEP]);
    const moved = moving.has(f.id) ? pts3.map((P) => rotate(P, A, u, theta)) : pts3;
    const scr = moved.map(project);
    let area = 0;
    for (let i = 0; i < scr.length; i++) { const a = scr[i], b = scr[(i + 1) % scr.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const rest = f.pts.map(([x, y]) => project([x, y, f.z * ZSTEP]));
    let area0 = 0;
    for (let i = 0; i < rest.length; i++) { const a = rest[i], b = rest[(i + 1) % rest.length]; area0 += a[0] * b[1] - b[0] * a[1]; }
    const back = f.back !== (Math.sign(area) !== Math.sign(area0));
    const depth = scr.reduce((s, v) => s + v[2], 0) / scr.length;
    return { scr, back, depth, z: f.z, moving: moving.has(f.id) };
  });
  polys.sort((a, b) => a.depth - b.depth || a.z - b.z);
  g.clearRect(0, 0, cv.width, cv.height);
  g.lineJoin = "round";
  for (const P of polys) {
    g.beginPath();
    P.scr.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = P.back ? "#8fbfe0" : "#ffffff";
    g.fill();
    g.strokeStyle = "rgba(40,44,52,0.55)";
    g.lineWidth = 1.2;
    g.stroke();
  }
  if (axis && moving.size) {
    const a = project([p[0] - u[0] * 2, p[1] - u[1] * 2, 0]), b = project([p[0] + u[0] * 2, p[1] + u[1] * 2, 0]);
    g.save(); g.setLineDash([14, 10]); g.strokeStyle = "rgba(10,88,202,0.35)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
  }
  if (pinch) {
    const c = project([pinch[0], pinch[1], zmax + ZSTEP]);
    g.fillStyle = "#0a58ca"; g.beginPath(); g.arc(c[0], c[1], 9, 0, Math.PI * 2); g.fill();
  }
}

let pos = 0, playing = false, last = 0;
const params = new URLSearchParams(location.search);
function render() {
  const idx = Math.floor(pos);
  if (idx >= timeline.length) {
    drawFaces(K.final, new Set(), null, 0, null);
    caption(K.steps.length - 1, true);
    return;
  }
  const { si, op } = timeline[idx];
  const u = pos - idx;
  const th = (op.angle_deg * Math.PI) / 180 * (op.unfold ? 0.92 * Math.sin(Math.PI * u) : ease(u));
  drawFaces(op.faces, new Set(op.moving), op.axis, op.pinch ? 0 : th, op.pinch && u < 0.8 ? op.pinch : null);
  caption(si, false);
}
function caption(si, done) {
  const s = K.steps[si];
  document.getElementById("cap").innerHTML = done ? "<b>Done.</b>" + escape(K.steps.length + " steps.") : "<b>Step " + s.step_id + " / " + K.steps.length + "</b>" + escape(s.text);
}
function escape(t) { return t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }
function tick(now) {
  if (playing) {
    const idx = Math.min(Math.floor(pos), timeline.length - 1);
    const dur = timeline[idx] ? timeline[idx].op.duration_ms : 1000;
    pos += ((now - last) / dur) * Number(document.getElementById("speed").value);
    if (pos >= timeline.length) { pos = timeline.length; playing = false; document.getElementById("play").textContent = "▶"; window.__done = true; }
    scrub.value = String(pos);
    render();
  }
  last = now;
  requestAnimationFrame(tick);
}
function stepStart(si) { const i = timeline.findIndex((t) => t.si === si); return i < 0 ? timeline.length : i; }
document.getElementById("play").onclick = () => { if (pos >= timeline.length) pos = 0; playing = !playing; document.getElementById("play").textContent = playing ? "⏸" : "▶"; };
document.getElementById("next").onclick = () => { const si = pos >= timeline.length ? K.steps.length : timeline[Math.floor(pos)].si + 1; pos = stepStart(si); scrub.value = String(pos); render(); };
document.getElementById("prev").onclick = () => { const cur = pos >= timeline.length ? K.steps.length : timeline[Math.floor(pos)].si; pos = stepStart(Math.max(0, pos - stepStart(cur) > 0.05 ? cur : cur - 1)); scrub.value = String(pos); render(); };
scrub.oninput = () => { pos = Number(scrub.value); playing = false; document.getElementById("play").textContent = "▶"; render(); };
if (params.get("speed")) document.getElementById("speed").value = params.get("speed");
render();
if (params.get("autoplay")) { playing = true; document.getElementById("play").textContent = "⏸"; }
requestAnimationFrame((t) => { last = t; tick(t); });
</script>
</body></html>`;
}
