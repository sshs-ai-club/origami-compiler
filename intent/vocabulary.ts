// The subjects the system knows by name. intent/ normalises requests against
// this list; design/ keys its stick-figure templates on the same keys.
//
// `tier` is the router's prior (GOAL.md §2): 1 tree-like, 2 axisymmetric,
// 3 arbitrary surface, 4 out of reach.

export interface Subject {
  key: string;
  synonyms: string[];
  tier: 1 | 2 | 3 | 4;
}

export const SUBJECTS: readonly Subject[] = [
  { key: "dragon", synonyms: ["dragon", "wyvern", "drake"], tier: 1 },
  { key: "bird", synonyms: ["bird", "eagle", "hawk", "dove", "pigeon", "swan", "sparrow"], tier: 1 },
  { key: "crane", synonyms: ["crane", "tsuru", "orizuru"], tier: 1 },
  { key: "quadruped", synonyms: ["dog", "cat", "horse", "deer", "wolf", "fox", "lion", "tiger", "cow", "animal", "quadruped", "four-legged animal", "4-legged animal"], tier: 1 },
  { key: "human", synonyms: ["human", "person", "man", "woman", "figure", "ninja", "samurai", "knight"], tier: 1 },
  { key: "insect", synonyms: ["insect", "beetle", "ant", "stag beetle", "bug", "mantis", "grasshopper"], tier: 1 },
  { key: "spider", synonyms: ["spider", "tarantula", "scorpion"], tier: 1 },
  { key: "fish", synonyms: ["fish", "koi", "shark", "goldfish", "whale", "dolphin"], tier: 1 },
  { key: "eiffel_tower", synonyms: ["eiffel tower", "eiffel"], tier: 1 },
  { key: "vase", synonyms: ["vase", "pot", "bowl", "cup", "cone", "dome", "shell", "lamp"], tier: 2 },
  { key: "mask", synonyms: ["mask", "face", "bust", "portrait", "statue", "bunny mesh", "stanford bunny"], tier: 3 },
];

/** Words that describe a request but are never the subject. */
export const STYLE_WORDS = ["realistic", "detailed", "simple", "easy", "3d", "3-d", "three-dimensional", "flat", "complex", "cute", "traditional", "shaped", "highly", "very", "super", "hard", "difficult", "beginner", "intermediate", "advanced"];

export function lookupSubject(text: string): Subject | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\- ]/g, " ").replace(/\s+/g, " ")} `;
  // Longest synonym first, so "stag beetle" wins over "beetle" and "eiffel tower" over "tower".
  const all = SUBJECTS.flatMap((s) => s.synonyms.map((syn) => ({ s, syn }))).sort((a, b) => b.syn.length - a.syn.length);
  for (const { s, syn } of all) {
    if (t.includes(` ${syn} `) || t.includes(` ${syn}s `)) return s;
  }
  return null;
}
