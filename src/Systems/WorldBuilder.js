// Static world: bright Roblox-simulator block island — stud-plate ground, chunky
// props, a candy base camp, the cannon and the board deck. Returns the handles the
// game systems animate.

import * as THREE from '../../vendor/three.module.js';
import { BIOMES, WORLD_RADIUS } from '../Config/Biomes.js';
import { BOARD_TILES, BOARD_SIDE, TILE_STYLE } from '../Config/BoardCells.js';
import { CONFIG } from '../Config/GameConfig.js';
import { bakeGroup } from '../Utils/MergeGeometry.js';
import { studdedMaterial, planarUV, tileTopTexture, signTexture, glowSprite } from '../Utils/Textures.js';
import { createBoardToken } from './TokenFactory.js';

const BASE_RADIUS = 18;
const BASE_HEIGHT = 1.3;
const TILE_TOP = 2.05;
const DECK_Y = 1.37;

const GROUND_TINT = {
  meadow: '#8ae45a',
  forest: '#41cc63',
  savanna: '#f6d36a',
  volcano: '#7d4236',
  abyss: '#4a2f8f',
};

const PALETTE = {
  plateSide: '#efd9a8',
  plateRim: '#fff5d6',
  baseGround: '#f2e6bd',
  fencePost: '#fff7e4',
  fenceRail: '#ffcf6a',
  fenceCap: '#2ee6ff',
  wood: '#b56a2c',
  woodDark: '#8a4c1e',
  iron: '#4d5c7a',
  ironDark: '#2b3550',
  gold: '#ffd23f',
  cyan: '#2ee6ff',
  pink: '#ff5fc8',
  leaf: '#63ff8c',
  leafDark: '#2ee06a',
  trunk: '#ab6d3b',
  rock: '#c2c8d8',
  rockDark: '#8d95aa',
  lava: '#ff5a2a',
  crystal: '#5df2ff',
  ocean: '#2ec9f2',
};

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2a9df4');
  g.addColorStop(0.32, '#5dc4ff');
  g.addColorStop(0.6, '#a8e7ff');
  g.addColorStop(0.82, '#def8ff');
  g.addColorStop(1, '#fff6d9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, factory) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog('#cfeeff', 300, 660);

  // ---- lighting: bright sun with a shadow frustum that follows the action ------
  const hemi = new THREE.HemisphereLight('#eaf9ff', '#8fc76a', 0.95);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight('#ffffff', 0.3));

  const sun = new THREE.DirectionalLight('#fff8e6', 1.32);
  sun.position.set(72, 118, 56);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 240;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.5;
  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(-2, 0, 0);
  scene.add(sunTarget);
  sun.target = sunTarget;
  scene.add(sun);

  const fill = new THREE.DirectionalLight('#d8ecff', 0.4);
  fill.position.set(-70, 45, -60);
  scene.add(fill);

  // sun disc + haze in the sky
  const sunSprite = glowSprite('#fff3b6', 115, 0.9);
  sunSprite.position.set(200, 96, -410);
  scene.add(sunSprite);
  const skyGlow = glowSprite('#bfeaff', 360, 0.3);
  skyGlow.position.set(130, 60, -410);
  scene.add(skyGlow);

  // ---- ocean ------------------------------------------------------------------
  const oceanGeo = new THREE.CircleGeometry(520, 64);
  planarUV(oceanGeo, 16, 'y');
  const ocean = new THREE.Mesh(oceanGeo, studdedMaterial(PALETTE.ocean, 1, 1, { grout: 0.03, shade: 0.13 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.55;
  ocean.receiveShadow = true;
  scene.add(ocean);

  const shallow = new THREE.Mesh(
    new THREE.RingGeometry(WORLD_RADIUS + 2, WORLD_RADIUS + 34, 96),
    new THREE.MeshLambertMaterial({ color: '#79eaff' }),
  );
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = -0.35;
  scene.add(shallow);

  // ---- biome rings ------------------------------------------------------------
  const rings = [];
  let innerEdge = 0.01;
  for (const biome of BIOMES) {
    const geo = new THREE.RingGeometry(innerEdge, biome.maxDist, 128, 2);
    planarUV(geo, 2.4, 'y');
    const tint = GROUND_TINT[biome.id] || biome.groundHex;
    const mesh = new THREE.Mesh(geo, studdedMaterial(tint, 1, 1, { grout: 0.05, shade: 0.17 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    rings.push(mesh);
    if (biome.maxDist < WORLD_RADIUS) {
      const lip = new THREE.Mesh(
        new THREE.RingGeometry(biome.maxDist - 0.5, biome.maxDist + 0.5, 128),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false }),
      );
      lip.rotation.x = -Math.PI / 2;
      lip.position.y = 0.02;
      scene.add(lip);
    }
    innerEdge = biome.maxDist;
  }
  const beach = new THREE.Mesh(
    new THREE.RingGeometry(WORLD_RADIUS, WORLD_RADIUS + 6, 96),
    new THREE.MeshLambertMaterial({ color: '#ffeec4' }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.y = -0.02;
  beach.receiveShadow = true;
  scene.add(beach);

  // ---- blocky clouds ----------------------------------------------------------
  const clouds = new THREE.Group();
  {
    const puffs = new THREE.Group();
    let seed = 7351;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const white = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#f2fbff', emissiveIntensity: 0.85, flatShading: true });
    const puffGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 95 + rnd() * 260;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = 52 + rnd() * 58;
      const blocks = 4 + Math.floor(rnd() * 4);
      for (let b = 0; b < blocks; b++) {
        const m = new THREE.Mesh(puffGeo, white);
        const w = 12 + rnd() * 16;
        m.scale.set(w, 5 + rnd() * 4, 9 + rnd() * 10);
        m.position.set(cx + (rnd() - 0.5) * 26, cy + (rnd() - 0.5) * 5, cz + (rnd() - 0.5) * 20);
        puffs.add(m);
      }
    }
    bakeGroup(puffs);
    clouds.add(puffs);
    scene.add(clouds);
  }

  // ---- floating islands -------------------------------------------------------
  const floaters = [];
  {
    const spots = [[-96, 40, -92, 9], [96, 54, -138, 7], [-138, 64, 34, 6]];
    const dirtMat = new THREE.MeshLambertMaterial({ color: '#c08a55', flatShading: true });
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#9a6234', flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: '#63ff8c', flatShading: true });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: '#9dffb0', flatShading: true });
    const rockMat = new THREE.MeshLambertMaterial({ color: '#a9b2c8', flatShading: true });
    for (let i = 0; i < spots.length; i++) {
      const [ix, iy, iz, r] = spots[i];
      const isle = new THREE.Group();
      isle.position.set(ix, iy, iz);
      const baked = new THREE.Group();
      const dirt = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.42, r * 0.95, 10), dirtMat);
      dirt.position.y = -r * 0.48;
      baked.add(dirt);
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 1.1), trunkMat);
      trunk.position.set(0, 2.1, 0);
      baked.add(trunk);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.2, 6.2), leafMat);
      crown.position.set(0, 5.6, 0);
      baked.add(crown);
      const crown2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 3.6), leafMat2);
      crown2.position.set(1.6, 7.8, -1.2);
      baked.add(crown2);
      const stone = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2.2), rockMat);
      stone.position.set(-r * 0.5, 0.7, r * 0.3);
      baked.add(stone);
      bakeGroup(baked);
      isle.add(baked);
      const grassGeo = new THREE.CircleGeometry(r, 14);
      planarUV(grassGeo, 3, 'y');
      const grass = new THREE.Mesh(grassGeo, studdedMaterial('#6df08a', 1, 1, { grout: 0.05, shade: 0.16 }));
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = 0.02;
      isle.add(grass);
      scene.add(isle);
      floaters.push({ group: isle, baseY: iy, phase: i * 1.7 });
    }
  }

  // ---- props ------------------------------------------------------------------
  const props = new THREE.Group();
  scene.add(props);
  {
    const m = {
      trunk: new THREE.MeshLambertMaterial({ color: PALETTE.trunk, flatShading: true }),
      leaf: new THREE.MeshLambertMaterial({ color: PALETTE.leaf, flatShading: true }),
      leaf2: new THREE.MeshLambertMaterial({ color: '#9dffb0', flatShading: true }),
      leafPink: new THREE.MeshLambertMaterial({ color: '#ff9ad8', flatShading: true }),
      leafGold: new THREE.MeshLambertMaterial({ color: '#ffe36a', flatShading: true }),
      leafDark: new THREE.MeshLambertMaterial({ color: '#2bbd52', flatShading: true }),
      rock: new THREE.MeshLambertMaterial({ color: PALETTE.rock, flatShading: true }),
      rockDark: new THREE.MeshLambertMaterial({ color: PALETTE.rockDark, flatShading: true }),
      sand: new THREE.MeshLambertMaterial({ color: '#f0c56a', flatShading: true }),
      lava: new THREE.MeshLambertMaterial({ color: PALETTE.lava, emissive: '#ff7a00', emissiveIntensity: 0.9, flatShading: true }),
      crystal: new THREE.MeshLambertMaterial({ color: PALETTE.crystal, emissive: '#18e0ff', emissiveIntensity: 0.85, flatShading: true }),
      dead: new THREE.MeshLambertMaterial({ color: '#a08056', flatShading: true }),
      flowerA: new THREE.MeshLambertMaterial({ color: '#ff7ad1', flatShading: true }),
      flowerB: new THREE.MeshLambertMaterial({ color: '#ffe45e', flatShading: true }),
      bush: new THREE.MeshLambertMaterial({ color: '#36d05e', flatShading: true }),
    };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const cone = new THREE.ConeGeometry(0.5, 1, 6);

    const add = (mat, pos, size, rot, geo = box) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(size[0], size[1], size[2]);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      props.add(mesh);
      return mesh;
    };

    let seed = 20261125;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (const biome of BIOMES) {
      const count = Math.round(26 + (biome.maxDist - biome.minDist) * 0.85);
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2;
        const dist = biome.minDist + 5 + rnd() * (biome.maxDist - biome.minDist - 8);
        const x = Math.cos(a) * dist;
        const z = Math.sin(a) * dist;
        if (Math.hypot(x, z) < BASE_RADIUS + 4) continue;
        if (Math.abs(x - CONFIG.board.center.x) < 24 && Math.abs(z - CONFIG.board.center.z) < 24) continue;
        // keep the hero camera's foreground clear so no tree blocks the camp
        if (dist < 96) {
          const a = Math.atan2(x, z);
          if (Math.abs(a - 0.62) < 0.62) continue;
        }
        const pick = rnd();

        if (biome.prop === 'tree' && pick < 0.72) {
          const h = 4 + rnd() * 3.4;
          add(m.trunk, [x, h / 2, z], [0.95, h, 0.95]);
          const s = 3.4 + rnd() * 1.8;
          const variant = rnd();
          const top = variant > 0.86 ? m.leafPink : variant > 0.74 ? m.leafGold : variant > 0.4 ? m.leaf : m.leafDark;
          add(top, [x, h + s * 0.28, z], [s, s * 0.72, s], [0, rnd() * 2, 0]);
          add(m.leaf2, [x + (rnd() - 0.5) * s * 0.5, h + s * 0.72, z + (rnd() - 0.5) * s * 0.5],
            [s * 0.6, s * 0.44, s * 0.6], [0, rnd() * 2, 0]);
          if (rnd() > 0.5) {
            add(m.leaf2, [x + (rnd() - 0.5) * s, h + s * 0.1, z + (rnd() - 0.5) * s],
              [s * 0.42, s * 0.36, s * 0.42], [0, rnd() * 2, 0]);
          }
          if (biome.id === 'meadow' && rnd() > 0.45) {
            const fm = rnd() > 0.5 ? m.flowerA : m.flowerB;
            for (let f = 0; f < 3; f++) {
              add(fm, [x + (rnd() - 0.5) * 5, 0.35, z + (rnd() - 0.5) * 5], [0.5, 0.5, 0.5]);
            }
          }
        } else if (biome.prop === 'deadTree') {
          const h = 3.4 + rnd() * 3;
          add(m.dead, [x, h / 2, z], [0.8, h, 0.8], [0, 0, (rnd() - 0.5) * 0.18]);
          add(m.leafDark, [x, h + 0.4, z], [4.4 + rnd() * 2, 0.9, 4.4 + rnd() * 2], [0, rnd() * 2, 0]);
          if (rnd() > 0.55) add(m.bush, [x + (rnd() - 0.5) * 6, 0.5, z + (rnd() - 0.5) * 6], [1.6, 1.0, 1.6], [0, rnd() * 2, 0]);
        } else if (biome.prop === 'lava') {
          if (pick < 0.42) {
            const r = 3 + rnd() * 4;
            const pool = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.5, 12), m.lava);
            pool.position.set(x, 0.16, z);
            props.add(pool);
            add(m.rockDark, [x + r * 0.9, 0.6, z - r * 0.4], [1.8, 1.6, 1.8], [0, rnd() * 2, 0]);
          } else if (pick < 0.7) {
            const h = 2.4 + rnd() * 3;
            add(m.rockDark, [x, h / 2, z], [2.6, h, 2.6], [0, rnd() * 2, 0]);
            add(m.lava, [x, h + 0.1, z], [1.5, 0.3, 1.5]);
          } else {
            const s = 2 + rnd() * 3;
            add(m.rockDark, [x, s * 0.4, z], [s, s * 0.8, s], [0, rnd() * 2, 0]);
          }
        } else if (biome.prop === 'voidCrystal') {
          if (pick < 0.55) {
            const h = 3 + rnd() * 5;
            add(m.crystal, [x, h / 2, z], [0.9, h, 0.9], [0, 0, (rnd() - 0.5) * 0.3], cone);
            add(m.crystal, [x + 1.4, 1.6, z + 0.8], [0.5, 3, 0.5], [0, 0, 0.4], cone);
          } else {
            const s = 2 + rnd() * 3;
            add(rnd() > 0.5 ? m.rock : m.rockDark, [x, s * 0.35, z], [s, s * 0.7, s], [0, rnd() * 2, 0]);
          }
        } else if (biome.prop === 'rock') {
          const s = 2 + rnd() * 3;
          add(rnd() > 0.5 ? m.rock : m.rockDark, [x, s * 0.36, z], [s, s * 0.72, s], [0, rnd() * 2, 0]);
          if (rnd() > 0.6) add(m.rock, [x + s * 0.6, s * 0.18, z + 0.4], [s * 0.5, s * 0.36, s * 0.5], [0, rnd() * 2, 0]);
        } else {
          add(m.bush, [x, 0.55, z], [1.8, 1.1, 1.8], [0, rnd() * 2, 0]);
        }
      }
    }
    bakeGroup(props);
    enableShadows(props, true, true);
  }

  // ---- base plateau -----------------------------------------------------------
  const baseGroup = new THREE.Group();
  scene.add(baseGroup);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS + 1.8, BASE_HEIGHT, 24, 1, false),
    new THREE.MeshLambertMaterial({ color: PALETTE.plateSide, flatShading: true }),
  );
  plate.position.y = BASE_HEIGHT / 2;
  plate.receiveShadow = true;
  baseGroup.add(plate);

  const topGeo = new THREE.CircleGeometry(BASE_RADIUS - 0.05, 48);
  planarUV(topGeo, 2.0, 'y');
  const baseTop = new THREE.Mesh(topGeo, studdedMaterial(PALETTE.baseGround, 1, 1, { grout: 0.05, shade: 0.15 }));
  baseTop.rotation.x = -Math.PI / 2;
  baseTop.position.y = BASE_HEIGHT + 0.01;
  baseTop.receiveShadow = true;
  baseGroup.add(baseTop);

  const rimBand = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_RADIUS + 0.12, BASE_RADIUS + 0.3, 0.34, 24, 1, true),
    new THREE.MeshLambertMaterial({ color: PALETTE.plateRim, side: THREE.DoubleSide }),
  );
  rimBand.position.y = BASE_HEIGHT - 0.1;
  baseGroup.add(rimBand);

  const neonRim = new THREE.Mesh(
    new THREE.RingGeometry(BASE_RADIUS - 0.62, BASE_RADIUS - 0.24, 64),
    new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  );
  neonRim.rotation.x = -Math.PI / 2;
  neonRim.position.y = BASE_HEIGHT + 0.02;
  baseGroup.add(neonRim);

  // launch lane: bright chevrons pointing at the cannon's firing line
  const chevronMat = new THREE.MeshLambertMaterial({ color: '#ffe14a', emissive: '#ffb000', emissiveIntensity: 0.35 });
  for (let i = 0; i < 3; i++) {
    const z = -8 - i * 3.4;
    for (const sx of [-1, 1]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 2.6), chevronMat);
      ch.position.set(sx * 1.1, BASE_HEIGHT + 0.06, z);
      ch.rotation.y = sx * 0.62;
      baseGroup.add(ch);
    }
  }

  // fence with gate, baked into one mesh
  const fenceMat = new THREE.MeshLambertMaterial({ color: PALETTE.fencePost, flatShading: true });
  const railMat = new THREE.MeshLambertMaterial({ color: PALETTE.fenceRail, flatShading: true });
  const capMat = new THREE.MeshLambertMaterial({ color: PALETTE.fenceCap, emissive: PALETTE.fenceCap, emissiveIntensity: 0.35, flatShading: true });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const camp = new THREE.Group();
  baseGroup.add(camp);
  {
    const POSTS = 32;
    const RING = BASE_RADIUS - 0.8;
    const chord = 2 * RING * Math.sin(Math.PI / POSTS);
    for (let i = 0; i < POSTS; i++) {
      const a = (i / POSTS) * Math.PI * 2;
      const za = Math.sin(a);
      if (za < -0.72) continue;
      const post = new THREE.Mesh(boxGeo, fenceMat);
      post.scale.set(0.7, 2.5, 0.7);
      post.position.set(Math.cos(a) * RING, BASE_HEIGHT + 1.25, za * RING);
      camp.add(post);
      const cap = new THREE.Mesh(boxGeo, capMat);
      cap.scale.set(0.8, 0.24, 0.8);
      cap.position.set(Math.cos(a) * RING, BASE_HEIGHT + 2.6, za * RING);
      camp.add(cap);
      const aMid = a + Math.PI / POSTS;
      if (Math.sin(aMid) < -0.78) continue;
      for (const h of [0.85, 2.0]) {
        const rail = new THREE.Mesh(boxGeo, railMat);
        rail.scale.set(chord, 0.28, 0.28);
        rail.position.set(Math.cos(aMid) * RING, BASE_HEIGHT + h, Math.sin(aMid) * RING);
        rail.rotation.y = aMid + Math.PI / 2;
        camp.add(rail);
      }
    }

    // barrels, crates and a flag pole
    const barrelMat = new THREE.MeshLambertMaterial({ color: PALETTE.wood, flatShading: true });
    const hoopMat = new THREE.MeshLambertMaterial({ color: PALETTE.ironDark, flatShading: true });
    for (const [bx, bz] of [[-10.5, 5.2], [-12.3, 2.6], [-9.2, 1.8]]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 10), barrelMat);
      barrel.position.set(bx, BASE_HEIGHT + 1.25, bz);
      camp.add(barrel);
      for (const h of [0.6, 1.9]) {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.2, 10), hoopMat);
        hoop.position.set(bx, BASE_HEIGHT + h, bz);
        camp.add(hoop);
      }
    }
    const crateMat = new THREE.MeshLambertMaterial({ color: '#d99a52', flatShading: true });
    for (const [cx, cz, cs] of [[-14, -2.2, 2.4], [-11.2, -5.4, 1.8]]) {
      const crate = new THREE.Mesh(boxGeo, crateMat);
      crate.scale.setScalar(cs);
      crate.position.set(cx, BASE_HEIGHT + cs / 2, cz);
      crate.rotation.y = 0.3;
      camp.add(crate);
    }

    // lamp posts with glowing bulbs
    for (const [lx, lz] of [[13.5, 13.5], [-14.5, 12.5], [14.5, -9]]) {
      const pole = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: '#3a4664', flatShading: true }));
      pole.scale.set(0.42, 4.6, 0.42);
      pole.position.set(lx, BASE_HEIGHT + 2.3, lz);
      camp.add(pole);
      const bulb = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: '#fff3a8', emissive: '#ffe45e', emissiveIntensity: 0.9 }));
      bulb.scale.set(1.1, 1.1, 1.1);
      bulb.position.set(lx, BASE_HEIGHT + 4.9, lz);
      camp.add(bulb);
    }
    bakeGroup(camp);
    enableShadows(camp, true, true);
  }

  // campfire + spawn pad (props that glow, so they stay outside the baked camp)
  {
    const fire = new THREE.Group();
    fire.position.set(-13.2, BASE_HEIGHT, 8.4);
    const stoneMat = new THREE.MeshLambertMaterial({ color: '#9aa3b8', flatShading: true });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(boxGeo, stoneMat);
      stone.scale.set(0.75, 0.55, 0.6);
      stone.position.set(Math.cos(a) * 1.55, 0.28, Math.sin(a) * 1.55);
      stone.rotation.y = a;
      stone.castShadow = true;
      fire.add(stone);
    }
    const logMat = new THREE.MeshLambertMaterial({ color: '#8a5a2e', flatShading: true });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(boxGeo, logMat);
      log.scale.set(0.34, 0.34, 2.1);
      log.position.set(0, 0.4, 0);
      log.rotation.y = (i / 3) * Math.PI;
      fire.add(log);
    }
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 1.9, 6),
      new THREE.MeshLambertMaterial({ color: '#ffb020', emissive: '#ff7a00', emissiveIntensity: 1 }),
    );
    flame.position.y = 1.35;
    fire.add(flame);
    const fireGlow = glowSprite('#ff9a2a', 5.2, 0.55);
    fireGlow.position.y = 1.4;
    fire.add(fireGlow);
    baseGroup.add(fire);
  }

  {
    const spawn = new THREE.Group();
    spawn.position.set(-2.5, BASE_HEIGHT + 0.04, 6);
    const padPlate = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 4), new THREE.MeshLambertMaterial({ color: '#f4f8ff' }));
    const trimMat = new THREE.MeshLambertMaterial({ color: '#2ee6ff', emissive: '#00b8dd', emissiveIntensity: 0.5 });
    spawn.add(padPlate);
    for (const [sx, sz, w, d] of [[0, 1.92, 4, 0.22], [0, -1.92, 4, 0.22], [1.92, 0, 0.22, 4], [-1.92, 0, 0.22, 4]]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), trimMat);
      trim.position.set(sx, 0.03, sz);
      spawn.add(trim);
    }
    const star = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.06, 5),
      new THREE.MeshLambertMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.35 }),
    );
    star.position.y = 0.03;
    spawn.add(star);
    baseGroup.add(spawn);
  }

  // camp sign
  const signTex = signTexture(["DON'T GO", 'FAR!'], '#ffe45e', '#4a2c12');
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.0, 4.6), [
    new THREE.MeshLambertMaterial({ color: PALETTE.woodDark }),
    new THREE.MeshLambertMaterial({ color: PALETTE.woodDark }),
    new THREE.MeshLambertMaterial({ color: PALETTE.woodDark }),
    new THREE.MeshLambertMaterial({ color: PALETTE.woodDark }),
    new THREE.MeshLambertMaterial({ map: signTex }),
    new THREE.MeshLambertMaterial({ map: signTex }),
  ]);
  signBoard.position.set(13.4, BASE_HEIGHT + 2.9, 9.4);
  signBoard.rotation.y = 0.42;
  signBoard.castShadow = true;
  baseGroup.add(signBoard);
  for (const dz of [-1.4, 1.4]) {
    const post = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: PALETTE.woodDark, flatShading: true }));
    post.scale.set(0.34, 4.2, 0.34);
    post.position.set(13.4, BASE_HEIGHT + 2.1, 9.4 + dz);
    post.castShadow = true;
    baseGroup.add(post);
  }

  // ---- cannon -----------------------------------------------------------------
  const cannon = new THREE.Group();
  cannon.position.set(-3.5, BASE_HEIGHT, -2);
  cannon.rotation.y = 0.18;
  baseGroup.add(cannon);

  const woodMat = new THREE.MeshLambertMaterial({ color: '#c07a34', flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: PALETTE.iron, flatShading: true });
  const ironDark = new THREE.MeshLambertMaterial({ color: PALETTE.ironDark, flatShading: true });
  const goldMat = new THREE.MeshLambertMaterial({ color: PALETTE.gold, emissive: '#ff9d00', emissiveIntensity: 0.4, flatShading: true });
  const cannonStatic = new THREE.Group();
  cannon.add(cannonStatic);
  {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 4.4), woodMat);
    platform.position.set(0, 0.24, 0.2);
    cannonStatic.add(platform);
    const deckTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 4.6), new THREE.MeshLambertMaterial({ color: '#e0a35a' }));
    deckTop.position.set(0, 0.53, 0.2);
    cannonStatic.add(deckTop);

    const carriage = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 3.0), woodMat);
    carriage.position.set(0, 1.1, 0);
    cannonStatic.add(carriage);
    const carriageTrim = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 3.2), goldMat);
    carriageTrim.position.set(0, 1.56, 0);
    cannonStatic.add(carriageTrim);

    for (const sx of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.66, 10), ironDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 2.45, 1.5, -0.3);
      cannonStatic.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 6, 12), goldMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.set(sx * 2.45, 1.5, -0.3);
      cannonStatic.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), goldMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx * 2.45, 1.5, -0.3);
      cannonStatic.add(hub);
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.14), goldMat);
        spoke.position.set(sx * 2.45, 1.5, -0.3);
        spoke.rotation.x = (i / 4) * Math.PI;
        cannonStatic.add(spoke);
      }
    }
    bakeGroup(cannonStatic);
    enableShadows(cannonStatic, true, true);
  }

  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 2.1, 0.2);
  barrelPivot.rotation.x = -0.32;
  cannon.add(barrelPivot);
  const barrelGroup = new THREE.Group();
  barrelPivot.add(barrelGroup);
  {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 6.4, 8, 1, false), new THREE.MeshLambertMaterial({ color: '#8896b8', flatShading: true }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -2.0);
    barrelGroup.add(barrel);
    const barrelTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.4), new THREE.MeshLambertMaterial({ color: '#63718f' }));
    barrelTop.position.set(0, 0.9, -2.1);
    barrelGroup.add(barrelTop);
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.22 - i * 0.07, 1.22 - i * 0.07, 0.42, 8), goldMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0, -0.2 - i * 1.7);
      barrelGroup.add(band);
    }
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.7, 8), goldMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0, -5.2);
    barrelGroup.add(muzzle);
    const breech = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), ironDark);
    breech.position.set(0, 0, 1.2);
    barrelGroup.add(breech);
    const breechStud = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 8), goldMat);
    breechStud.position.set(0, 0.98, 1.2);
    barrelGroup.add(breechStud);
    bakeGroup(barrelGroup);
    enableShadows(barrelGroup, true, false);
  }
  const muzzleGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 16),
    new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.85 }),
  );
  muzzleGlow.position.set(0, 0, -5.58);
  muzzleGlow.rotation.y = Math.PI;
  barrelPivot.add(muzzleGlow);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0, -5.7);
  barrelPivot.add(muzzleTip);

  // ---- yard pads (one instanced draw call per layer) ---------------------------
  const yardPads = [];
  {
    const discGeo = new THREE.CylinderGeometry(1.8, 1.95, 0.34, 10);
    const topGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.22, 10);
    const ringGeo = new THREE.RingGeometry(1.55, 1.78, 20);
    const baseMat = new THREE.MeshLambertMaterial({ color: '#cfd6e6', flatShading: true });
    const topMat = new THREE.MeshLambertMaterial({ color: '#a8f07a', flatShading: true });
    const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const count = CONFIG.yard.maxSlots;
    const discs = new THREE.InstancedMesh(discGeo, baseMat, count);
    const tops = new THREE.InstancedMesh(topGeo, topMat, count);
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 8.4 + col * 4.8;
      const z = -8.6 + row * 3.6;
      yardPads.push({ position: new THREE.Vector3(x, BASE_HEIGHT, z) });
      m.compose(new THREE.Vector3(x, BASE_HEIGHT + 0.17, z), q, one);
      discs.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, BASE_HEIGHT + 0.38, z), q, one);
      tops.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, BASE_HEIGHT + 0.5, z), qFlat, one);
      rings.setMatrixAt(i, m);
    }
    discs.castShadow = true;
    discs.receiveShadow = true;
    tops.receiveShadow = true;
    baseGroup.add(discs, tops, rings);
  }

  // ---- board ------------------------------------------------------------------
  const boardCenter = new THREE.Vector3(CONFIG.board.center.x, 0, CONFIG.board.center.z);
  const boardGroup = new THREE.Group();
  boardGroup.position.copy(boardCenter);
  scene.add(boardGroup);

  const boardPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(21, 22.5, 1.2, 24),
    new THREE.MeshLambertMaterial({ color: '#3b2d63', flatShading: true }),
  );
  boardPlate.position.y = 0.6;
  boardPlate.receiveShadow = true;
  boardGroup.add(boardPlate);

  const boardDeck = new THREE.Mesh(
    new THREE.BoxGeometry(29.2, 0.36, 29.2),
    new THREE.MeshLambertMaterial({ color: '#4a3a75', flatShading: true }),
  );
  boardDeck.position.y = DECK_Y;
  boardDeck.receiveShadow = true;
  boardGroup.add(boardDeck);

  const deckTopGeo = new THREE.PlaneGeometry(29, 29);
  planarUV(deckTopGeo, 2.2, 'y');
  const deckTop = new THREE.Mesh(deckTopGeo, studdedMaterial('#5b4a8c', 1, 1, { grout: 0.05, shade: 0.16 }));
  deckTop.rotation.x = -Math.PI / 2;
  deckTop.position.y = DECK_Y + 0.19;
  deckTop.receiveShadow = true;
  boardGroup.add(deckTop);

  // neon edge strips around the deck
  for (const [x, z, w, d] of [[0, 14.8, 29.6, 0.3], [0, -14.8, 29.6, 0.3], [14.8, 0, 0.3, 29.6], [-14.8, 0, 0.3, 29.6]]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), new THREE.MeshBasicMaterial({ color: PALETTE.pink }));
    strip.position.set(x, DECK_Y + 0.2, z);
    boardGroup.add(strip);
  }

  // ramp from the grass onto the deck
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 1.3), new THREE.MeshLambertMaterial({ color: '#6a58a0', flatShading: true }));
    step.position.set(0, 0.25 + i * 0.42, 16.6 + (3 - i) * 1.2);
    step.receiveShadow = true;
    step.castShadow = true;
    boardGroup.add(step);
  }

  // center medallion
  const medCanvas = document.createElement('canvas');
  medCanvas.width = 512;
  medCanvas.height = 512;
  const mctx = medCanvas.getContext('2d');
  const mg = mctx.createRadialGradient(200, 180, 30, 256, 256, 256);
  mg.addColorStop(0, '#7b62b8');
  mg.addColorStop(1, '#4a3a75');
  mctx.fillStyle = mg;
  mctx.beginPath();
  mctx.arc(256, 256, 250, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = '#ffd23f';
  mctx.lineWidth = 16;
  mctx.beginPath();
  mctx.arc(256, 256, 222, 0, Math.PI * 2);
  mctx.stroke();
  mctx.strokeStyle = '#ff5fc8';
  mctx.lineWidth = 6;
  mctx.beginPath();
  mctx.arc(256, 256, 200, 0, Math.PI * 2);
  mctx.stroke();
  mctx.fillStyle = '#ffffff';
  mctx.textAlign = 'center';
  mctx.font = 'bold 62px system-ui, sans-serif';
  mctx.fillText("DON'T", 256, 226);
  mctx.fillText('GO FAR!', 256, 292);
  mctx.font = 'bold 26px "Apple SD Gothic Neo", system-ui, sans-serif';
  mctx.fillStyle = '#ffe9a8';
  mctx.fillText('주사위를 굴려 펫을 모아라', 256, 356);
  const medTex = new THREE.CanvasTexture(medCanvas);
  medTex.colorSpace = THREE.SRGBColorSpace;
  const medallion = new THREE.Mesh(new THREE.CircleGeometry(9.6, 48), new THREE.MeshLambertMaterial({ map: medTex }));
  medallion.rotation.x = -Math.PI / 2;
  medallion.position.y = DECK_Y + 0.21;
  boardGroup.add(medallion);

  // 24 tiles
  const tileGeo = new THREE.BoxGeometry(3.72, 0.46, 3.72);
  const tileSideMat = new THREE.MeshLambertMaterial({ color: '#1e1836' });
  const tileBottomMat = new THREE.MeshLambertMaterial({ color: '#120e22' });
  const tiles = [];
  const half = (BOARD_SIDE - 1) / 2;
  const step = CONFIG.board.tileSize;

  function tileCell(index) {
    if (index <= 6) return { col: index, row: BOARD_SIDE - 1 };
    if (index <= 12) return { col: BOARD_SIDE - 1, row: BOARD_SIDE - 1 - (index - 6) };
    if (index <= 18) return { col: BOARD_SIDE - 1 - (index - 12), row: 0 };
    return { col: 0, row: index - 18 };
  }

  const tileBoxes = new THREE.Group();
  const tileTopGeo = new THREE.PlaneGeometry(3.72, 3.72);
  for (const cell of BOARD_TILES) {
    const style = TILE_STYLE[cell.type] || TILE_STYLE.start;
    const { col, row } = tileCell(cell.index);
    const x = (col - half) * step;
    const z = (row - half) * step;

    const block = new THREE.Mesh(tileGeo, tileSideMat);
    block.position.set(x, 1.78, z);
    tileBoxes.add(block);

    const tex = tileTopTexture(style, cell.nameKo);
    const face = new THREE.Mesh(tileTopGeo, new THREE.MeshLambertMaterial({ map: tex }));
    face.rotation.x = -Math.PI / 2;
    face.position.set(x, 2.075, z);
    face.receiveShadow = true;
    boardGroup.add(face);
    tiles.push(face);
  }
  bakeGroup(tileBoxes);
  tileBoxes.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  boardGroup.add(tileBoxes);

  // active tile highlight frame
  const tileHighlight = new THREE.Group();
  {
    const hmat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [x, z, w, d] of [[0, 1.92, 3.96, 0.2], [0, -1.92, 3.96, 0.2], [1.92, 0, 0.2, 3.96], [-1.92, 0, 0.2, 3.96]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), hmat);
      bar.position.set(x, 0, z);
      tileHighlight.add(bar);
    }
    tileHighlight.visible = false;
    scene.add(tileHighlight);
  }

  // big decorative dice on pedestals beside the deck
  for (const [dx, dz, face] of [[-17.5, -17.5, 1], [17.5, -17.5, 4]]) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 2.0, 12), new THREE.MeshLambertMaterial({ color: '#4a3a75', flatShading: true }));
    ped.position.set(dx, 1.0, dz);
    ped.castShadow = true;
    ped.receiveShadow = true;
    boardGroup.add(ped);
    const die = new THREE.Group();
    die.position.set(dx, 3.2, dz);
    die.rotation.set(0.35, 0.6, 0.2);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }));
    die.add(cube);
    const pipMat = new THREE.MeshBasicMaterial({ color: '#2a2340' });
    const pip = new THREE.SphereGeometry(0.22, 8, 6);
    const layout = {
      1: [[0, 0]],
      4: [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]],
    }[face] || [[0, 0]];
    for (const [px, pz] of layout) {
      const dot = new THREE.Mesh(pip, pipMat);
      dot.position.set(px, pz, 1.13);
      die.add(dot);
    }
    boardGroup.add(die);
  }

  // ---- token ------------------------------------------------------------------
  const token = createBoardToken();
  token.group.position.set(CONFIG.board.center.x - half * step, TILE_TOP, CONFIG.board.center.z + half * step);
  scene.add(token.group);

  return {
    basePos: new THREE.Vector3(-2.5, BASE_HEIGHT, 6),
    spawnPos: new THREE.Vector3(-2.5, BASE_HEIGHT, 6),
    cannon,
    barrelPivot,
    muzzleTip,
    yardPads,
    boardGroup,
    boardCenter,
    tiles,
    boardToken: token.group,
    boardTokenApi: token,
    tileHighlight,
    tileCell,
    baseHeight: BASE_HEIGHT,
    baseRadius: BASE_RADIUS,
    rings,
    clouds,
    floaters,
    sun,
    sunTarget,
    updateSun(focus, time = 0) {
      sunTarget.position.set(focus.x, 0, focus.z);
      sun.position.set(focus.x + 46, 96, focus.z + 32);
      sunSprite.position.set(focus.x + 200, 96, focus.z - 410);
      skyGlow.position.set(focus.x + 130, 60, focus.z - 410);
      clouds.position.x = focus.x * 0.35;
      clouds.position.z = focus.z * 0.35;
      for (const f of floaters) {
        f.group.position.y = f.baseY + Math.sin(time * 0.55 + f.phase) * 0.9;
        f.group.rotation.y = Math.sin(time * 0.15 + f.phase) * 0.05;
      }
    },
  };
}

function enableShadows(group, cast, receive) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = cast;
    o.receiveShadow = receive;
  });
}
