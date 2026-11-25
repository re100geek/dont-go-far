// Base yard: tamed creatures placed here produce gunpowder over time.

import { CONFIG } from '../Config/GameConfig.js';
import { CREATURE_BY_ID } from '../Config/Creatures.js';
import { MUTATION_BY_ID } from '../Config/Mutations.js';

export class YardSystem {
  constructor(state) {
    this.state = state;
    this.slots = state.yardSlots || CONFIG.yard.startSlots;
    state.yardSlots = this.slots;
  }

  get capacity() {
    return this.slots;
  }

  get placed() {
    return this.state.yard.length;
  }

  get free() {
    return this.slots - this.state.yard.length;
  }

  slotsFull() {
    return this.free <= 0;
  }

  nextSlotCost() {
    const step = this.slots - CONFIG.yard.startSlots;
    return Math.round(CONFIG.yard.slotCostBase * Math.pow(CONFIG.yard.slotCostGrowth, step));
  }

  canBuySlot() {
    return this.slots < CONFIG.yard.maxSlots;
  }

  buySlot(economy) {
    if (!this.canBuySlot()) return false;
    const cost = this.nextSlotCost();
    if (!economy.spend(cost)) return false;
    this.slots += 1;
    this.state.yardSlots = this.slots;
    return true;
  }

  cardById(uid) {
    return this.state.cards.find((c) => c.uid === uid) || null;
  }

  isPlaced(uid) {
    return this.state.yard.includes(uid);
  }

  place(uid) {
    if (this.isPlaced(uid)) return true;
    if (this.slotsFull()) return false;
    if (!this.cardById(uid)) return false;
    this.state.yard.push(uid);
    return true;
  }

  remove(uid) {
    const i = this.state.yard.indexOf(uid);
    if (i >= 0) this.state.yard.splice(i, 1);
    return i >= 0;
  }

  /** Auto-fill empty slots with the strongest unplaced cards. */
  autoFill() {
    const ranked = this.state.cards
      .filter((c) => !this.isPlaced(c.uid))
      .sort((a, b) => this.cardValue(b) - this.cardValue(a));
    for (const card of ranked) {
      if (this.slotsFull()) break;
      this.place(card.uid);
    }
  }

  cardValue(card) {
    const species = CREATURE_BY_ID[card.speciesId];
    if (!species) return 0;
    const mut = MUTATION_BY_ID[card.mutation] || MUTATION_BY_ID.normal;
    return species.income * mut.mult;
  }

  /** gunpowder per second from everything standing in the yard. */
  incomePerSecond(incomeMultiplier = 1) {
    let sum = 0;
    for (const uid of this.state.yard) {
      const card = this.cardById(uid);
      if (card) sum += this.cardValue(card);
    }
    return sum * incomeMultiplier;
  }

  sellPrice(card) {
    const species = CREATURE_BY_ID[card.speciesId];
    if (!species) return 0;
    const mut = MUTATION_BY_ID[card.mutation] || MUTATION_BY_ID.normal;
    const base = (species.income * 28 + 18) * mut.mult;
    return Math.max(5, Math.round(base));
  }
}
