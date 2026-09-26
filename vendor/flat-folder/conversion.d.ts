// Types for the parts of flat-folder's conversion.js that engine/flatfold.ts uses.
// Names follow flat-folder's convention: V vertices, E edges, F faces, P points,
// S segments, C cells, B variables (overlapping face pairs), A assignments.
type Pt = [number, number];
export type Line = [Pt, Pt, string];
export declare const X: {
  L_2_V_EV_EL(L: Line[]): [Pt[], [number, number][], number[][], number];
  V_EV_2_VV_FV(V: Pt[], EV: [number, number][]): [number[][], number[][]];
  EV_FV_2_EF_FE(EV: [number, number][], FV: number[][]): [number[][], number[][]];
  V_FV_EV_EA_2_Vf_Ff(V: Pt[], FV: number[][], EV: [number, number][], EA: string[]): [Pt[], boolean[]];
  EF_FV_P_SP_SE_CP_SC_2_CF_FC(EF: number[][], FV: number[][], P: Pt[], SP: number[][], SE: number[][], CP: number[][], SC: number[][]): [number[][], number[][]];
  EF_SP_SE_CP_CF_2_BF(EF: number[][], SP: number[][], SE: number[][], CP: number[][], CF: number[][]): string[];
  BF_BI_EF_SE_CF_SC_2_BT(BF: string[], BI: Map<string, number>, EF: number[][], SE: number[][], CF: number[][], SC: number[][]): unknown[];
  FC_BF_BI_BT_2_CC(FC: number[][], BF: string[], BI: Map<string, number>, BT: unknown[]): unknown;
  BF_GB_GA_GI_2_edges(BF: string[], GB: number[][], GA: unknown[][], GI: number[]): string[];
  edges_Ff_2_FO(edges: string[], Ff: boolean[]): [number, number, 1 | -1][];
};
