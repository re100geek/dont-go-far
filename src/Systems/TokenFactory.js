// Oversized Roblox "noob" board token: classic R6 blocks, gold trim, cyan
// ground ring and a tall light beam so the piece is readable from any angle.

import * as THREE from '../../vendor/three.module.js';
import { glowSprite } from '../Utils/Textures.js';
import { bakeGroup } from '../Utils/MergeGeometry.js';

export function createBoardToken(yellow = '#ffd21f', cyan = '#2ee6ff') {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const lambert = (color, emissive = null, intensity = 0) => {
    const m = new THREE.MeshLambertMaterial({ color });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = intensity;
    }
    return m;
  };
  const glowMat = (color, opacity) => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const skin = lambert(yellow);
  const shirt = lambert('#2f6bff');
  const pants = lambert('#3ecf4d');
  const gold = lambert('#ffcf2e', '#ff9d00', 0.45);
  const capMat = lambert('#ff3b4e');
  const shoe = lambert('#f7f7ff');
  const eye = lambert('#20203a');
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (mat, geo, pos, size, parent = body) => {
    const mesh = new THREE.Mesh(geo || box, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (size) mesh.scale.set(size[0], size[1], size[2]);
    parent.add(mesh);
    return mesh;
  };

  // legs + shoes (classic R6: one box each, no knees)
  for (const sx of [-1, 1]) {
    add(pants, box, [sx * 0.38, 0.78, 0], [0.64, 1.34, 0.66]);
    add(shoe, box, [sx * 0.38, 0.16, 0.06], [0.68, 0.28, 0.8]);
  }

  // torso, belt and shoulder trim
  add(shirt, box, [0, 2.02, 0], [1.48, 1.34, 0.78]);
  add(gold, box, [0, 1.36, 0], [1.52, 0.12, 0.82]);
  add(gold, box, [0, 2.66, 0], [1.5, 0.1, 0.8]);
  add(capMat, box, [0, 2.05, 0.41], [0.5, 0.5, 0.06]);
  add(gold, box, [0, 2.05, 0.45], [0.22, 0.22, 0.06]);

  // arms + hands, angled out so the silhouette reads
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.99, 2.66, 0);
    arm.rotation.z = sx * 0.1;
    body.add(arm);
    add(shirt, box, [0, -0.62, 0], [0.44, 1.22, 0.46], arm);
    add(skin, box, [0, -1.34, 0], [0.46, 0.32, 0.48], arm);
    add(gold, box, [0, -0.06, 0], [0.52, 0.16, 0.52], arm);
  }

  // head (yellow, big smile, Roblox face) + cap
  const head = new THREE.Group();
  head.position.set(0, 3.48, 0);
  body.add(head);
  add(skin, box, [0, 0, 0], [1.14, 1.1, 1.08], head);
  add(eye, box, [0.26, 0.14, 0.556], [0.2, 0.3, 0.06], head);
  add(eye, box, [-0.26, 0.14, 0.556], [0.2, 0.3, 0.06], head);
  add(eye, box, [0, -0.2, 0.556], [0.42, 0.12, 0.06], head);
  add(capMat, box, [0, 0.62, 0], [0.98, 0.26, 0.94], head);
  add(capMat, box, [0, 0.44, 0.42], [0.92, 0.1, 0.62], head);
  add(gold, box, [0, 0.52, 0], [1.02, 0.08, 0.98], head);
  // studs on the cap crown
  const studGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    add(capMat, studGeo, [Math.cos(a) * 0.28, 0.78, Math.sin(a) * 0.28], null, head);
  }
  // gold crown spikes on the cap
  const spikeGeo = new THREE.ConeGeometry(0.13, 0.34, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(gold, spikeGeo, [Math.cos(a) * 0.44, 0.86, Math.sin(a) * 0.44], null, head);
  }

  // jet pack with a glowing vent
  add(shirt, box, [0, 2.1, -0.56], [0.86, 1.0, 0.44]);
  add(cyan ? lambert(cyan, cyan, 1.2) : gold, box, [0, 1.86, -0.8], [0.4, 0.18, 0.08]);
  add(gold, box, [0, 2.66, -0.56], [0.9, 0.12, 0.46]);

  // star above the head so the piece is findable even behind the beam
  const star = glowSprite('#fff0a8', 1.9, 0.85);
  star.position.set(0, 4.9, 0.1);
  group.add(star);

  // ground ring + tall beam
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.86, 40), glowMat(cyan, 0.78));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.2, 40), glowMat('#ffffff', 0.3));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.02;
  group.add(ring2);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.72, 22, 14, 1, true),
    glowMat(cyan, 0.1),
  );
  beam.position.y = 11.2;
  group.add(beam);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 28), glowMat(cyan, 0.14));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  group.add(disc);

  function update(t, moving) {
    const bob = 0.16 + Math.sin(t * 3.1) * 0.16;
    body.position.y = bob;
    body.rotation.z = Math.sin(t * 1.7) * 0.05;
    ring.scale.setScalar(1 + Math.sin(t * 4.5) * 0.09);
    ring2.scale.setScalar(1 + Math.sin(t * 4.5 + 1.2) * 0.06);
    ring.rotation.z -= 0.012;
    ring2.rotation.z += 0.008;
    beam.material.opacity = 0.12 + Math.sin(t * 3.6) * 0.045;
    star.material.opacity = 0.6 + Math.sin(t * 5) * 0.25;
    star.position.y = 4.9 + Math.sin(t * 2.4) * 0.1;
    if (moving) {
      body.position.y += Math.abs(Math.sin(t * 15)) * 0.34;
      body.rotation.y = (t * 6) % (Math.PI * 2);
      const sy = 1 + Math.abs(Math.sin(t * 15)) * 0.07;
      body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    } else {
      body.rotation.y = Math.sin(t * 0.9) * 0.25;
      body.scale.set(1, 1, 1);
    }
  }

  bakeGroup(body);
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.scale.setScalar(1.35);
  return { group, ring, beam, body, star, update };
}
