// Corpus schema (data/README.md). One record = one transcribed (or generated)
// step sequence, with batch and phase annotations. Only records with
// `published: true` feed the step-cost fit (design/costmodel.ts); everything
// else (authored demos, generated plans) is well-formed data but never counts
// toward the 20 published sequences of the M2 exit test.

import { z } from "zod";
import type { StepPlan } from "./plan.ts";

export const BATCH_KINDS = ["single", "symmetry", "repeat", "precrease", "collapse"] as const;
export const PHASES = ["precrease", "collapse", "shaping"] as const;
const PHASE_RANK: Record<(typeof PHASES)[number], number> = { precrease: 0, collapse: 1, shaping: 2 };

const StepRecord = z.object({
  panel: z.number().int().min(1),
  phase: z.enum(PHASES),
  batch: z.enum(BATCH_KINDS),
  primitive_folds: z.number().int().min(1),
  op: z.string(),
  line: z.string(),
  reference: z.string(),
  layers_before: z.number().int().nullable().optional(),
  layers_after: z.number().int().nullable().optional(),
  through_layers: z.number().int().nullable().optional(),
  view_change: z.string().optional(),
  layer_order: z.array(z.number()).optional(),
  hesitation: z.number().optional(),
  note: z.string().optional(),
});

export const SequenceRecordSchema = z.object({
  model: z.string().min(1),
  source: z.string(),
  paper: z.object({ size_cm: z.number().positive(), shape: z.string(), duo: z.boolean().optional() }),
  total_panels: z.number().int().min(0),
  minutes: z.number().nullable().optional(),
  max_layers_final: z.number().int().nullable().optional(),
  /** Grid size N of the precrease grid, null when the model is not grid-based. */
  grid_n: z.number().int().min(2).nullable(),
  /** Flap count F. */
  flaps: z.number().int().min(0),
  /** Shaping operation count S. */
  shaping_ops: z.number().int().min(0),
  /** True only for a transcription of a real published diagram sequence. */
  published: z.boolean(),
  features_note: z.string().optional(),
  steps: z.array(StepRecord),
});

export type SequenceRecord = z.infer<typeof SequenceRecordSchema>;
export type StepRecordT = z.infer<typeof StepRecord>;

export type ValidateResult = { ok: true; record: SequenceRecord } | { ok: false; errors: string[] };

export function validateRecord(json: unknown): ValidateResult {
  const p = SequenceRecordSchema.safeParse(json);
  if (!p.success) {
    return { ok: false, errors: p.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }
  const r = p.data;
  const errors: string[] = [];
  if (r.total_panels !== r.steps.length) errors.push(`total_panels ${r.total_panels} != steps.length ${r.steps.length}`);
  r.steps.forEach((s, i) => {
    if (s.panel !== i + 1) errors.push(`panel numbering: steps[${i}].panel is ${s.panel}, expected ${i + 1}`);
    if (s.batch === "single" && s.primitive_folds !== 1) errors.push(`steps[${i}]: batch single requires primitive_folds === 1, got ${s.primitive_folds}`);
    if (i > 0 && PHASE_RANK[s.phase] < PHASE_RANK[r.steps[i - 1]!.phase]) {
      errors.push(`steps[${i}]: phase ${s.phase} after ${r.steps[i - 1]!.phase} (phases must run precrease, collapse, shaping)`);
    }
  });
  if (r.published) {
    if (r.source.trim() === "") errors.push("published record needs a non-empty source");
    if (r.source.includes("<fill in>")) errors.push("published record has source containing <fill in>");
  }
  return errors.length ? { ok: false, errors } : { ok: true, record: r };
}

export interface PlanMeta {
  model: string;
  source: string;
  grid_n: number | null;
  flaps: number;
  shaping_ops: number;
  published?: boolean;
  features_note?: string;
  paper_cm?: number;
}

/** Convert a StepPlan to a record. Defaults to published:false: a plan is generated, not transcribed. */
export function planToRecord(plan: StepPlan, meta: PlanMeta): SequenceRecord {
  return {
    model: meta.model,
    source: meta.source,
    paper: { size_cm: meta.paper_cm ?? 15, shape: "square" },
    total_panels: plan.steps.length,
    grid_n: meta.grid_n,
    flaps: meta.flaps,
    shaping_ops: meta.shaping_ops,
    published: meta.published ?? false,
    ...(meta.features_note ? { features_note: meta.features_note } : {}),
    steps: plan.steps.map((s, i) => ({
      panel: i + 1,
      phase: s.phase,
      batch: s.batch.kind,
      primitive_folds: Math.max(1, s.ops.length),
      op: s.ops.map((o) => o.kind).join("+") || "none",
      line: s.text,
      reference: "exact",
    })),
  };
}
