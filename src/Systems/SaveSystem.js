// Persistence layer (browser: localStorage / Roblox: DataStoreService).

const EMPTY = {
  version: 1,
  gunpowder: 0,
  cards: [],
  yard: [],
  pets: {},
  equipped: [],
  buffs: 0,
  pendingMutation: 0,
  boardPos: 0,
  boardLaps: 0,
  stats: { launches: 0, selfLaunches: 0, captures: 0, bestDistance: 0, boardRolls: 0, playSeconds: 0 },
  seen: {},
  savedAt: 0,
};

export class SaveSystem {
  constructor(key) {
    this.key = key;
    this.available = true;
    try {
      localStorage.setItem('__dof_probe', '1');
      localStorage.removeItem('__dof_probe');
    } catch (err) {
      this.available = false;
    }
  }

  load() {
    if (!this.available) return structuredClone(EMPTY);
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return structuredClone(EMPTY);
      const data = JSON.parse(raw);
      return this.migrate(data);
    } catch (err) {
      console.warn('[save] load failed, starting fresh', err);
      return structuredClone(EMPTY);
    }
  }

  save(state) {
    if (!this.available) return false;
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('[save] write failed', err);
      return false;
    }
  }

  clear() {
    if (!this.available) return;
    localStorage.removeItem(this.key);
  }

  migrate(data) {
    const base = structuredClone(EMPTY);
    const out = { ...base, ...data };
    out.stats = { ...base.stats, ...(data.stats || {}) };
    out.seen = data.seen || {};
    out.pets = data.pets || {};
    out.equipped = Array.isArray(data.equipped) ? data.equipped : [];
    out.cards = Array.isArray(data.cards) ? data.cards : [];
    out.yard = Array.isArray(data.yard) ? data.yard : [];
    out.version = base.version;
    return out;
  }
}

export { EMPTY as EMPTY_SAVE };
