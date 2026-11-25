// Wild creatures: streaming spawner around the player, light AI, capture FX.

import * as THREE from '../../vendor/three.module.js';
import { biomeAt } from '../Config/Biomes.js';
import { CREATURES } from '../Config/Creatures.js';

const TARGET_COUNT = 50;
const DESPAWN_DIST = 110;

export class WildSystem {
  constructor(scene, factory) {
    this.scene = scene;
    this.factory = factory;
    this.creatures = [];
    this.tamer = null; // set by game: pickSpecies(biome, pool)
    this.rng = Math.random;
    this.time = 0;
    this.rejectRadius = 26;
    this.captureFx = [];
    this.targetRing = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.25, 26),
      new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.visible = false;
    scene.add(this.targetRing);
  }

  speciesForBiome(biome) {
    return CREATURES.filter((c) => c.biomes.includes(biome.id));
  }

  spawn(count, center) {
    for (let i = 0; i < count; i++) this.spawnOne(center);
  }

  /** Populate the landing patch before an auto shot resolves there. */
  populateAround(center, count = 10, minR = 4, maxR = 22) {
    let added = 0;
    for (let i = 0; i < count * 3 && added < count; i++) {
      if (this.spawnOne(center, minR, maxR)) added += 1;
    }
    return added;
  }

  spawnOne(center, minR = 6, maxR = 76) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = this.rng() * Math.PI * 2;
      const dist = minR + this.rng() * (maxR - minR);
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;
      const fromBase = Math.hypot(x, z);
      if (fromBase < this.rejectRadius || fromBase > 252) continue;
      const biome = biomeAt(fromBase);
      const pool = this.speciesForBiome(biome);
      if (!pool.length) continue;
      const species = this.tamer
        ? this.tamer.pickSpecies(biome, pool)
        : pool[Math.floor(this.rng() * pool.length)];
      this.add(species, x, z);
      return true;
    }
    return false;
  }

  add(species, x, z) {
    const group = this.factory.build(species, 'normal');
    group.position.set(x, 0, z);
    group.rotation.y = this.rng() * Math.PI * 2;
    this.scene.add(group);
    const creature = {
      group,
      species,
      home: new THREE.Vector3(x, 0, z),
      pos: new THREE.Vector3(x, 0, z),
      phase: this.rng() * Math.PI * 2,
      speed: 1.6 + this.rng() * 1.4,
      state: 'idle',
      wander: this.rng() * Math.PI * 2,
      alive: true,
      captureT: 0,
    };
    group.userData.creature = creature;
    this.creatures.push(creature);
    return creature;
  }

  nearest(pos, radius) {
    let best = null;
    let bestD = radius;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const d = c.pos.distanceTo(pos);
      if (d <= bestD) { bestD = d; best = c; }
    }
    return best;
  }

  /** Capture animation, then removal. */
  capture(creature) {
    if (!creature || !creature.alive) return;
    creature.alive = false;
    creature.captureT = 0.001;
    this.captureFx.push(creature);
  }

  update(dt, playerPos, hostile, playerRadius = 0) {
    this.time += dt;
    for (const c of this.creatures) {
      if (c.alive) this.step(c, dt, playerPos, hostile, playerRadius);
    }
    // capture poofs
    for (let i = this.captureFx.length - 1; i >= 0; i--) {
      const c = this.captureFx[i];
      c.captureT += dt * 3;
      const t = Math.min(1, c.captureT);
      c.group.scale.setScalar((c.species.scale || 1) * (1 - t));
      c.group.position.y = t * 4;
      c.group.rotation.y += dt * 12;
      if (t >= 1) {
        this.scene.remove(c.group);
        this.captureFx.splice(i, 1);
      }
    }
    // cull far creatures, keep the stream flowing
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (!c.alive && !this.captureFx.includes(c)) {
        this.creatures.splice(i, 1);
        continue;
      }
      if (c.alive && c.pos.distanceTo(playerPos) > DESPAWN_DIST) {
        this.scene.remove(c.group);
        this.creatures.splice(i, 1);
      }
    }
    if (playerPos) {
      let missing = TARGET_COUNT - this.creatures.filter((c) => c.alive).length;
      let guard = 0;
      while (missing > 0 && guard < 3) {
        this.spawnOne(playerPos);
        missing--;
        guard++;
      }
    }
  }

  step(c, dt, playerPos, hostile, playerRadius) {
    const distToPlayer = c.pos.distanceTo(playerPos);
    const biome = biomeAt(c.pos.length());
    const aggro = hostile ? 6 + (biome.dangerPerSec || 1) * 2.5 : 0;

    if (hostile && c.state !== 'flee' && distToPlayer < aggro) c.state = 'chase';
    else if (c.state === 'chase' && (!hostile || distToPlayer > aggro * 1.8)) c.state = 'idle';

    if (c.state === 'chase' && distToPlayer > 2.4) {
      const dir = new THREE.Vector3().subVectors(playerPos, c.pos).setY(0).normalize();
      c.pos.addScaledVector(dir, c.speed * 1.35 * dt);
      c.group.rotation.y = Math.atan2(dir.x, dir.z);
    } else if (c.state === 'flee') {
      const dir = new THREE.Vector3().subVectors(c.pos, playerPos).setY(0).normalize();
      c.pos.addScaledVector(dir, c.speed * 2.2 * dt);
      c.group.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      c.wander += dt * 0.9;
      const target = new THREE.Vector3(
        c.home.x + Math.cos(c.wander) * 4,
        0,
        c.home.z + Math.sin(c.wander * 0.8) * 4,
      );
      const dir = new THREE.Vector3().subVectors(target, c.pos).setY(0);
      if (dir.length() > 0.6) {
        dir.normalize();
        c.pos.addScaledVector(dir, c.speed * 0.45 * dt);
        c.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    // keep them on the island
    const fromBase = c.pos.length();
    if (fromBase > 250) c.pos.multiplyScalar(250 / fromBase);
    if (fromBase < this.rejectRadius) c.pos.multiplyScalar(this.rejectRadius / fromBase);

    c.group.position.set(c.pos.x, 0, c.pos.z);
    const bob = Math.sin(this.time * 3 + c.phase) * 0.08;
    c.group.position.y = bob + (c.state === 'chase' ? Math.abs(Math.sin(this.time * 9 + c.phase)) * 0.35 : 0);
  }

  /** Pulsing ring under the creature the player can tame right now. */
  highlight(creature) {
    if (!creature || !creature.alive) {
      this.targetRing.visible = false;
      return;
    }
    this.targetRing.visible = true;
    this.targetRing.position.set(creature.pos.x, 0.08, creature.pos.z);
    const s = 1 + Math.sin(this.time * 5) * 0.12;
    this.targetRing.scale.setScalar((creature.species.scale || 1) * 1.15 * s);
  }

  clear() {
    for (const c of this.creatures) this.scene.remove(c.group);
    for (const c of this.captureFx) this.scene.remove(c.group);
    this.creatures = [];
    this.captureFx = [];
  }

  get size() {
    return this.creatures.length;
  }
}

