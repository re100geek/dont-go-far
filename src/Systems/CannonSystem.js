// Cannon: timing gauge, range from the gauge, and the projectile arc.
// Math lives in CannonMath.js so the same numbers can be reused in Luau.

import * as THREE from '../../vendor/three.module.js';
import { CONFIG } from '../Config/GameConfig.js';
import {
  computeRange, gaugeSpeedFor, createGauge, judgeAccuracy, flightDuration, flightPosition, returnCost,
} from './CannonMath.js';

export { returnCost };

export class CannonSystem {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.gauge = null;
    this.gunpowder = 0;
    this.flight = null;
    this.recoil = 0;
    this.puffs = [];
    this.time = 0;
  }

  startAim(gunpowder) {
    this.gunpowder = gunpowder;
    this.gauge = createGauge({
      speed: gaugeSpeedFor(gunpowder),
      zoneStart: CONFIG.cannon.gaugeZoneStart,
      zoneEnd: CONFIG.cannon.gaugeZoneEnd,
    });
  }

  stopAim() {
    this.gauge = null;
  }

  get aiming() {
    return this.gauge !== null;
  }

  get gaugeValue() {
    return this.gauge ? this.gauge.value : 0;
  }

  /** Accuracy of the current gauge frame. */
  judge() {
    if (!this.gauge) return { tier: 'miss', mult: 0.55, label: 'MISS' };
    const zone = this.gauge.getZone();
    return judgeAccuracy(this.gauge.value, zone.start, zone.end);
  }

  rangeFor(gunpowder, accuracyMult, firepowerBonus = 0) {
    return computeRange({ gunpowder, powerMult: accuracyMult, firepowerBonus });
  }

  /** Launches mesh along the arc; onDone fires when it lands. */
  launch({ mesh, from, to, range, spin = true, onDone }) {
    const duration = flightDuration(range);
    this.flight = {
      mesh,
      from: { x: from.x, z: from.z },
      to: { x: to.x, z: to.z },
      height: 12 + range * 0.18,
      t: 0,
      duration,
      spin,
      onDone,
      yaw: Math.atan2(to.x - from.x, to.z - from.z),
    };
    this.recoil = 1;
    this.spawnPuff(from);
    mesh.position.set(from.x, 3, from.z);
    return duration;
  }

  get flying() {
    return this.flight !== null;
  }

  spawnPuff(pos) {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffe9c0', transparent: true, opacity: 0.85 });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
    puff.position.set(pos.x, 3.2, pos.z);
    this.scene.add(puff);
    this.puffs.push({ mesh: puff, age: 0 });
  }

  update(dt) {
    this.time += dt;
    if (this.gauge) this.gauge.update(dt);

    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 2.6);
      const k = Math.sin(this.recoil * Math.PI) * 0.9;
      this.world.barrelPivot.position.z = 0.2 + k;
      this.world.barrelPivot.rotation.x = -0.32 - k * 0.12;
    }

    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const s = 1 + p.age * 9;
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = Math.max(0, 0.85 - p.age * 2.2);
      p.mesh.position.y += dt * 1.6;
      if (p.age > 0.55) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.puffs.splice(i, 1);
      }
    }

    if (!this.flight) return;
    const f = this.flight;
    f.t += dt / f.duration;
    const t = Math.min(1, f.t);
    const pos = flightPosition({ from: f.from, to: f.to, t, height: f.height });
    f.mesh.position.set(pos.x, pos.y + 1.5, pos.z);
    if (f.spin) {
      f.mesh.rotation.x += dt * 7;
      f.mesh.rotation.z += dt * 5;
    } else {
      f.mesh.rotation.y = f.yaw;
      f.mesh.rotation.x = -0.5 + t * 1.4;
    }
    if (f.t >= 1) {
      this.flight = null;
      f.mesh.rotation.x = 0;
      f.mesh.rotation.z = 0;
      if (f.onDone) f.onDone();
    }
  }
}
