// Central tuning for every system. Kept in one place so it maps 1:1 to a
// Roblox ReplicatedStorage/Config ModuleScript.

export const RARITY = {
  common: { order: 0, nameKo: '커먼', nameEn: 'Common', colorHex: '#9ad46b', ring: '#7bb552', sell: 16, captureBonus: 0 },
  rare: { order: 1, nameKo: '레어', nameEn: 'Rare', colorHex: '#5ab0ff', ring: '#3f8fd6', sell: 55, captureBonus: 0 },
  epic: { order: 2, nameKo: '에픽', nameEn: 'Epic', colorHex: '#b96bff', ring: '#8d45cc', sell: 180, captureBonus: 0 },
  legendary: { order: 3, nameKo: '레전더리', nameEn: 'Legendary', colorHex: '#ffb020', ring: '#d18a10', sell: 620, captureBonus: 0 },
  mythic: { order: 4, nameKo: '미식', nameEn: 'Mythic', colorHex: '#ff4d6d', ring: '#d12f4c', sell: 1900, captureBonus: 0 },
};

export const CONFIG = {
  saveKey: 'dont-go-far-save-v1',
  saveVersion: 1,

  start: {
    gunpowder: 120,
    starterCreature: 'rabbit',
  },

  cannon: {
    minGunpowder: 5,
    maxGunpowder: 60,
    stepGunpowder: 5,
    defaultGunpowder: 20,
    baseRange: 30,
    rangePerGunpowder: 3.2,
    minRange: 8,
    maxRange: 300,
    /** Green zone of the timing gauge (0..1). */
    gaugeZoneStart: 0.8,
    gaugeZoneEnd: 0.95,
    /** Model escape risk for the creature you load (the "don't go far" tax). */
    creatureEscapePerMeter: 1 / 900,
    creatureEscapeCap: 0.25,
    autoTameRadius: 17,
    maxAutoCaptures: 4,
  },

  field: {
    baseHp: 100,
    baseSpeed: 9,
    tameRadius: 17,
    tameCooldownMs: 650,
    dangerMax: 100,
    dangerRaidDamage: 22,
    failEnrageMs: 9000,
  },

  yard: {
    startSlots: 6,
    maxSlots: 12,
    slotCostBase: 160,
    slotCostGrowth: 1.75,
  },

  board: {
    center: { x: -62, z: 0 },
    tileSize: 4,
    /** Board is a side view: visiting it moves the camera, not the player. */
    playerOffset: 0,
  },

  income: {
    offlineCapHours: 3,
    offlineRate: 0.5,
  },

  mutation: {
    /** Base mutation chances, before distance and pet bonuses. */
    goldBase: 0.05,
    diamondBase: 0.009,
    /** Each meter of distance adds this much chance to the roll. */
    distanceBonus: 1 / 900,
  },

  pets: {
    equipSlots: 3,
    duplicateGunpowder: 45,
  },
};

/** Distance colour band used by HUD badges. */
export const DANGER_LABEL = [
  { max: 20, text: '안전', color: '#63d2ff' },
  { max: 45, text: '주의', color: '#9ad46b' },
  { max: 70, text: '위험', color: '#ffc24a' },
  { max: 90, text: '매우 위험', color: '#ff7a4a' },
  { max: 101, text: '심연', color: '#ff4d6d' },
];
