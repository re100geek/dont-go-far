// Taming math: capture chance, mutation rolls and card creation.

import { CONFIG } from '../Config/GameConfig.js';
import { CREATURE_BY_ID } from '../Config/Creatures.js';
import { MUTATIONS, MUTATION_BY_ID } from '../Config/Mutations.js';

let uidCounter = 0;
function newUid() {
  uidCounter += 1;
  return `c${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

export class TamingSystem {
  constructor(state, pets) {
    this.state = state;
    this.pets = pets;
  }

  /** Capture chance for a species at a given distance from base. */
  chance(speciesId, distance, extra = 0) {
    const species = CREATURE_BY_ID[speciesId];
    if (!species) return 0;
    const distanceBoost = 1 + Math.min(1, distance / 260) * 0.35;
    const bonus = 1 + this.pets.bonus('capture') + extra;
    return Math.max(0.02, Math.min(0.97, species.capture * distanceBoost * bonus));
  }

  /** Mutation roll. Distance and board mutation cells raise the odds. */
  rollMutation(distance) {
    const boost = this.state.pendingMutation > 0 ? 1 + this.state.pendingMutation * 0.55 : 1;
    if (this.state.pendingMutation > 0) this.state.pendingMutation -= 1;
    const dist = Math.min(1, distance / 260);
    const gold = (CONFIG.mutation.goldBase + dist * CONFIG.mutation.distanceBonus * 3.2) * boost;
    const diamond = (CONFIG.mutation.diamondBase + dist * CONFIG.mutation.distanceBonus * 0.9) * boost;
    const roll = Math.random();
    if (roll < diamond) return 'diamond';
    if (roll < diamond + gold) return 'gold';
    return 'normal';
  }

  /** Creates a card and files it into the collection. */
  capture(speciesId, { distance = 0, mutation = null, source = 'field' } = {}) {
    const species = CREATURE_BY_ID[speciesId];
    if (!species) return null;
    const card = {
      uid: newUid(),
      speciesId,
      mutation: mutation || this.rollMutation(distance),
      distance: Math.round(distance),
      source,
      caughtAt: Date.now(),
    };
    this.state.cards.push(card);
    this.state.stats.captures += 1;
    this.state.seen[speciesId] = (this.state.seen[speciesId] || 0) + 1;
    return card;
  }

  /** Weighted species pick for a biome, drifting rarer as distance grows. */
  pickSpecies(biome, pool, rng = Math.random) {
    const bias = biome.rarityBias;
    const byRarity = {};
    for (const c of pool) (byRarity[c.rarity] ||= []).push(c);
    const tiers = Object.keys(bias).filter((r) => byRarity[r] && byRarity[r].length);
    if (!tiers.length) return pool[Math.floor(rng() * pool.length)];
    const total = tiers.reduce((s, r) => s + bias[r], 0);
    let roll = rng() * total;
    let tier = tiers[tiers.length - 1];
    for (const r of tiers) {
      if (roll < bias[r]) { tier = r; break; }
      roll -= bias[r];
    }
    const list = byRarity[tier];
    return list[Math.floor(rng() * list.length) % list.length];
  }

  mutationLabel(mutationId) {
    return MUTATION_BY_ID[mutationId] || MUTATIONS[0];
  }
}

export { newUid };
