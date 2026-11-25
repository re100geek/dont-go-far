// Board view glue: token animation over the 3D ring + landing resolution.

import * as THREE from '../../vendor/three.module.js';
import { BoardGame } from './BoardGame.js';
import { BOARD_TILES } from '../Config/BoardCells.js';
import { CONFIG } from '../Config/GameConfig.js';

const HOP_TIME = 0.17;

export class BoardSystem {
  constructor(world) {
    this.world = world;
    this.game = new BoardGame({ cells: BOARD_TILES });
    this.token = world.boardToken;
    this.hops = [];
    this.onLanding = null;
    this.busy = false;
    this.bobT = 0;
    this.lastDice = 0;
    this.syncInstant(this.game.position);
  }

  tileWorldPos(index) {
    const { col, row } = this.world.tileCell(index);
    const half = 3;
    const step = CONFIG.board.tileSize;
    return new THREE.Vector3(
      CONFIG.board.center.x + (col - half) * step,
      2.05,
      CONFIG.board.center.z + (row - half) * step,
    );
  }

  syncInstant(index) {
    const p = this.tileWorldPos(index);
    this.token.position.set(p.x, p.y, p.z);
    this.token.rotation.y = 0;
  }

  get position() {
    return this.game.position;
  }

  setPosition(index) {
    this.game.jumpTo(index);
    this.syncInstant(this.game.position);
  }

  rollDice() {
    if (this.busy) return 0;
    this.busy = true;
    const dice = this.game.roll();
    this.lastDice = dice;
    const path = this.game.move(dice);
    let from = this.game.position === path[path.length - 1] ? this.game.position : this.game.position;
    // rebuild the walk: path holds every index passed through
    let prev = null;
    // previous position = path[0] - 1 (with wrap)
    const n = BOARD_TILES.length;
    prev = ((path[0] - 1) % n + n) % n;
    from = prev;
    this.hops = path.map((idx) => ({ from, to: idx, t: 0 })).map((hop, i, arr) => {
      const fromIdx = i === 0 ? prev : arr[i - 1].to;
      return { from: fromIdx, to: hop.to, t: 0 };
    });
    return dice;
  }

  update(dt) {
    this.bobT += dt;
    if (!this.token) return;
    if (this.hops.length) {
      const hop = this.hops[0];
      hop.t += dt / HOP_TIME;
      const t = Math.min(1, hop.t);
      const a = this.tileWorldPos(hop.from);
      const b = this.tileWorldPos(hop.to);
      this.token.position.x = a.x + (b.x - a.x) * t;
      this.token.position.z = a.z + (b.z - a.z) * t;
      this.token.position.y = b.y + Math.sin(t * Math.PI) * 1.6;
      this.token.rotation.y += dt * 8;
      if (hop.t >= 1) {
        this.hops.shift();
        this.syncInstant(hop.to);
        if (!this.hops.length) {
          this.busy = false;
          this.token.rotation.y = 0;
          if (this.onLanding) this.onLanding(this.game.landingCell());
        }
      }
    } else {
      this.token.position.y = 2.05 + Math.sin(this.bobT * 2.4) * 0.12;
      this.token.rotation.y = Math.sin(this.bobT * 0.8) * 0.3;
    }
  }
}
