// Types for the parts of flat-folder's math.js that engine/flatfold.ts uses.
type Pt = [number, number];
export declare const M: {
  expand<T>(idx: number[], arr: T[]): T[];
  encode(pair: number[]): string;
  encode_order_pair(pair: number[]): string;
  decode(key: string): number[];
  polygon_area2(poly: Pt[]): number;
  min_line_length(L: unknown[]): number;
};
