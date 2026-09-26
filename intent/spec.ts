// DesignSpec: the contract between intent/ and design/ (ARCHITECTURE.md §7).
// Changing this shape is a joint decision and needs a docs/decisions.md entry.

export type Detail = "simple" | "medium" | "high";

export interface DesignSpec {
  /** The request exactly as typed. */
  raw: string;
  /** Normalised subject key from the vocabulary (e.g. "dragon"), or null if unknown. */
  target: string | null;
  /** The subject as the user phrased it (e.g. "realistic dragon"). */
  target_text: string | null;
  /** "3d" when the finished model is shaped; "flat" for a flat model. null = not said. */
  style: "3d" | "flat" | null;
  detail: Detail | null;
  /**
   * Hard budget on diagram panels. null means unconstrained — never guessed
   * (intent/README.md). `approximate` records phrasing like "about 200".
   */
  step_budget: { max: number; approximate: boolean } | null;
  sheet: {
    shape: "square" | "rectangle";
    count: number;
    cut: boolean;
    /** Side length of the sheet, if the user gave one. */
    size_cm: number | null;
    /** Box-pleating grid divisions (N for an N×N grid), if the user gave one. */
    grid_n: number | null;
  };
  /**
   * Things we had to assume or could not satisfy. Each entry is phrased so it
   * can be shown to the user as-is, ideally as a single clarifying question.
   */
  ambiguous: string[];
  /** Which parser produced this. */
  source: "rules" | "llm";
}
