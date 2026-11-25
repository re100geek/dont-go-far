// Blocky creature models. One builder per archetype, plus per-species extras,
// so 20 species read as 20 silhouettes while sharing cheap geometry.
// Mirrors a Roblox ModelFactory: parts are anchored boxes, no textures.

import * as THREE from '../../vendor/three.module.js';
import { bakeGroup } from '../Utils/MergeGeometry.js';

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 10, 8),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
};

const EYE = '#1b1b28';

function palette(species, mutationId) {
  if (mutationId === 'gold') return { body: '#ffd24a', accent: '#c98a00', glow: '#fff2b0', mutated: true };
  if (mutationId === 'diamond') return { body: '#8ff4ff', accent: '#2fc2e8', glow: '#d9ffff', mutated: true };
  return { body: species.bodyHex, accent: species.accentHex, glow: null, mutated: false };
}

export function createCreatureFactory() {
  return new CreatureFactory();
}

class CreatureFactory {
  constructor() {
    this.materials = new Map();
  }

  mat(color, emissive = null, intensity = 0) {
    const key = `${color}|${emissive}|${intensity}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, flatShading: true });
      if (emissive) {
        m.emissive = new THREE.Color(emissive);
        m.emissiveIntensity = intensity;
      }
      this.materials.set(key, m);
    }
    return m;
  }

  part(geo, material, { pos = [0, 0, 0], size = [1, 1, 1], rot = [0, 0, 0] } = {}) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    return mesh;
  }

  box(material, pos, size, rot) {
    return this.part(G.box, material, { pos, size, rot });
  }

  /** Builds a full creature group (unscaled; caller applies species.scale). */
  build(species, mutationId = 'normal') {
    const pal = palette(species, mutationId);
    const body = this.mat(pal.body, pal.glow, pal.glow ? 0.45 : 0);
    const accent = this.mat(pal.accent, pal.glow, pal.glow ? 0.3 : 0);
    const dark = this.mat('#2a2a38');
    const eye = this.mat(EYE);
    const white = this.mat('#ffffff');
    const group = new THREE.Group();
    const ctx = { body, accent, dark, eye, white, group, pal, species };

    switch (species.archetype) {
      case 'bird': this.bird(ctx); break;
      case 'blob': this.blob(ctx); break;
      case 'humanoid': this.humanoid(ctx); break;
      case 'golem': this.golem(ctx); break;
      case 'dragon': this.dragon(ctx); break;
      case 'serpent': this.serpent(ctx); break;
      case 'unicorn': this.quadruped(ctx, true); break;
      case 'mimic': this.mimic(ctx); break;
      case 'quadruped':
      default: this.quadruped(ctx, false); break;
    }

    group.userData.headY = 1.2;
    // one draw call per creature: bake every coloured part into a single mesh
    bakeGroup(group);
    group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    const s = species.scale || 1;
    group.scale.setScalar(s);
    return group;
  }

  eyes(ctx, y, z, spread = 0.16, size = 0.1) {
    const g = ctx.group;
    g.add(this.box(ctx.eye, [spread, y, z], [size, size * 1.1, size * 0.5]));
    g.add(this.box(ctx.eye, [-spread, y, z], [size, size * 1.1, size * 0.5]));
  }

  quadruped(ctx, unicorn) {
    const { group, body, accent, dark } = ctx;
    const id = ctx.species.id;
    const longEar = id === 'rabbit';
    const bigTail = id === 'fox' || id === 'lynx' || unicorn;
    group.add(this.box(body, [0, 0.78, 0], [0.9, 0.72, 1.35]));
    group.add(this.box(body, [0, 0.95, 0.66], [0.62, 0.56, 0.56]));
    group.add(this.box(accent, [0, 0.82, 0.96], [0.34, 0.24, 0.22]));
    group.add(this.box(dark, [0, 0.74, 1.06], [0.16, 0.1, 0.06]));
    this.eyes(ctx, 1.02, 0.94, 0.16, 0.09);

    // studded back plate (Roblox plate detail)
    for (const sx of [-0.22, 0.22]) {
      group.add(this.part(G.cyl, body, { pos: [sx, 1.16, -0.3], size: [0.26, 0.16, 0.26] }));
    }
    // legs
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        group.add(this.box(dark, [sx * 0.28, 0.3, sz * 0.42], [0.2, 0.6, 0.2]));
        group.add(this.box(body, [sx * 0.28, 0.06, sz * 0.44], [0.22, 0.12, 0.24]));
      }
    }
    // ears / horns
    if (longEar) {
      group.add(this.box(body, [0.16, 1.42, 0.6], [0.14, 0.5, 0.1], [0.12, 0, 0.1]));
      group.add(this.box(body, [-0.16, 1.42, 0.6], [0.14, 0.5, 0.1], [0.12, 0, -0.1]));
      group.add(this.box(accent, [0.16, 1.42, 0.62], [0.07, 0.34, 0.04]));
      group.add(this.box(accent, [-0.16, 1.42, 0.62], [0.07, 0.34, 0.04]));
    } else if (id === 'deer' || id === 'moose') {
      for (const sx of [-1, 1]) {
        group.add(this.box(accent, [sx * 0.2, 1.32, 0.64], [0.08, 0.34, 0.08]));
        group.add(this.box(accent, [sx * 0.34, 1.5, 0.6], [0.26, 0.07, 0.07], [0, 0, sx * 0.5]));
        group.add(this.box(accent, [sx * 0.28, 1.62, 0.56], [0.07, 0.24, 0.07], [0.4, 0, 0]));
      }
    } else if (id === 'boar') {
      group.add(this.box(ctx.white, [0.2, 0.76, 1.1], [0.07, 0.24, 0.07], [0.5, 0, 0.3]));
      group.add(this.box(ctx.white, [-0.2, 0.76, 1.1], [0.07, 0.24, 0.07], [0.5, 0, -0.3]));
      group.add(this.box(accent, [0, 1.26, 0.62], [0.66, 0.16, 0.2]));
    } else if (id === 'hedgehog') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI - Math.PI / 2;
        group.add(this.box(accent, [Math.sin(a) * 0.34, 1.2 + Math.cos(a) * 0.16, (i % 3) * 0.4 - 0.4],
          [0.12, 0.3, 0.12], [0, 0, a]));
      }
    } else if (id === 'wolf') {
      group.add(this.box(accent, [0, 1.1, 0.2], [0.7, 0.16, 0.9]));
      group.add(this.box(accent, [0.16, 1.3, 0.6], [0.1, 0.2, 0.06], [0, 0, 0.2]));
      group.add(this.box(accent, [-0.16, 1.3, 0.6], [0.1, 0.2, 0.06], [0, 0, -0.2]));
    } else if (id === 'bear') {
      group.add(this.box(accent, [0.22, 1.24, 0.58], [0.16, 0.16, 0.1]));
      group.add(this.box(accent, [-0.22, 1.24, 0.58], [0.16, 0.16, 0.1]));
      group.add(this.box(accent, [0, 1.02, 0.5], [0.66, 0.3, 0.3]));
    } else {
      group.add(this.box(accent, [0.18, 1.26, 0.6], [0.13, 0.22, 0.09], [0, 0, 0.18]));
      group.add(this.box(accent, [-0.18, 1.26, 0.6], [0.13, 0.22, 0.09], [0, 0, -0.18]));
    }
    // tail
    if (bigTail) {
      group.add(this.box(accent, [0, 0.95, -0.82], [0.3, 0.32, 0.6], [0.4, 0, 0]));
      group.add(this.box(accent, [0, 1.18, -0.98], [0.22, 0.24, 0.34], [0.8, 0, 0]));
    } else {
      group.add(this.box(accent, [0, 0.9, -0.78], [0.12, 0.12, 0.42], [0.35, 0, 0]));
    }
    if (unicorn) {
      group.add(this.part(G.cone, this.mat(ctx.pal.glow || '#ffd9f2', ctx.pal.glow, 0.6),
        { pos: [0, 1.45, 0.72], size: [0.16, 0.55, 0.16], rot: [0.25, 0, 0] }));
      group.add(this.box(accent, [0, 1.2, 0.3], [0.16, 0.3, 0.7], [0.2, 0, 0]));
      group.add(this.box(ctx.pal.glow ? this.mat(ctx.pal.glow, ctx.pal.glow, 0.8) : accent,
        [0, 1.3, -1.15], [0.2, 0.3, 0.5], [0.5, 0, 0]));
    }
    if (id === 'lynx') {
      group.add(this.box(accent, [0.18, 1.4, 0.6], [0.06, 0.18, 0.06], [0, 0, 0.2]));
      group.add(this.box(accent, [-0.18, 1.4, 0.6], [0.06, 0.18, 0.06], [0, 0, -0.2]));
    }
  }

  bird(ctx) {
    const { group, body, accent, white } = ctx;
    const id = ctx.species.id;
    const lion = id === 'griffin';
    group.add(this.box(body, [0, 0.95, 0], [0.75, 0.7, 0.95]));
    group.add(this.box(white, [0, 1.24, 0.32], [0.52, 0.46, 0.5]));
    group.add(this.part(G.cone, this.mat('#ffb020'), { pos: [0, 1.16, 0.68], size: [0.18, 0.34, 0.18], rot: [Math.PI / 2, 0, 0] }));
    this.eyes(ctx, 1.3, 0.56, 0.14, 0.09);
    // wings
    for (const sx of [-1, 1]) {
      const wingMat = id === 'phoenix' ? this.mat('#ff6a00', '#ff9d00', 0.9) : accent;
      group.add(this.box(wingMat, [sx * 0.62, 1.05, -0.08], [0.5, 0.12, 0.95], [0, 0, sx * -0.22]));
      if (id === 'phoenix') {
        for (let i = 0; i < 3; i++) {
          group.add(this.part(G.cone, this.mat('#ffb020', '#ff7a00', 0.9),
            { pos: [sx * (0.75 + i * 0.12), 1.2 + i * 0.12, -0.35 + i * 0.3], size: [0.12, 0.5, 0.12], rot: [0, 0, sx * -0.3] }));
        }
      }
    }
    // tail fan
    for (let i = -1; i <= 1; i++) {
      group.add(this.box(accent, [i * 0.24, 0.95, -0.66], [0.2, 0.1, 0.6], [0.25, i * 0.18, 0]));
    }
    // legs
    for (const sx of [-1, 1]) {
      group.add(this.box(this.mat('#ffb020'), [sx * 0.2, 0.34, 0.08], [0.1, 0.5, 0.1]));
      group.add(this.box(this.mat('#ffb020'), [sx * 0.2, 0.1, 0.16], [0.16, 0.08, 0.24]));
    }
    if (lion) {
      for (const sx of [-1, 1]) {
        group.add(this.box(body, [sx * 0.3, 0.34, -0.28], [0.16, 0.55, 0.16]));
      }
      group.add(this.box(accent, [0, 1.24, -0.12], [0.5, 0.4, 0.24]));
      group.add(this.box(accent, [0, 0.95, -0.66], [0.18, 0.18, 0.5], [0.3, 0, 0]));
    }
    if (id === 'eagle') {
      group.add(this.box(ctx.white, [0, 1.36, 0.3], [0.56, 0.24, 0.54]));
    }
  }

  blob(ctx) {
    const { group, body, accent } = ctx;
    const core = this.mat(ctx.pal.glow || accent, ctx.pal.glow, 0.4);
    group.add(this.part(G.sphere, body, { pos: [0, 0.62, 0], size: [1.5, 1.2, 1.5] }));
    group.add(this.part(G.ico, core, { pos: [0, 0.62, 0], size: [0.7, 0.62, 0.7] }));
    this.eyes(ctx, 0.82, 0.62, 0.26, 0.14);
    group.add(this.box(ctx.dark, [0, 0.52, 0.68], [0.34, 0.08, 0.1]));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      group.add(this.part(G.sphere, body, {
        pos: [Math.cos(a) * 0.62, 0.16 + (i % 2) * 0.06, Math.sin(a) * 0.62],
        size: [0.34, 0.26, 0.34],
      }));
    }
  }

  mimic(ctx) {
    const { group, body, accent } = ctx;
    const gold = this.mat('#ffd24a', '#ffb020', 0.35);
    group.add(this.box(body, [0, 0.58, 0], [1.15, 0.95, 0.9]));
    group.add(this.box(accent, [0, 1.14, 0], [1.2, 0.2, 0.95]));
    group.add(this.box(gold, [0, 1.06, 0.48], [0.18, 0.22, 0.06]));
    group.add(this.box(gold, [0, 1.2, 0], [0.24, 0.12, 0.94]));
    // teeth
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.2;
      group.add(this.box(ctx.white, [x, 1.02, 0.46], [0.1, 0.16, 0.06]));
      group.add(this.box(ctx.white, [x, 0.78, 0.46], [0.1, 0.14, 0.06]));
    }
    // tongue + eyes on the lid
    group.add(this.box(this.mat('#ff5577'), [0, 0.9, 0.5], [0.34, 0.06, 0.24], [0.3, 0, 0]));
    this.eyes(ctx, 1.16, 0.5, 0.24, 0.13);
    // little feet
    for (const sx of [-1, 1]) {
      group.add(this.box(accent, [sx * 0.4, 0.08, 0.3], [0.24, 0.16, 0.24]));
    }
  }

  humanoid(ctx) {
    const { group, body, accent } = ctx;
    const id = ctx.species.id;
    group.add(this.box(body, [0, 0.85, 0], [0.68, 0.8, 0.5]));
    group.add(this.box(body, [0, 1.42, 0], [0.58, 0.52, 0.52]));
    group.add(this.box(accent, [0, 1.3, 0.05], [0.62, 0.16, 0.56]));
    this.eyes(ctx, 1.46, 0.26, 0.13, 0.1);
    // head-tusks / ears
    for (const sx of [-1, 1]) {
      group.add(this.box(body, [sx * 0.34, 1.46, 0.02], [0.1, 0.3, 0.12], [0, 0, sx * 0.35]));
      group.add(this.box(body, [sx * 0.46, 0.9, 0], [0.18, 0.66, 0.18]));
      group.add(this.box(accent, [sx * 0.46, 0.55, 0.06], [0.22, 0.18, 0.22]));
      group.add(this.box(body, [sx * 0.18, 0.28, 0], [0.22, 0.56, 0.22]));
      group.add(this.box(accent, [sx * 0.18, 0.06, 0.06], [0.24, 0.14, 0.3]));
    }
    if (id === 'gargoyle') {
      for (const sx of [-1, 1]) {
        group.add(this.box(accent, [sx * 0.5, 1.15, -0.36], [0.5, 0.12, 0.6], [0.2, 0, sx * -0.5]));
        group.add(this.box(accent, [sx * 0.2, 1.68, 0], [0.1, 0.24, 0.1], [0, 0, sx * 0.4]));
      }
      group.add(this.box(this.mat('#ff5a3c', '#ff5a3c', 0.8), [0, 1.5, 0.28], [0.34, 0.08, 0.06]));
    } else {
      group.add(this.box(accent, [0, 1.1, 0.28], [0.4, 0.3, 0.12]));
      group.add(this.box(this.mat('#c9c9d6'), [0.42, 1.02, 0.1], [0.08, 0.5, 0.08]));
    }
  }

  golem(ctx) {
    const { group, body, accent } = ctx;
    const core = this.mat(ctx.pal.glow || '#7fe3ff', ctx.pal.glow || '#7fe3ff', 0.9);
    group.add(this.box(body, [0, 1.0, 0], [1.1, 1.0, 0.8]));
    group.add(this.box(accent, [0, 1.62, 0], [0.6, 0.46, 0.56]));
    group.add(this.box(core, [0, 1.62, 0.3], [0.24, 0.16, 0.06]));
    group.add(this.box(core, [0, 1.0, 0.42], [0.3, 0.3, 0.06]));
    this.eyes(ctx, 1.68, 0.3, 0.16, 0.11);
    for (const sx of [-1, 1]) {
      group.add(this.box(body, [sx * 0.36, 1.55, 0], [0.42, 0.32, 0.58]));
      group.add(this.box(body, [sx * 0.62, 0.95, 0], [0.32, 0.9, 0.34]));
      group.add(this.box(accent, [sx * 0.62, 0.44, 0.04], [0.4, 0.34, 0.4]));
      group.add(this.box(body, [sx * 0.26, 0.32, 0], [0.36, 0.62, 0.36]));
    }
  }

  dragon(ctx) {
    const { group, body, accent } = ctx;
    const glowMat = this.mat(ctx.pal.glow || '#4ad9ff', ctx.pal.glow || '#4ad9ff', 0.95);
    group.add(this.box(body, [0, 0.95, -0.1], [0.95, 0.8, 1.5]));
    // neck
    for (let i = 0; i < 3; i++) {
      group.add(this.box(body, [0, 1.15 + i * 0.24, 0.62 + i * 0.12], [0.5 - i * 0.05, 0.3, 0.42]));
    }
    group.add(this.box(body, [0, 1.95, 1.02], [0.62, 0.5, 0.66]));
    group.add(this.box(accent, [0, 1.85, 1.34], [0.42, 0.26, 0.36]));
    group.add(this.box(glowMat, [0, 1.9, 1.46], [0.3, 0.1, 0.08]));
    this.eyes(ctx, 2.02, 1.24, 0.17, 0.1);
    // horns
    for (const sx of [-1, 1]) {
      group.add(this.box(accent, [sx * 0.24, 2.24, 0.96], [0.1, 0.34, 0.1], [-0.3, 0, sx * 0.2]));
    }
    // wings
    for (const sx of [-1, 1]) {
      group.add(this.box(accent, [sx * 0.85, 1.35, -0.15], [1.0, 0.1, 0.9], [0, 0, sx * -0.35]));
      group.add(this.box(accent, [sx * 1.3, 1.05, -0.35], [0.7, 0.08, 0.6], [0, 0, sx * -0.5]));
      group.add(this.box(glowMat, [sx * 0.95, 1.44, -0.15], [0.14, 0.06, 0.7]));
    }
    // tail
    for (let i = 0; i < 3; i++) {
      group.add(this.box(body, [0, 0.9 - i * 0.06, -1.0 - i * 0.34], [0.42 - i * 0.1, 0.4 - i * 0.09, 0.42]));
    }
    // legs
    for (const sx of [-1, 1]) {
      group.add(this.box(body, [sx * 0.42, 0.4, 0.42], [0.3, 0.72, 0.3]));
      group.add(this.box(body, [sx * 0.42, 0.4, -0.6], [0.3, 0.72, 0.3]));
      group.add(this.box(accent, [sx * 0.42, 0.07, 0.5], [0.36, 0.14, 0.4]));
    }
    if (ctx.species.id === 'mecha_dragon') {
      group.add(this.box(glowMat, [0, 1.0, 0.68], [0.6, 0.5, 0.06]));
      group.add(this.box(glowMat, [0, 1.98, 1.36], [0.5, 0.3, 0.04]));
      for (const sx of [-1, 1]) {
        group.add(this.box(glowMat, [sx * 0.5, 1.6, 0], [0.06, 0.5, 0.1]));
      }
    }
  }

  serpent(ctx) {
    const { group, body, accent } = ctx;
    const glow = this.mat(ctx.pal.glow || '#00e5ff', ctx.pal.glow || '#00e5ff', 1.0);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const angle = t * Math.PI * 1.3;
      const y = 0.3 + t * 1.5;
      const x = Math.sin(angle) * 0.85;
      const z = Math.cos(angle) * 0.4;
      const size = 0.62 - t * 0.22;
      group.add(this.box(body, [x, y, z], [size, size, 0.9 - t * 0.2], [0, angle, 0]));
      group.add(this.box(glow, [x, y, z + 0.02], [size * 0.4, size * 0.4, 0.12], [0, angle, 0]));
    }
    const hx = Math.sin(Math.PI * 1.3) * 0.85;
    const hz = Math.cos(Math.PI * 1.3) * 0.4;
    group.add(this.box(body, [hx, 1.95, hz], [0.66, 0.5, 0.8]));
    group.add(this.box(accent, [hx, 1.8, hz + 0.34], [0.56, 0.18, 0.5]));
    group.add(this.box(ctx.white, [hx - 0.2, 1.72, hz + 0.4], [0.1, 0.16, 0.1]));
    group.add(this.box(ctx.white, [hx + 0.2, 1.72, hz + 0.4], [0.1, 0.16, 0.1]));
    group.add(this.box(glow, [hx - 0.18, 2.02, hz + 0.36], [0.14, 0.12, 0.08]));
    group.add(this.box(glow, [hx + 0.18, 2.02, hz + 0.36], [0.14, 0.12, 0.08]));
    for (const sx of [-1, 1]) {
      group.add(this.box(accent, [hx + sx * 0.4, 2.1, hz], [0.12, 0.4, 0.12], [0, 0, sx * 0.4]));
    }
  }
}
