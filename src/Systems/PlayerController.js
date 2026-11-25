// Blocky avatar with a simple limb-swing run cycle. Movement is camera-relative.

import * as THREE from '../../vendor/three.module.js';

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
    const skin = new THREE.MeshLambertMaterial({ color: '#ffd2a1', flatShading: true });
    const shirt = new THREE.MeshLambertMaterial({ color: '#4a7bd6', flatShading: true });
    const pants = new THREE.MeshLambertMaterial({ color: '#2e3b57', flatShading: true });
    const boot = new THREE.MeshLambertMaterial({ color: '#3a2a1c' });
    const hat = new THREE.MeshLambertMaterial({ color: '#ff5d5d', flatShading: true });
    const eye = new THREE.MeshLambertMaterial({ color: '#1b1b28' });
    const box = new THREE.BoxGeometry(1, 1, 1);

    const torso = new THREE.Mesh(box, shirt);
    torso.scale.set(1.5, 1.5, 0.85);
    torso.position.y = 2.1;
    this.group.add(torso);

    const head = new THREE.Mesh(box, skin);
    head.scale.set(1.15, 1.15, 1.05);
    head.position.y = 3.35;
    this.group.add(head);

    const cap = new THREE.Mesh(box, hat);
    cap.scale.set(1.3, 0.3, 1.2);
    cap.position.y = 3.95;
    this.group.add(cap);
    const brim = new THREE.Mesh(box, hat);
    brim.scale.set(1.2, 0.16, 0.55);
    brim.position.set(0, 3.85, 0.72);
    this.group.add(brim);

    for (const sx of [-1, 1]) {
      const dot = new THREE.Mesh(box, eye);
      dot.scale.set(0.16, 0.2, 0.1);
      dot.position.set(sx * 0.24, 3.42, 0.55);
      this.group.add(dot);
    }

    const armL = new THREE.Group();
    armL.position.set(-0.95, 2.75, 0);
    const armLm = new THREE.Mesh(box, shirt);
    armLm.scale.set(0.42, 1.1, 0.42);
    armLm.position.y = -0.55;
    const handL = new THREE.Mesh(box, skin);
    handL.scale.set(0.44, 0.36, 0.44);
    handL.position.y = -1.15;
    armL.add(armLm, handL);
    this.group.add(armL);

    const armR = new THREE.Group();
    armR.position.set(0.95, 2.75, 0);
    const armRm = new THREE.Mesh(box, shirt);
    armRm.scale.set(0.42, 1.1, 0.42);
    armRm.position.y = -0.55;
    const handR = new THREE.Mesh(box, skin);
    handR.scale.set(0.44, 0.36, 0.44);
    handR.position.y = -1.15;
    armR.add(armRm, handR);
    this.group.add(armR);

    const legL = new THREE.Group();
    legL.position.set(-0.4, 1.4, 0);
    const legLm = new THREE.Mesh(box, pants);
    legLm.scale.set(0.5, 1.2, 0.5);
    legLm.position.y = -0.6;
    const footL = new THREE.Mesh(box, boot);
    footL.scale.set(0.52, 0.3, 0.7);
    footL.position.set(0, -1.28, 0.1);
    legL.add(legLm, footL);
    this.group.add(legL);

    const legR = new THREE.Group();
    legR.position.set(0.4, 1.4, 0);
    const legRm = new THREE.Mesh(box, pants);
    legRm.scale.set(0.5, 1.2, 0.5);
    legRm.position.y = -0.6;
    const footR = new THREE.Mesh(box, boot);
    footR.scale.set(0.52, 0.3, 0.7);
    footR.position.set(0, -1.28, 0.1);
    legR.add(legRm, footR);
    this.group.add(legR);

    this.limbs = { armL, armR, legL, legR };

    // ground marker so the avatar never gets lost on dark biomes
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.0, 24),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    this.group.add(ring);
    this.marker = ring;
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
      // Joystick +z is "toward the camera", so up (move.z = -1) walks away from it.
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
    this.marker.rotation.z += dt * 1.5;
  }
}
