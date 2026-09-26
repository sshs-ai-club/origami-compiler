// Node shell. Batch runs and the local demo; never computes geometry itself.
//
//   npm run origami -- "I want to make a realistic dragon, 21x21, about 200 steps"
//   npm run origami -- "..." --claude          use Claude for parsing / stick figures
//   npm run origami -- "..." --pick 2          render the third candidate
//   npm run origami -- demo dart               a complete authored model
//   npm run origami -- video out/dragon/player.html

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dartPlan } from "../sequencer/library/dart.ts";
import { bookHtml, planBookHtml } from "./book.ts";
import { type RenderedPlan, renderPlan, runPipeline } from "./pipeline.ts";
import { playerHtml } from "../motion/player.ts";

const USAGE = `usage:
  origami "<request>" [--claude] [--pick N] [--out DIR]
  origami demo dart [--out DIR]
  origami video <player.html> [--out FILE.webm] [--speed N]`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
function bool(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "request";
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (x instanceof Map ? Object.fromEntries(x) : x), 2);

function writePlanFiles(dir: string, r: RenderedPlan) {
  mkdirSync(join(dir, "steps"), { recursive: true });
  r.diagrams.forEach((svg, i) => writeFileSync(join(dir, "steps", `step-${String(i + 1).padStart(2, "0")}.svg`), svg));
  writeFileSync(join(dir, "steps", "result.svg"), r.finalSvg);
  writeFileSync(join(dir, "plan.json"), json(r.plan));
  writeFileSync(join(dir, "cp.fold"), json(r.cp));
  writeFileSync(join(dir, "folded.fold"), json(r.folded));
  writeFileSync(join(dir, "cp.svg"), r.cpSvg);
  writeFileSync(join(dir, "keyframes.json"), JSON.stringify(r.keyframes));
  writeFileSync(join(dir, "player.html"), playerHtml(r.keyframes));
  writeFileSync(join(dir, "illustrate.json"), json(r.illustrate.map(({ conditioning_svg: _svg, ...rest }) => ({ ...rest, conditioning_svg: `steps/step-${String(rest.step_id).padStart(2, "0")}.svg` }))));
}

async function main() {
  const args = process.argv.slice(2);
  const out = flag(args, "--out");
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    return;
  }

  if (args[0] === "video") {
    const player = args[1];
    if (!player) throw new Error(USAGE);
    const speed = Number(flag(args, "--speed") ?? 2);
    const { recordPlayer } = await import("./video.ts");
    const file = await recordPlayer(player, out ?? player.replace(/player\.html$/, "fold.webm"), { speed });
    console.log(`video: ${file}`);
    return;
  }

  if (args[0] === "demo") {
    if (args[1] !== "dart") throw new Error(`unknown demo "${args[1]}". Available: dart`);
    const dir = out ?? join("out", "demo-dart");
    const r = renderPlan(dartPlan());
    writePlanFiles(dir, r);
    writeFileSync(join(dir, "book.html"), planBookHtml(r));
    console.log(`${r.plan.title}: ${r.plan.steps.length} steps, max ${r.checks.maxLayers} layers, ${r.checks.localViolations} local violations`);
    console.log(`open ${join(dir, "book.html")}  ·  ${join(dir, "player.html")}`);
    return;
  }

  const useClaude = bool(args, "--claude");
  const pick = Number(flag(args, "--pick") ?? 0);
  const request = args.join(" ");
  const res = await runPipeline(request, { useClaude, pick });
  const dir = out ?? join("out", slug(res.spec.target_text ?? request));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spec.json"), json(res.spec));
  writeFileSync(join(dir, "candidates.json"), json({ route: res.design.route, candidates: res.design.candidates, rejected: res.design.rejected }));
  if (res.rendered) writePlanFiles(dir, res.rendered);
  writeFileSync(join(dir, "book.html"), bookHtml(res));

  const s = res.spec;
  console.log(`request   ${s.raw}`);
  console.log(`parsed    ${s.target ?? "?"} (${s.target_text ?? "?"}) · style ${s.style ?? "-"} · detail ${s.detail ?? "-"} · budget ${s.step_budget ? `${s.step_budget.approximate ? "~" : "≤"}${s.step_budget.max}` : "none"} · grid ${s.sheet.grid_n ?? "-"} · ${s.source}`);
  for (const a of s.ambiguous) console.log(`  note    ${a}`);
  console.log(`route     tier ${res.design.route.tier ?? "?"} · ${res.design.route.family} · ${res.design.route.reason}`);
  for (const c of res.design.candidates) {
    console.log(`candidate ${c.id.padEnd(28)} ${String(c.flaps).padStart(2)} flaps · scale ${c.packing.scale.toFixed(2)} (${c.packing.symmetry}) · ~${c.est_steps.total} steps (${c.est_steps.precrease} exact + ${c.est_steps.collapse + c.est_steps.shaping} est.)`);
  }
  for (const r of res.design.rejected) console.log(`rejected  ${r.id}: ${r.reason}`);
  for (const n of res.notes) console.log(`>> ${n}`);
  console.log(`open ${join(dir, "book.html")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
