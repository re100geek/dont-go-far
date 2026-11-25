// Mutation tiers: income multiplier and model tint.

export const MUTATIONS = [
  {id: "normal", nameKo: "노말", nameEn: "Normal", mult: 1, weight: 1000, color: null },
  {id: "gold", nameKo: "골드", nameEn: "Gold", mult: 2.5, weight: 44, color: "#ffd24a" },
  {id: "diamond", nameKo: "다이아", nameEn: "Diamond", mult: 6, weight: 11, color: "#6ff0ff" },
];

export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));
export const TOTAL_MUTATION_WEIGHT = MUTATIONS.reduce((s, m) => s + m.weight, 0);

