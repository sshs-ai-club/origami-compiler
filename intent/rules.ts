// Rule-based request parser. Always available, deterministic, no API key.
// The LLM parser (llm.ts) is better at open phrasing; this one is the floor,
// and the reference its output is checked against.

import type { DesignSpec, Detail } from "./spec.ts";
import { lookupSubject } from "./vocabulary.ts";

const QUAL = String.raw`(?:(?:~|about|around|approximately|approx\.?|roughly|circa|some)\s*)*`;
const UPPER = String.raw`(?:under|less than|fewer than|below|at most|max(?:imum)?|no more than|not more than|within|up to|<=?|≤)`;
const UNIT = String.raw`(?:steps?|panels?|folds?|diagrams?)`;

export function parseRequest(raw: string): DesignSpec {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const ambiguous: string[] = [];

  // --- step budget -------------------------------------------------------
  let step_budget: DesignSpec["step_budget"] = null;
  const upperFirst = new RegExp(`${UPPER}\\s*${QUAL}(\\d+)\\s*${UNIT}`, "i").exec(lower);
  const numFirst = new RegExp(`(${QUAL})(\\d+)\\s*${UNIT}(\\s*(?:or (?:less|fewer|under|below)|max(?:imum)?|at most|tops))?`, "i").exec(lower);
  if (upperFirst) {
    const approx = new RegExp(`${UPPER}\\s*(?:~|about|around|approx|roughly)`, "i").test(upperFirst[0]);
    step_budget = { max: Number(upperFirst[1]), approximate: approx };
  } else if (numFirst) {
    const qualified = numFirst[1]!.trim().length > 0;
    const bounded = Boolean(numFirst[3]);
    step_budget = { max: Number(numFirst[2]), approximate: qualified || !bounded };
  }

  // --- sheet: grid and size ---------------------------------------------
  let grid_n: number | null = null;
  let size_cm: number | null = null;
  let shape: "square" | "rectangle" = "square";
  const dims = /(\d+(?:\.\d+)?)\s*(?:x|×|\*|by)\s*(\d+(?:\.\d+)?)\s*(cm|mm|in(?:ch(?:es)?)?\b|"|grid|squares?)?(\s+grid)?/i.exec(lower);
  if (dims) {
    const a = Number(dims[1]);
    const b = Number(dims[2]);
    const unit = (dims[3] ?? "").toLowerCase();
    if (a !== b) {
      shape = "rectangle";
      ambiguous.push(`"${dims[0].trim()}" is not square. Only square sheets are supported for now; a ${Math.min(a, b)}×${Math.min(a, b)} square will be assumed.`);
    }
    const n = Math.min(a, b);
    if (unit === "cm") size_cm = n;
    else if (unit === "mm") size_cm = n / 10;
    else if (unit.startsWith("in") || unit === '"') size_cm = Math.round(n * 2.54 * 10) / 10;
    else if (unit.startsWith("grid") || unit.startsWith("square") || dims[4]) grid_n = Math.round(n);
    else {
      // No unit. In box pleating "N×N" almost always names the grid, so read it
      // that way — but 21×21 could also be 21cm paper (A4 width), so ask.
      grid_n = Math.round(n);
      ambiguous.push(`"${dims[0].trim()}" has no unit. I read it as a ${grid_n}×${grid_n} box-pleating grid. If you meant ${n}cm × ${n}cm paper, say so.`);
    }
  }
  if (size_cm === null) {
    const sz = /(\d+(?:\.\d+)?)\s*(cm|mm)\b/i.exec(lower);
    if (sz) size_cm = sz[2]!.toLowerCase() === "mm" ? Number(sz[1]) / 10 : Number(sz[1]);
  }
  if (grid_n === null) {
    const g = /(\d+)\s*-?\s*(?:grid|divisions?)\b|grid (?:of|size)\s*(\d+)/i.exec(lower);
    if (g) grid_n = Number(g[1] ?? g[2]);
  }

  // --- sheet: count and cutting -----------------------------------------
  let count = 1;
  let cut = false;
  const sheets = /(\d+|two|three|four|multiple|several)\s+(?:sheets|papers|pieces)|modular/i.exec(lower);
  if (sheets) {
    const words: Record<string, number> = { two: 2, three: 3, four: 4 };
    const w = sheets[1]?.toLowerCase();
    count = w ? (words[w] ?? (Number(w) || 2)) : 2;
    ambiguous.push("Multiple sheets / modular origami is out of scope (GOAL.md §4). I will design for one uncut sheet.");
    count = 1;
  }
  if (/\b(cut|cuts|cutting|scissors|glue|tape)\b/i.test(lower) && !/\b(no|without|uncut)\b[^.]*\b(cut|cuts|cutting|scissors|glue|tape)\b/i.test(lower)) {
    cut = false;
    ambiguous.push("Cutting and glue are out of scope (GOAL.md §4). I will design for one uncut sheet.");
  }

  // --- style and detail -------------------------------------------------
  let style: DesignSpec["style"] = null;
  if (/\b(3d|3-d|three[- ]dimensional|realistic|shaped|sculpt)/i.test(lower)) style = "3d";
  else if (/\bflat\b/i.test(lower)) style = "flat";
  let detail: Detail | null = null;
  if (/\b(realistic|detailed|complex|intricate|highly|advanced|super complex)\b/i.test(lower)) detail = "high";
  else if (/\b(intermediate|moderate|medium)\b/i.test(lower)) detail = "medium";
  else if (/\b(simple|easy|beginner|basic|minimal)\b/i.test(lower)) detail = "simple";

  // --- target -----------------------------------------------------------
  const subject = lookupSubject(lower);
  const phrase = /(?:make|fold|design|create|build|want|need|get)\s+(?:me\s+)?(?:to\s+(?:make|fold)\s+)?(?:a|an|the|some)?\s*([a-z][a-z0-9\- ]*?)(?=\s*(?:,|\.|;|$|\bwith\b|\busing\b|\bin\b|\bfrom\b|\bon\b|\bunder\b|\bthat\b|\bwhich\b|\bof\b|\bless\b|\bfewer\b))/i.exec(text);
  const target_text = phrase?.[1]?.trim() || null;
  if (!subject) {
    ambiguous.push(
      target_text
        ? `I have no stick-figure template for "${target_text}". The Claude-backed parser can propose one; otherwise pick a known subject.`
        : "I could not tell what you want to fold. What is the subject?",
    );
  }

  // --- incompatible constraints ------------------------------------------
  if (step_budget && detail === "high" && step_budget.max < 60) {
    ambiguous.push(`"Highly detailed" and "under ${step_budget.max} steps" pull against each other. Which matters more?`);
  }
  if (step_budget && step_budget.max < 8) {
    ambiguous.push(`${step_budget.max} steps is fewer than any base takes. Did you mean ${step_budget.max * 10}?`);
  }

  return {
    raw: text,
    target: subject?.key ?? null,
    target_text,
    style,
    detail,
    step_budget,
    sheet: { shape, count, cut, size_cm, grid_n },
    ambiguous,
    source: "rules",
  };
}
