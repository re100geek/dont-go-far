// Pets: egg gacha rewards from the board, equip up to 3 for stat buffs.

import { CONFIG, RARITY } from '../Config/GameConfig.js';
import { PETS, PET_BY_ID, EGG_WEIGHTS } from '../Config/Pets.js';

export class PetSystem {
  constructor(state) {
    this.state = state;
    if (!state.pets) state.pets = {};
    if (!Array.isArray(state.equipped)) state.equipped = [];
  }

  owned() {
    return Object.keys(this.state.pets).filter((id) => this.state.pets[id] > 0);
  }

  count(petId) {
    return this.state.pets[petId] || 0;
  }

  isEquipped(petId) {
    return this.state.equipped.includes(petId);
  }

  equip(petId) {
    if (!this.count(petId) || this.isEquipped(petId)) return false;
    if (this.state.equipped.length >= CONFIG.pets.equipSlots) {
      this.state.equipped.shift();
    }
    this.state.equipped.push(petId);
    return true;
  }

  unequip(petId) {
    const i = this.state.equipped.indexOf(petId);
    if (i < 0) return false;
    this.state.equipped.splice(i, 1);
    return true;
  }

  /** Random pet for an egg. Weighted rarity first, then uniform inside the tier. */
  rollEgg(rng = Math.random) {
    const total = Object.values(EGG_WEIGHTS).reduce((s, w) => s + w, 0);
    let r = rng() * total;
    let tier = 'common';
    for (const [rarity, weight] of Object.entries(EGG_WEIGHTS)) {
      if (r < weight) { tier = rarity; break; }
      r -= weight;
    }
    const pool = PETS.filter((p) => p.rarity === tier);
    const list = pool.length ? pool : PETS.filter((p) => p.rarity === 'common');
    return list[Math.floor(rng() * list.length) % list.length];
  }

  /** Adds a pet; duplicates pay out gunpowder instead. */
  grant(pet, economy) {
    const id = pet.id;
    if (this.count(id) > 0) {
      economy.add(CONFIG.pets.duplicateGunpowder);
      this.state.pets[id] += 1;
      return { duplicate: true, pet, gunpowder: CONFIG.pets.duplicateGunpowder };
    }
    this.state.pets[id] = 1;
    if (this.state.equipped.length < CONFIG.pets.equipSlots) this.state.equipped.push(id);
    return { duplicate: false, pet, gunpowder: 0 };
  }

  /** Sum of equipped pets for one stat. */
  bonus(stat) {
    let sum = 0;
    for (const id of this.state.equipped) {
      const pet = PET_BY_ID[id];
      if (pet && pet.stat === stat) sum += pet.value;
    }
    return sum;
  }

  summary() {
    return {
      firepower: this.bonus('firepower'),
      capture: this.bonus('capture'),
      rare: this.bonus('rare'),
      speed: this.bonus('speed'),
      hp: this.bonus('hp'),
      resist: this.bonus('resist'),
      income: this.bonus('income'),
    };
  }

  rarityColor(petId) {
    const pet = PET_BY_ID[petId];
    return pet ? (RARITY[pet.rarity]?.colorHex || '#fff') : '#fff';
  }
}
