// Static world: sky, island rings, props, base yard, cannon and the board ring.
// Returns handles the game systems animate (cannon, pads, tiles, token).

import * as THREE from '../../vendor/three.module.js';
import { BIOMES, WORLD_RADIUS } from '../Config/Biomes.js';
import { BOARD_TILES, BOARD_SIDE, TILE_STYLE } from '../Config/BoardCells.js';
import { CONFIG } from '../Config/GameConfig.js';
import { bakeGroup } from '../Utils/MergeGeometry.js';

const BASE_RADIUS = 18;
const BASE_HEIGHT = 1.3;

function gradientSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#3aa0e8');
  g.addColorStop(0.45, '#8fd4ff');
  g.addColorStop(0.75, '#cdeeff');
  g.addColorStop(1, '#f5f0d8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function gridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function tileTexture(style, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = style.color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 176, 176);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.font = 'bold 62px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(style.icon, 96, 96);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(label.slice(0, 5), 96, 150);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

export function buildWorld(scene, factory) {
  scene.background = gradientSky();
  scene.fog = new THREE.Fog('#bfe4f7', 240, 560);

  scene.add(new THREE.HemisphereLight('#eaf6ff', '#6f7f4a', 0.95));
  const sun = new THREE.DirectionalLight('#fff4d6', 0.95);
  sun.position.set(70, 110, 50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffffff', 0.18));

  // ---- ocean + island rings -------------------------------------------------
  const ocean = new THREE.Mesh(
    new THREE.CircleGeometry(460, 48),
    new THREE.MeshLambertMaterial({ color: '#2f7fc4' }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.45;
  scene.add(ocean);

  const rings = [];
  const grid = gridTexture();
  for (const biome of BIOMES) {
    const inner = Math.max(0.01, biome.minDist);
    const geo = new THREE.RingGeometry(inner, biome.maxDist, 96, 1);
    const map = grid.clone();
    map.needsUpdate = true;
    map.repeat.set(Math.round(biome.maxDist / 6), Math.round(biome.maxDist / 6));
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: biome.groundHex, map }));
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    rings.push(mesh);
  }
  // beach lip
  const beach = new THREE.Mesh(
    new THREE.RingGeometry(WORLD_RADIUS, WORLD_RADIUS + 7, 96),
    new THREE.MeshLambertMaterial({ color: '#f3e2b8' }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.y = -0.02;
  scene.add(beach);

  // ---- props ---------------------------------------------------------------
  const propMats = {
    trunk: new THREE.MeshLambertMaterial({ color: '#7a4f2a', flatShading: true }),
    leaf: new THREE.MeshLambertMaterial({ color: '#3f9e4a', flatShading: true }),
    leafDark: new THREE.MeshLambertMaterial({ color: '#2c7a38', flatShading: true }),
    rock: new THREE.MeshLambertMaterial({ color: '#8f9098', flatShading: true }),
    rockDark: new THREE.MeshLambertMaterial({ color: '#63646d', flatShading: true }),
    sand: new THREE.MeshLambertMaterial({ color: '#c9a86a', flatShading: true }),
    lava: new THREE.MeshLambertMaterial({ color: '#ff6a2a', emissive: '#ff3d00', emissiveIntensity: 0.8 }),
    crystal: new THREE.MeshLambertMaterial({ color: '#6ff0ff', emissive: '#00bcd4', emissiveIntensity: 0.7, flatShading: true }),
    dead: new THREE.MeshLambertMaterial({ color: '#6d5a45', flatShading: true }),
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 7);
  const cone = new THREE.ConeGeometry(0.5, 1, 6);

  const props = new THREE.Group();
  scene.add(props);

  let seed = 20261125;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  function addProp(biome, r) {
    const a = rnd() * Math.PI * 2;
    const dist = biome.minDist + 6 + rnd() * (biome.maxDist - biome.minDist - 10);
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (Math.hypot(x, z) < BASE_RADIUS + 5) return;
    // keep the board deck clear
    if (Math.abs(x - CONFIG.board.center.x) < 22 && Math.abs(z - CONFIG.board.center.z) < 22) return;
    if (biome.prop === 'tree' && rnd() < 0.75) {
      const h = 3 + rnd() * 3;
      const trunk = new THREE.Mesh(box, propMats.trunk);
      trunk.scale.set(0.7, h, 0.7);
      trunk.position.set(x, h / 2, z);
      const leaves = new THREE.Mesh(box, rnd() > 0.5 ? propMats.leaf : propMats.leafDark);
      const s = 2.6 + rnd() * 1.6;
      leaves.scale.set(s, s * 0.8, s);
      leaves.position.set(x, h + s * 0.3, z);
      leaves.rotation.y = rnd();
      props.add(trunk, leaves);
      if (rnd() > 0.6) {
        const top = new THREE.Mesh(box, propMats.leafDark);
        top.scale.set(s * 0.6, s * 0.6, s * 0.6);
        top.position.set(x + (rnd() - 0.5), h + s * 0.85, z + (rnd() - 0.5));
        props.add(top);
      }
    } else if (biome.prop === 'rock' || biome.prop === 'lava' || biome.prop === 'voidCrystal') {
      if (biome.prop === 'lava' && rnd() > 0.55) {
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(3 + rnd() * 4, 3 + rnd() * 4, 0.3, 10), propMats.lava);
        pool.position.set(x, 0.16, z);
        props.add(pool);
      } else if (biome.prop === 'voidCrystal' && rnd() > 0.4) {
        const c = new THREE.Mesh(cone, propMats.crystal);
        const h = 2 + rnd() * 4;
        c.scale.set(0.9, h, 0.9);
        c.position.set(x, h / 2, z);
        c.rotation.z = (rnd() - 0.5) * 0.3;
        props.add(c);
      } else {
        const rock = new THREE.Mesh(box, rnd() > 0.5 ? propMats.rock : propMats.rockDark);
        const s = 1.4 + rnd() * 2.4;
        rock.scale.set(s, s * (0.5 + rnd() * 0.5), s);
        rock.position.set(x, s * 0.28, z);
        rock.rotation.y = rnd() * 3;
        props.add(rock);
      }
    } else if (biome.prop === 'deadTree') {
      const h = 2.4 + rnd() * 2.6;
      const trunk = new THREE.Mesh(cyl, propMats.dead);
      trunk.scale.set(0.5, h, 0.5);
      trunk.position.set(x, h / 2, z);
      trunk.rotation.z = (rnd() - 0.5) * 0.25;
      props.add(trunk);
      for (let i = 0; i < 3; i++) {
        const branch = new THREE.Mesh(box, propMats.dead);
        branch.scale.set(1.4, 0.18, 0.18);
        branch.position.set(x + (rnd() - 0.5) * 1.4, h * (0.5 + i * 0.16), z + (rnd() - 0.5) * 1.4);
        branch.rotation.y = rnd() * 3;
        branch.rotation.z = (rnd() - 0.5) * 0.7;
        props.add(branch);
      }
    } else {
      const grass = new THREE.Mesh(cone, propMats.sand);
      grass.scale.set(0.9, 1.1, 0.9);
      grass.position.set(x, 0.5, z);
      props.add(grass);
    }
  }

  for (const biome of BIOMES) {
    const count = Math.round(18 + (biome.maxDist - biome.minDist) * 0.5);
    for (let i = 0; i < count; i++) addProp(biome, i);
  }
  bakeGroup(props); // ~90 props -> 1 draw call

  // ---- base plateau --------------------------------------------------------
  const baseGroup = new THREE.Group();
  scene.add(baseGroup);
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS + 2, BASE_HEIGHT, 12),
    new THREE.MeshLambertMaterial({ color: '#e6e0c8', flatShading: true }),
  );
  plate.position.y = BASE_HEIGHT / 2;
  baseGroup.add(plate);
  const plateTop = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_RADIUS - 0.4, BASE_RADIUS - 0.4, 0.18, 12),
    new THREE.MeshLambertMaterial({ color: '#c9c2a4' }),
  );
  plateTop.position.y = BASE_HEIGHT;
  baseGroup.add(plateTop);

  // studs on the plate top (Roblox flavour)
  const studMat = new THREE.MeshLambertMaterial({ color: '#f2eddc' });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 8), studMat);
    stud.position.set(Math.cos(a) * (BASE_RADIUS - 1.6), BASE_HEIGHT + 0.1, Math.sin(a) * (BASE_RADIUS - 1.6));
    baseGroup.add(stud);
  }
  const studGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.14, 6);
  for (let gx = -12; gx <= 12; gx += 3) {
    for (let gz = -12; gz <= 12; gz += 3) {
      if (Math.hypot(gx, gz) > BASE_RADIUS - 3) continue;
      if (gx > 4 && gz > -11) continue; // keep the yard lanes clean
      const s = new THREE.Mesh(studGeo, studMat);
      s.position.set(gx, BASE_HEIGHT + 0.06, gz);
      baseGroup.add(s);
    }
  }

  // fence around the camp: posts plus rails that follow the ring
  const postMat = new THREE.MeshLambertMaterial({ color: '#b98b52', flatShading: true });
  const POSTS = 30;
  const RING = BASE_RADIUS - 1;
  const chord = 2 * RING * Math.sin(Math.PI / POSTS);
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * Math.PI * 2;
    const zA = Math.sin(a);
    if (zA < -0.66) continue; // gate toward the launch lane
    const post = new THREE.Mesh(box, postMat);
    post.scale.set(0.55, 2.4, 0.55);
    post.position.set(Math.cos(a) * RING, BASE_HEIGHT + 1.2, zA * RING);
    baseGroup.add(post);

    const aMid = a + Math.PI / POSTS;
    if (Math.sin(aMid) < -0.72) continue;
    for (const h of [0.75, 1.85]) {
      const rail = new THREE.Mesh(box, postMat);
      rail.scale.set(chord, 0.26, 0.26);
      rail.position.set(Math.cos(aMid) * RING, BASE_HEIGHT + h, Math.sin(aMid) * RING);
      rail.rotation.y = aMid + Math.PI / 2;
      baseGroup.add(rail);
    }
  }

  // camp clutter: barrels, crates and a wooden sign
  const barrelMat = new THREE.MeshLambertMaterial({ color: '#a9713d', flatShading: true });
  const hoopMat = new THREE.MeshLambertMaterial({ color: '#6d4b24' });
  for (const [bx, bz] of [[-9.5, 4.5], [-11.6, 2.2], [-8.4, 1.4]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 10), barrelMat);
    barrel.position.set(bx, BASE_HEIGHT + 1.2, bz);
    baseGroup.add(barrel);
    for (const h of [0.55, 1.85]) {
      const hoop = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.18, 10), hoopMat);
      hoop.position.set(bx, BASE_HEIGHT + h, bz);
      baseGroup.add(hoop);
    }
  }
  const crateMat = new THREE.MeshLambertMaterial({ color: '#c08a4e', flatShading: true });
  for (const [cx, cz, cs] of [[-13.5, -2, 2.2], [-10.8, -5.2, 1.7]]) {
    const crate = new THREE.Mesh(box, crateMat);
    crate.scale.setScalar(cs);
    crate.position.set(cx, BASE_HEIGHT + cs / 2, cz);
    crate.rotation.y = 0.3;
    baseGroup.add(crate);
  }

  const signPost = new THREE.Mesh(box, postMat);
  signPost.scale.set(0.4, 3.2, 0.4);
  signPost.position.set(12.5, BASE_HEIGHT + 1.6, 10.5);
  baseGroup.add(signPost);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 128;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#c08a4e';
  sctx.fillRect(0, 0, 256, 128);
  sctx.strokeStyle = '#7a4f2a';
  sctx.lineWidth = 10;
  sctx.strokeRect(5, 5, 246, 118);
  sctx.fillStyle = '#3a2412';
  sctx.font = 'bold 30px system-ui, sans-serif';
  sctx.textAlign = 'center';
  sctx.fillText("DON'T GO", 128, 56);
  sctx.fillText('FAR!', 128, 96);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 4.2), [
    new THREE.MeshLambertMaterial({ color: '#7a4f2a' }),
    new THREE.MeshLambertMaterial({ color: '#7a4f2a' }),
    new THREE.MeshLambertMaterial({ color: '#7a4f2a' }),
    new THREE.MeshLambertMaterial({ color: '#7a4f2a' }),
    new THREE.MeshLambertMaterial({ map: signTex }),
    new THREE.MeshLambertMaterial({ map: signTex }),
  ]);
  signBoard.position.set(12.5, BASE_HEIGHT + 2.6, 10.5);
  signBoard.rotation.y = Math.PI / 2;
  baseGroup.add(signBoard);

  // ---- cannon --------------------------------------------------------------
  const cannon = new THREE.Group();
  cannon.position.set(-3.5, BASE_HEIGHT, -2);
  cannon.rotation.y = 0.18;
  baseGroup.add(cannon);

  const woodMat = new THREE.MeshLambertMaterial({ color: '#8b5a2b', flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: '#4b5563', flatShading: true });
  const ironDark = new THREE.MeshLambertMaterial({ color: '#323a45', flatShading: true });
  const goldMat = new THREE.MeshLambertMaterial({ color: '#ffc24a', emissive: '#ff9d00', emissiveIntensity: 0.35 });

  const carriage = new THREE.Mesh(box, woodMat);
  carriage.scale.set(4.2, 0.9, 3);
  carriage.position.set(0, 1.1, 0);
  cannon.add(carriage);

  for (const sx of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.6, 12), ironDark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * 2.4, 1.5, -0.2);
    cannon.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.72, 8), goldMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(sx * 2.4, 1.5, -0.2);
    cannon.add(hub);
  }

  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 2.1, 0.2);
  barrelPivot.rotation.x = -0.32;
  cannon.add(barrelPivot);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 6.6, 14), ironMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -2.0);
  barrelPivot.add(barrel);

  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.16 - i * 0.06, 1.16 - i * 0.06, 0.22, 14), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0, -0.4 - i * 1.6);
    barrelPivot.add(band);
  }

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.6, 14), goldMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0, -5.2);
  barrelPivot.add(muzzle);

  const breech = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), ironDark);
  breech.position.set(0, 0, 1.25);
  barrelPivot.add(breech);

  // muzzle marker so the game knows where shots start
  const muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0, -5.6);
  barrelPivot.add(muzzleTip);

  // ---- yard lanes (two columns of pads beside the cannon) ------------------
  const yardPads = [];
  const padMat = new THREE.MeshLambertMaterial({ color: '#b5a97f', flatShading: true });
  const padTopMat = new THREE.MeshLambertMaterial({ color: '#d8f0c0' });
  for (let i = 0; i < CONFIG.yard.maxSlots; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const pad = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.26, 10), padMat);
    disc.position.y = 0.13;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.32, 10), padTopMat);
    top.position.y = 0.14;
    pad.add(disc, top);
    pad.position.set(8 + col * 4.6, BASE_HEIGHT, -8.5 + row * 3.5);
    baseGroup.add(pad);
    yardPads.push(pad);
  }

  // ---- board ---------------------------------------------------------------
  const boardCenter = new THREE.Vector3(CONFIG.board.center.x, 0, CONFIG.board.center.z);
  const boardGroup = new THREE.Group();
  boardGroup.position.copy(boardCenter);
  scene.add(boardGroup);

  const boardPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(19.5, 20.5, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: '#3b2f4a', flatShading: true }),
  );
  boardPlate.position.y = 0.6;
  boardGroup.add(boardPlate);
  const boardDeck = new THREE.Mesh(
    new THREE.BoxGeometry(28.5, 0.25, 28.5),
    new THREE.MeshLambertMaterial({ color: '#4c3d61' }),
  );
  boardDeck.position.y = 1.28;
  boardGroup.add(boardDeck);

  const medCanvas = document.createElement('canvas');
  medCanvas.width = 512;
  medCanvas.height = 512;
  const mctx = medCanvas.getContext('2d');
  mctx.fillStyle = '#584473';
  mctx.beginPath();
  mctx.arc(256, 256, 250, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = '#c9a6ff';
  mctx.lineWidth = 12;
  mctx.beginPath();
  mctx.arc(256, 256, 226, 0, Math.PI * 2);
  mctx.stroke();
  mctx.fillStyle = '#ffffff';
  mctx.textAlign = 'center';
  mctx.font = 'bold 58px system-ui, sans-serif';
  mctx.fillText("DON'T", 256, 220);
  mctx.fillText('GO FAR!', 256, 288);
  mctx.font = 'bold 26px system-ui, sans-serif';
  mctx.fillStyle = '#e3d2ff';
  mctx.fillText('주사위를 굴려 펫을 모아라', 256, 350);
  const medTex = new THREE.CanvasTexture(medCanvas);
  medTex.colorSpace = THREE.SRGBColorSpace;
  const medallion = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 40),
    new THREE.MeshLambertMaterial({ map: medTex }),
  );
  medallion.rotation.x = -Math.PI / 2;
  medallion.position.y = 1.44;
  boardGroup.add(medallion);

  const tileGeo = new THREE.BoxGeometry(3.7, 0.42, 3.7);
  const tiles = [];
  const half = (BOARD_SIDE - 1) / 2;
  const step = CONFIG.board.tileSize;

  function tileCell(index) {
    if (index <= 6) return { col: index, row: BOARD_SIDE - 1 };
    if (index <= 12) return { col: BOARD_SIDE - 1, row: BOARD_SIDE - 1 - (index - 6) };
    if (index <= 18) return { col: BOARD_SIDE - 1 - (index - 12), row: 0 };
    return { col: 0, row: index - 18 };
  }

  for (const cell of BOARD_TILES) {
    const style = TILE_STYLE[cell.type] || TILE_STYLE.start;
    const tex = tileTexture(style, cell.nameKo);
    const mats = [
      new THREE.MeshLambertMaterial({ color: '#2b2338' }),
      new THREE.MeshLambertMaterial({ color: '#2b2338' }),
      new THREE.MeshLambertMaterial({ map: tex }),
      new THREE.MeshLambertMaterial({ color: '#2b2338' }),
      new THREE.MeshLambertMaterial({ color: '#2b2338' }),
      new THREE.MeshLambertMaterial({ color: '#2b2338' }),
    ];
    const mesh = new THREE.Mesh(tileGeo, mats);
    const { col, row } = tileCell(cell.index);
    mesh.position.set((col - half) * step, 1.6, (row - half) * step);
    boardGroup.add(mesh);
    tiles.push(mesh);
  }

  const token = new THREE.Group();
  const tokenBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.9, 1.5, 8),
    new THREE.MeshLambertMaterial({ color: '#ff5d5d', emissive: '#8a1010', emissiveIntensity: 0.4, flatShading: true }),
  );
  tokenBody.position.y = 0.75;
  const tokenHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshLambertMaterial({ color: '#ffe0a3' }));
  tokenHead.position.y = 1.75;
  token.add(tokenBody, tokenHead);
  token.position.set(-half * step, 2, half * step);
  token.position.y = 1.95;
  boardGroup.add(token);

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
    boardToken: token,
    tileCell,
    baseHeight: BASE_HEIGHT,
    baseRadius: BASE_RADIUS,
  };
}
