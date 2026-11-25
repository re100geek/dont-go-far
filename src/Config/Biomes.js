// Distance bands, tuned for readability on a bright phone screen.

export const BIOMES = [
  {
    id: "meadow",
    nameKo: "초원",
    nameEn: "Meadow",
    minDist: 0,
    maxDist: 60,
    groundHex: "#7ec850",
    accentHex: "#4f9a3a",
    skyHex: "#8fd4ff",
    prop: "tree",
    dangerPerSec: 1,
    rarityBias: {"common": 70, "rare": 24, "epic": 5, "legendary": 0.9, "mythic": 0.1},
  },
  {
    id: "forest",
    nameKo: "숲",
    nameEn: "Forest",
    minDist: 60,
    maxDist: 115,
    groundHex: "#3f8f47",
    accentHex: "#286030",
    skyHex: "#7cc4e8",
    prop: "tree",
    dangerPerSec: 2,
    rarityBias: {"common": 55, "rare": 30, "epic": 10, "legendary": 4, "mythic": 1},
  },
  {
    id: "savanna",
    nameKo: "사바나",
    nameEn: "Savanna",
    minDist: 115,
    maxDist: 165,
    groundHex: "#d9b45a",
    accentHex: "#a9803a",
    skyHex: "#ffd9a0",
    prop: "deadTree",
    dangerPerSec: 3,
    rarityBias: {"common": 40, "rare": 35, "epic": 15, "legendary": 8, "mythic": 2},
  },
  {
    id: "volcano",
    nameKo: "화산",
    nameEn: "Volcano",
    minDist: 165,
    maxDist: 210,
    groundHex: "#5d3228",
    accentHex: "#c0452a",
    skyHex: "#ff9a6a",
    prop: "lava",
    dangerPerSec: 5,
    rarityBias: {"common": 20, "rare": 30, "epic": 25, "legendary": 20, "mythic": 5},
  },
  {
    id: "abyss",
    nameKo: "심연",
    nameEn: "Abyss",
    minDist: 210,
    maxDist: 260,
    groundHex: "#2c1b4f",
    accentHex: "#00e5ff",
    skyHex: "#1a0f33",
    prop: "voidCrystal",
    dangerPerSec: 8,
    rarityBias: {"common": 5, "rare": 15, "epic": 30, "legendary": 35, "mythic": 15},
  },
];

export const WORLD_RADIUS = BIOMES[BIOMES.length - 1].maxDist;

export function biomeAt(distance) {
  for (const b of BIOMES) if (distance >= b.minDist && distance < b.maxDist) return b;
  return BIOMES[BIOMES.length - 1];
}

export function biomeIndex(id) {
  return BIOMES.findIndex((b) => b.id === id);
}

