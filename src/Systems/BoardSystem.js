// Board view glue: the oversized token hops the ring while the camera reads the
// whole board; the active tile keeps a neon frame so the piece is easy to track.

import * as THREE from '../../vendor/three.module.js';
import { BoardGame } from './BoardGame.js';
import { BOARD_TILES } from '../Config/BoardCells.js';
import { CONFIG } from '../Config/GameConfig.js';

const HOP_TIME = 0.19;
const TILE_TOP = 2.05;
const HOP_HEIGHT = 1.7;

export class BoardSystem {
  constructor(world) {
    this.world = world;
    this.game = new BoardGame({ cells: BOARD_TILES });
    this.token = world.boardToken;
    this.api = world.boardTokenApi;
    this.highlight = world.tileHighlight;
    this.hops = [];
    this.onLanding = null;
    this.busy = false;
    this.t = 0;
    this.lastDice = 0;
    this.syncInstant(this.game.position);
  }

  tileWorldPos(index) {
    const { col, row } = this.world.tileCell(index);
    const half = 3;
    const step = CONFIG.board.tileSize;
    return new THREE.Vector3(
      CONFIG.board.center.x + (col - half) * step,
      TILE_TOP,
      CONFIG.board.center.z + (row - half) * step,
    );
  }

  syncInstant(index) {
    const p = this.tileWorldPos(index);
    this.token.position.set(p.x, p.y, p.z);
    this.token.rotation.y = 0;
    this.placeHighlight(index);
  }

  placeHighlight(index) {
    if (!this.highlight) return;
    const p = this.tileWorldPos(index);
    this.highlight.position.set(p.x, TILE_TOP + 0.06, p.z);
    this.highlight.visible = true;
    this.highlightPos = p;
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
    const n = BOARD_TILES.length;
    this.hops = [];
    let from = ((path[0] - 1) % n + n) % n;
    for (const to of path) {
      this.hops.push({ from, to, t: 0 });
      from = to;
    }
    if (this.highlight) this.highlight.visible = true;
    return dice;
  }

  update(dt) {
    this.t += dt;
    if (!this.token) return;

    if (this.hops.length) {
      const hop = this.hops[0];
      hop.t += dt / HOP_TIME;
      const t = Math.min(1, hop.t);
      const a = this.tileWorldPos(hop.from);
      const b = this.tileWorldPos(hop.to);
      this.token.position.x = a.x + (b.x - a.x) * t;
      this.token.position.z = a.z + (b.z - a.z) * t;
      this.token.position.y = TILE_TOP + Math.sin(t * Math.PI) * HOP_HEIGHT;
      this.token.rotation.y += dt * 10;
      if (hop.t >= 1) {
        this.hops.shift();
        this.syncInstant(hop.to);
        this.token.rotation.y = 0;
        if (!this.hops.length) {
          this.busy = false;
          if (this.onLanding) this.onLanding(this.game.landingCell());
        }
      }
    }

    if (this.api) this.api.update(this.t, this.hops.length > 0 && this.busy);
    if (this.highlight) {
      const pulse = 1 + Math.sin(this.t * 4.4) * 0.045;
      this.highlight.scale.set(pulse, 1, pulse);
    }
  }
}
