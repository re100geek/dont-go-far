// Single-currency economy: gunpowder is ammo, gacha cost and board currency.

export class EconomySystem {
  constructor(state) {
    this.state = state;
    if (typeof state.frac !== 'number') state.frac = 0;
  }

  get gunpowder() {
    return this.state.gunpowder;
  }

  add(amount) {
    if (!Number.isFinite(amount)) return this.state.gunpowder;
    this.state.gunpowder = Math.max(0, this.state.gunpowder + amount);
    return this.state.gunpowder;
  }

  canAfford(amount) {
    return this.state.gunpowder >= amount;
  }

  spend(amount) {
    if (amount < 0 || !this.canAfford(amount)) return false;
    this.state.gunpowder -= amount;
    return true;
  }

  /** Passive yard income, accumulated with a fractional remainder. */
  tick(dt, perSecond) {
    if (!perSecond || perSecond <= 0) return 0;
    this.state.frac += perSecond * dt;
    const whole = Math.floor(this.state.frac);
    if (whole >= 1) {
      this.state.frac -= whole;
      this.state.gunpowder += whole;
      return whole;
    }
    return 0;
  }
}
