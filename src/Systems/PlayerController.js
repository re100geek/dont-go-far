// Blocky R6 avatar: chunky Roblox proportions, a studded cap and a bright
// ground ring. Movement is camera-relative with a simple limb-swing run cycle.

import * as THREE from '../../vendor/three.module.js';
import { bakeGroup } from '../Utils/MergeGeometry.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const STUD = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8);

export class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.limbs = {};
    this.time = 0;
    this.speed = 0;
    this.baseY = 1.32;
    this.build();
    scene.add(this.group);
  }

  build() {
    const skin = new THREE.MeshLambertMaterial({ color: '#ffd2a1' });
    const shirt = new THREE.MeshLambertMaterial({ color: '#ff8a2b' });
    const shirtDark = new THREE.MeshLambertMaterial({ color: '#e06a10' });
    const pants = new THREE.MeshLambertMaterial({ color: '#27395f' });
    const shoe = new THREE.MeshLambertMaterial({ color: '#f4f7ff' });
    const cap = new THREE.MeshLambertMaterial({ color: '#2ee6ff', emissive: '#00b8dd', emissiveIntensity: 0.25 });
    const capDark = new THREE.MeshLambertMaterial({ color: '#12b6d8' });
    const eye = new THREE.MeshLambertMaterial({ color: '#20203a' });
    const gold = new THREE.MeshLambertMaterial({ color: '#ffd23f', emissive: '#ff9d00', emissiveIntensity: 0.3 });

    const part = (mat, parent, pos, scale) => {
      const mesh = new THREE.Mesh(BOX, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      parent.add(mesh);
      return mesh;
    };

    // torso, head, face and cap are static: bake them into one mesh
    const core = new THREE.Group();
    this.group.add(core);

    part(shirt, core, [0, 2.08, 0], [1.52, 1.42, 0.82]);
    part(shirtDark, core, [0, 1.44, 0], [1.56, 0.16, 0.88]);
    part(gold, core, [0, 1.44, 0.46], [0.3, 0.24, 0.06]);
    part(shirtDark, core, [0, 2.72, 0], [1.58, 0.12, 0.86]);

    part(skin, core, [0, 3.48, 0], [1.22, 1.14, 1.12]);
    part(eye, core, [0.26, 3.56, 0.57], [0.17, 0.26, 0.06]);
    part(eye, core, [-0.26, 3.56, 0.57], [0.17, 0.26, 0.06]);
    part(eye, core, [0, 3.24, 0.57], [0.36, 0.1, 0.06]);
    part(capDark, core, [0, 3.98, 0.1], [1.28, 0.22, 1.2]);
    part(cap, core, [0, 4.2, 0], [1.28, 0.46, 1.16]);
    part(capDark, core, [0, 4.02, 0.62], [1.22, 0.14, 0.62]);
    part(gold, core, [0, 3.95, 0], [1.32, 0.08, 1.2]);
    for (let i = 0; i < 3; i++) {
      const stud = new THREE.Mesh(STUD, capDark);
      const a = (i / 3) * Math.PI * 2 + 0.6;
      stud.position.set(Math.cos(a) * 0.32, 4.45, Math.sin(a) * 0.32);
      core.add(stud);
    }
    for (const sx of [-1, 1]) {
      const stud = new THREE.Mesh(STUD, gold);
      stud.position.set(sx * 0.55, 2.84, 0);
      core.add(stud);
    }
    bakeGroup(core);

    const makeArm = (sx) => {
      const arm = new THREE.Group();
      arm.position.set(sx * 1.0, 2.74, 0);
      arm.rotation.z = sx * 0.06;
      part(shirt, arm, [0, -0.62, 0], [0.46, 1.26, 0.48]);
      part(shirtDark, arm, [0, -1.24, 0], [0.48, 0.14, 0.5]);
      part(skin, arm, [0, -1.42, 0], [0.48, 0.32, 0.5]);
      bakeGroup(arm);
      this.group.add(arm);
      return arm;
    };
    const makeLeg = (sx) => {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.42, 1.38, 0);
      part(pants, leg, [0, -0.66, 0], [0.62, 1.32, 0.64]);
      part(shoe, leg, [0, -1.42, 0.08], [0.66, 0.3, 0.8]);
      bakeGroup(leg);
      this.group.add(leg);
      return leg;
    };

    const armL = makeArm(-1);
    const armR = makeArm(1);
    const legL = makeLeg(-1);
    const legR = makeLeg(1);
    this.limbs = { armL, armR, legL, legR };

    // glowing feet ring so the avatar never gets lost on dark biomes
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.95, 28),
      new THREE.MeshBasicMaterial({
        color: '#2ee6ff',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.group.add(ring);
    this.marker = ring;

    this.group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.group.position.set(0, 1.3, 12);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  setY(y) {
    this.baseY = y;
    this.group.position.y = y;
    this.marker.visible = y < 0.2;
  }

  get position() {
    return this.group.position;
  }

  teleport(x, y, z) {
    this.baseY = y;
    this.group.position.set(x, y, z);
    this.marker.visible = y < 0.2;
  }

  /** move: {x, z} unit vector in camera space; yaw: camera azimuth. */
  update(dt, move, yaw, speed) {
    this.time += dt;
    let vx = 0;
    let vz = 0;
    if (move && (move.x || move.z)) {
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      // camera sits at (sin yaw, cos yaw) * d behind the player, so its forward is (-sin, -cos).
      vx = move.x * cos + move.z * sin;
      vz = -move.x * sin + move.z * cos;
      const len = Math.hypot(vx, vz) || 1;
      vx /= len;
      vz /= len;
      this.group.position.x += vx * speed * dt;
      this.group.position.z += vz * speed * dt;
      const targetYaw = Math.atan2(vx, vz);
      let diff = targetYaw - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 14);
      this.speed = Math.min(1, this.speed + dt * 6);
    } else {
      this.speed = Math.max(0, this.speed - dt * 8);
    }

    const swing = Math.sin(this.time * 12) * 0.7 * this.speed;
    this.limbs.legL.rotation.x = swing;
    this.limbs.legR.rotation.x = -swing;
    this.limbs.armL.rotation.x = -swing * 0.8;
    this.limbs.armR.rotation.x = swing * 0.8;
    this.group.position.y = this.baseY + Math.abs(Math.sin(this.time * 12)) * 0.06 * this.speed;
    const radius = Math.hypot(this.group.position.x, this.group.position.z);
    if (radius > 250) {
      this.group.position.x *= 250 / radius;
      this.group.position.z *= 250 / radius;
    }
    if (this.marker.visible) {
      this.marker.rotation.z += dt * 1.5;
      this.marker.scale.setScalar(1 + Math.sin(this.time * 3) * 0.06);
    }
  }
}
