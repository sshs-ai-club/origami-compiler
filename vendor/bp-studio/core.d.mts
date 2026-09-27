// Types for the adapter exported by core.mjs (source: entry.ts).
export interface BlueprintInput {
  edges: { n1: number; n2: number; length: number }[];
  flaps: { id: number; x: number; y: number; width: number; height: number }[];
  width: number;
  height: number;
}
export interface BlueprintOutput {
  /** ORIPA line types: 1 border, 2 mountain (ridges), 3 valley (hinges / axial-parallels). */
  lines: { type: number; p1: { x: number; y: number }; p2: { x: number; y: number } }[];
  junctions: number;
  invalidJunctions: number;
  stretches: number;
  stretchesWithPattern: number;
}
export declare function blueprint(input: BlueprintInput): BlueprintOutput;
