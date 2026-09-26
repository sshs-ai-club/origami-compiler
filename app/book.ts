// The instruction book: one self-contained HTML page. It must surface, not
// hide, that estimates are estimates and that a plan is partial
// (app/README.md, honesty requirements).

import { escapeXml as esc } from "../diagrams/svg.ts";
import type { PipelineResult, RenderedPlan } from "./pipeline.ts";

const CSS = `
:root { color-scheme: light dark; --bg:#f6f7f9; --fg:#1d1d1f; --muted:#5f6670; --card:#fff; --line:#e3e6ea; --warn-bg:#fff6db; --warn-fg:#6b4e00; --ok:#1a7f37; --bad:#b42318; }
@media (prefers-color-scheme: dark) { :root { --bg:#111317; --fg:#e8eaed; --muted:#9aa0a6; --card:#1b1e23; --line:#2c3036; --warn-bg:#3a2f0b; --warn-fg:#f5d77a; --ok:#57c26b; --bad:#f97066; } }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, sans-serif; background:var(--bg); color:var(--fg); line-height:1.5; }
main { max-width: 1040px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 19px; margin: 36px 0 12px; }
.muted { color: var(--muted); }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.warn { background: var(--warn-bg); color: var(--warn-fg); border-radius: 10px; padding: 12px 14px; margin: 10px 0; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
.scroll { overflow-x: auto; }
.steps { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.step svg, .figure svg { width: 100%; height: auto; background: #fff; border-radius: 8px; }
.step p { margin: 8px 2px 0; font-size: 14px; }
.chip { display:inline-block; font-size:12px; padding:1px 8px; border-radius: 99px; border:1px solid var(--line); margin-right: 4px; }
.ok { color: var(--ok); } .bad { color: var(--bad); }
a { color: inherit; }
`;

function stepsSection(r: RenderedPlan): string {
  const panels = r.plan.steps.map((s, i) => `<div class="step card">${r.diagrams[i]}<p>${esc(s.text)}</p><p class="muted">${s.ops.length} fold${s.ops.length === 1 ? "" : "s"} · ${s.batch.kind}</p></div>`);
  panels.push(`<div class="step card">${r.finalSvg}<p>${r.plan.status === "partial" ? "Where the generated instructions stop." : "Finished."}</p></div>`);
  return `<div class="steps">${panels.join("\n")}</div>`;
}

export function bookHtml(res: PipelineResult): string {
  const s = res.spec;
  const r = res.rendered;
  const budget = s.step_budget ? `${s.step_budget.approximate ? "about " : ""}≤ ${s.step_budget.max}` : "none given";
  const rows = res.design.candidates
    .map(
      (c, i) => `<tr><td>${i === 0 ? "<b>chosen</b><br>" : ""}${esc(c.id)}</td><td>${c.flaps}</td><td>${c.paper_spec.grid_n}×${c.paper_spec.grid_n}, ${c.packing.symmetry}</td><td>${c.packing.scale.toFixed(2)}</td>
<td><b>${c.est_steps.total}</b> <span class="muted">= ${c.est_steps.precrease} precrease (exact) + ${c.est_steps.collapse} collapse + ${c.est_steps.shaping} shaping (estimated)</span></td>
<td>${c.within_budget === null ? "—" : c.within_budget ? '<span class="ok">yes</span>' : '<span class="bad">no</span>'}</td><td>${c.confidence.toFixed(1)}</td></tr>`,
    )
    .join("\n");
  const figures = res.design.candidates.map((c) => `<div class="figure card"><b>${esc(c.id)}</b> <span class="muted">stick figure · grid packing</span>${res.designSvgs[c.id]}${c.notes.map((n) => `<div class="warn">${esc(n)}</div>`).join("")}</div>`).join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r?.plan.title ?? "origami-compiler")}</title><style>${CSS}</style></head><body><main>
<h1>${esc(r?.plan.title ?? s.target_text ?? "Your request")}</h1>
<p class="muted">“${esc(s.raw)}”</p>

${res.notes.map((n) => `<div class="warn">${esc(n)}</div>`).join("\n")}

