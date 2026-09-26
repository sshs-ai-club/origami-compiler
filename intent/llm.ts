// Claude-backed request parser (the only neural part of stage 1).
//
// Claude handles open phrasing; the output is schema-constrained and then
// normalised against the same vocabulary the rule parser uses. Claude never
// touches geometry (STACK.md §1).

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { parseRequest } from "./rules.ts";
import type { DesignSpec } from "./spec.ts";
import { SUBJECTS } from "./vocabulary.ts";

export const CLAUDE_MODEL = "claude-opus-5";

const SpecSchema = z.object({
  target: z.string().nullable().describe("A key from the vocabulary, or null if the subject is not in it"),
  target_text: z.string().nullable().describe("The subject as the user phrased it, e.g. 'realistic dragon'"),
  style: z.enum(["3d", "flat"]).nullable(),
  detail: z.enum(["simple", "medium", "high"]).nullable(),
  step_budget_max: z.number().int().nullable().describe("Maximum number of steps, or null if the user gave none"),
  step_budget_approximate: z.boolean(),
  sheet_size_cm: z.number().nullable(),
  sheet_grid_n: z.number().int().nullable(),
  ambiguous: z.array(z.string()).describe("Assumptions made or conflicts found, each phrased as a short question or note to the user"),
});

const SYSTEM = `You convert an origami request into a structured design specification. You do not design anything.

Vocabulary keys (use exactly one of these for "target", or null):
${SUBJECTS.map((s) => `- ${s.key}: ${s.synonyms.join(", ")}`).join("\n")}

Rules:
- Never invent a step budget. If the user gives no number of steps, step_budget_max is null.
- "about", "~", "around" make the budget approximate. "under", "less than", "at most", "or less" make it an upper bound; both can apply.
- "N x N" with a unit (cm, mm, inch) is the sheet size; with no unit it is also the sheet size in cm. Only "N x N grid" (the word grid) sets sheet_grid_n.
- "realistic", "3D", "shaped" mean style "3d". "realistic", "detailed", "complex" mean detail "high"; "simple", "easy" mean "simple".
- Only single uncut square sheets are supported. If the user asks for cutting, glue, several sheets or a non-square sheet, add a note saying so.
- If constraints conflict (for example, highly detailed but under 50 steps), add a note asking which matters more.
- If the subject is not in the vocabulary, target is null and target_text holds the subject.`;

export async function parseRequestWithClaude(raw: string, client: Anthropic = new Anthropic()): Promise<DesignSpec> {
  const response = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: raw }],
    output_config: { effort: "low", format: betaZodOutputFormat(SpecSchema) },
    // Server-side fallback: if a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to parse this request");
  const out = response.parsed_output;
  if (!out) throw new Error(`Claude returned no parseable spec (stop_reason: ${response.stop_reason})`);

  // Normalise: trust the vocabulary, not the model, for the target key.
  const known = SUBJECTS.find((s) => s.key === out.target);
  const ambiguous = [...out.ambiguous];
  if (out.target && !known) ambiguous.push(`"${out.target}" is not a known subject.`);
  return {
    raw: raw.trim(),
    target: known?.key ?? null,
    target_text: out.target_text,
    style: out.style,
    detail: out.detail,
    step_budget: out.step_budget_max === null ? null : { max: out.step_budget_max, approximate: out.step_budget_approximate },
    sheet: { shape: "square", count: 1, cut: false, size_cm: out.sheet_size_cm, grid_n: out.sheet_grid_n },
    ambiguous,
    source: "llm",
  };
}

/**
 * Use Claude when asked to, fall back to the rule parser on any failure. The
 * fallback is reported in `ambiguous` so the user knows which parser ran.
 */
export async function parseRequestAuto(raw: string, useClaude: boolean): Promise<DesignSpec> {
  if (!useClaude) return parseRequest(raw);
  try {
    return await parseRequestWithClaude(raw);
  } catch (err) {
    const spec = parseRequest(raw);
    const why = err instanceof Anthropic.AuthenticationError ? "no valid Anthropic credentials" : err instanceof Anthropic.APIError ? `API error ${err.status}` : String(err instanceof Error ? err.message : err);
    spec.ambiguous.unshift(`Claude parser unavailable (${why}); used the rule-based parser.`);
    return spec;
  }
}
