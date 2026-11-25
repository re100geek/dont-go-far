// Bakes many coloured parts into one BufferGeometry so a creature (or a whole
// prop field) costs a single draw call on a phone.

import * as THREE from '../../vendor/three.module.js';

/**
 * parts: [{ geo: BufferGeometry (already in local space), color: THREE.Color }]
 */
export function mergeParts(parts) {
  let vertexTotal = 0;
  let indexTotal = 0;
  for (const p of parts) {
    const g = p.geo;
    vertexTotal += g.attributes.position.count;
    indexTotal += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vertexTotal * 3);
  const normals = new Float32Array(vertexTotal * 3);
  const colors = new Float32Array(vertexTotal * 3);
  const indices = vertexTotal > 65535 ? new Uint32Array(indexTotal) : new Uint16Array(indexTotal);

  let vo = 0;
  let io = 0;
  for (const p of parts) {
    const g = p.geo;
    const gp = g.attributes.position;
    const gn = g.attributes.normal;
    const c = p.color;
    for (let i = 0; i < gp.count; i++) {
      positions[(vo + i) * 3] = gp.getX(i);
      positions[(vo + i) * 3 + 1] = gp.getY(i);
      positions[(vo + i) * 3 + 2] = gp.getZ(i);
      normals[(vo + i) * 3] = gn ? gn.getX(i) : 0;
      normals[(vo + i) * 3 + 1] = gn ? gn.getY(i) : 1;
      normals[(vo + i) * 3 + 2] = gn ? gn.getZ(i) : 0;
      colors[(vo + i) * 3] = c.r;
      colors[(vo + i) * 3 + 1] = c.g;
      colors[(vo + i) * 3 + 2] = c.b;
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < gp.count; i++) indices[io + i] = vo + i;
      io += gp.count;
    }
    vo += gp.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}

/**
 * Collapses a Group of coloured meshes into one mesh (local space preserved).
 * Emissive parts are folded in as brighter vertex colours.
 */
export function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const parts = [];
  const tmp = new THREE.Matrix4();
  const color = new THREE.Color();
  group.traverse((o) => {
    if (!o.isMesh || !o.material || !o.geometry) return;
    const geo = o.geometry.clone();
    tmp.multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(tmp);
    color.copy(o.material.color || new THREE.Color('#ffffff'));
    if (o.material.emissive && o.material.emissiveIntensity > 0) {
      color.lerp(o.material.emissive, Math.min(1, o.material.emissiveIntensity * 0.55));
    }
    parts.push({ geo, color: color.clone() });
  });
  if (!parts.length) return group;
  const merged = mergeParts(parts);
  for (const p of parts) p.geo.dispose();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(merged, material);
  // keep the group's own transform, drop the children
  while (group.children.length) group.remove(group.children[0]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return group;
}