<h2>1 · What I understood</h2>
<div class="card scroll"><table>
<tr><th>Subject</th><td>${esc(s.target_text ?? "?")} ${s.target ? `<span class="chip">${esc(s.target)}</span>` : '<span class="chip">unknown</span>'}</td></tr>
<tr><th>Style / detail</th><td>${esc(s.style ?? "not said")} / ${esc(s.detail ?? "not said")}</td></tr>
<tr><th>Step budget</th><td>${esc(budget)}</td></tr>
<tr><th>Sheet</th><td>one uncut square${s.sheet.grid_n ? `, ${s.sheet.grid_n}×${s.sheet.grid_n} grid` : ""}${s.sheet.size_cm ? `, ${s.sheet.size_cm} cm` : ""}</td></tr>
<tr><th>Parser</th><td>${s.source === "llm" ? "Claude" : "rule-based"}</td></tr>
</table>
${s.ambiguous.map((a) => `<div class="warn">${esc(a)}</div>`).join("\n")}
</div>

<h2>2 · Design route</h2>
<div class="card"><p><b>Tier ${res.design.route.tier ?? "?"}</b> · ${esc(res.design.route.family)} · confidence ${res.design.route.confidence}</p><p>${esc(res.design.route.reason)}</p></div>

${
  res.design.candidates.length
    ? `<h2>3 · Candidates</h2>
<div class="card scroll"><table><tr><th>design</th><th>flaps</th><th>grid</th><th>scale</th><th>steps</th><th>in budget</th><th>confidence</th></tr>${rows}</table>
<p class="muted">Scale = grid squares per unit of stick-figure length; bigger means longer, thicker flaps. Packing is a necessary condition only. No candidate has a crease pattern yet: ${esc(res.design.candidates[0]!.cp_status)}.</p></div>
<div class="steps" style="margin-top:14px">${figures}</div>
${res.design.rejected.length ? `<details class="card" style="margin-top:14px"><summary>${res.design.rejected.length} rejected</summary><ul>${res.design.rejected.map((x) => `<li>${esc(x.id)}: ${esc(x.reason)}</li>`).join("")}</ul></details>` : ""}`
    : ""
}

${
  r
    ? `<h2>4 · Instructions</h2>
${r.plan.status === "partial" && r.plan.stalled_at ? `<div class="warn"><b>Partial.</b> These ${r.plan.steps.length} steps are generated and verified by the geometry engine. They stop at the <b>${esc(r.plan.stalled_at.phase)}</b>: ${esc(r.plan.stalled_at.reason)}${r.plan.remaining_estimate ? ` Still to come: about ${r.plan.remaining_estimate.collapse} collapse and ${r.plan.remaining_estimate.shaping} shaping steps.` : ""}</div>` : ""}
<p><a href="player.html">▶ Watch it fold</a> · <a href="cp.fold">crease pattern (FOLD)</a> · <a href="folded.fold">folded state (FOLD)</a> · <a href="plan.json">StepPlan</a></p>
${stepsSection(r)}
<h2>5 · Crease pattern so far</h2>
<div class="card figure" style="max-width:460px">${r.cpSvg}<p class="muted">Valley = blue dashed, mountain = orange dash-dot. Checks: max ${r.checks.maxLayers} layer(s); ${r.checks.localViolations} Kawasaki/Maekawa violation(s) among folded creases.</p></div>`
    : ""
}
</main></body></html>`;
}

/** A book for a plan with no design stage (library models, demos). */
export function planBookHtml(r: RenderedPlan): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.plan.title)}</title><style>${CSS}</style></head><body><main>
<h1>${esc(r.plan.title)}</h1>
<p class="muted">${r.plan.steps.length} steps · every step verified by the geometry engine · <a href="player.html">▶ Watch it fold</a> · <a href="cp.fold">crease pattern (FOLD)</a></p>
${stepsSection(r)}
<h2>Crease pattern</h2>
<div class="card figure" style="max-width:460px">${r.cpSvg}<p class="muted">Max ${r.checks.maxLayers} layers; ${r.checks.localViolations} Kawasaki/Maekawa violation(s).</p></div>
</main></body></html>`;
}
