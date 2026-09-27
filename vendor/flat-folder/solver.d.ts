// Types for the parts of flat-folder's solver.js that engine/flatfold.ts uses.
export declare const SOLVER: {
  EF_EA_Ff_BF_BI_2_BA0(EF: number[][], EA: string[], Ff: boolean[], BF: string[], BI: Map<string, number>): number[];
  /** Returns the assignment array, or a [type, faces, error-faces] triple on conflict. */
  initial_assignment(BA: number[], BF: string[], BT: unknown[], BI: Map<string, number>, FC: number[][], CF: number[][], CC: unknown, trans: { all: number; reduced: number }): unknown[];
  get_components(BI: Map<string, number>, BF: string[], BT: unknown[], BA: number[], FC: number[][], CF: number[][], CC: unknown, trans: { all: number; reduced: number }): number[][];
  /** Per component, the list of solutions; or a component index (number) on failure. */
  solve(BI: Map<string, number>, BF: string[], BT: unknown[], BA: number[], GB: number[][], FC: number[][], CF: number[][], CC: unknown, lim: number): unknown[][] | number;
};
