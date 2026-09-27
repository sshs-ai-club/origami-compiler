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
      (c, i) => `<tr><td>${i === 0 ? "<b>chosen</b><br>" : ""}${esc(c.id)}</td><td>${c.flaps}</td><td>${c.paper_spec.grid_n}×${c.paper_spec.grid_n}, ${c.packing.symmetry}</td><td>${c.packing.scale.toFixed(2)} <span class="muted">(${((100 * c.packing.scale) / c.paper_spec.grid_n).toFixed(1)}% of sheet)</span></td>
<td><b>${c.est_steps.total}</b> <span class="muted">= ${c.est_steps.precrease} precrease (exact) + ${c.est_steps.collapse} collapse + ${c.est_steps.shaping} shaping (estimated)</span></td>
<td>${c.within_budget === null ? "—" : c.within_budget ? '<span class="ok">yes</span>' : '<span class="bad">no</span>'}</td><td>${c.confidence.toFixed(1)}</td></tr>`,
    )
    .join("\n");
  const figures = res.design.candidates
    .map((c) => {
      const r = c.completion;
      const key = `<span class="muted">hinges blue · ridges red · axial contours green · higher contours brown (Lang's structural colouring)</span>`;
      const cpLabel = !r
        ? `<span class="muted">crease pattern not attempted for this candidate</span>`
        : r.status === "verified"
          ? `<span class="ok">crease pattern verified by flat-folder</span>: structure, then mountain/valley as solved<br>${key}`
          : `<span class="bad">crease pattern incomplete</span>: ${esc(r.reason)}${r.problems.length ? "; problem points circled" : ""}<br>${key}`;
      return `<div class="figure card"><b>${esc(c.id)}</b> <span class="muted">stick figure · grid packing</span>${res.designSvgs[c.id]}
<p style="margin:10px 0 4px">${cpLabel}</p>${res.cpSvgs[c.id]}${c.notes.map((n) => `<div class="warn">${esc(n)}</div>`).join("")}</div>`;
    })
    .join("\n");

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
<p class="muted">Scale = grid squares per unit of stick-figure length; as a percentage of the sheet it measures paper efficiency (bigger means longer, thicker flaps). Crease patterns are completed by Lang&#39;s uniaxial box pleating (ODS §13) and count as done only when flat-folder finds a layer order and the folded form is the intended base. Chosen design: ${esc(res.design.candidates[0]!.cp_status)}.</p></div>
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
${
  res.collapse
    ? `<h3>Collapse — one move</h3>
<div class="warn">This panel is not a verified fold sequence: it shows where the paper must end up. That end state <b>is</b> verified — flat-folder finds a layer order, and the folded geometry is checked to be the intended base.</div>
<div class="steps"><div class="step card">${res.collapse.structuralSvg}<p class="muted">Map: hinges blue · ridges red · axial green · higher contours brown</p></div>
<div class="step card">${res.collapse.mvSvg}<p class="muted">Mountain (orange dash-dot) and valley (blue dashed), as solved</p></div>
<div class="step card">${res.collapse.xraySvg}<p class="muted">The base, x-ray: every layer's creases where they land</p></div></div>
<p>${esc(res.collapse.text)}</p>`
    : ""
}
<h2>5 · The paper after the last generated step</h2>
<p class="muted">Only what the steps above have folded so far — not the design's full crease pattern, which is under the chosen candidate in section 3.</p>
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
