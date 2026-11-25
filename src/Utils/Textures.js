// Procedural Roblox-style surface textures: stud plates, tile tops and glows.
// Everything is canvas-drawn once and cached, so a whole world costs a few textures.

import * as THREE from '../../vendor/three.module.js';

const textureCache = new Map();

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r + 255 * amount)},${clamp(g + 255 * amount)},${clamp(b + 255 * amount)})`;
}

/** One seamless stud-plate cell. The texture is neutral white so a material colour tints it. */
export function studTexture(opts = {}) {
  const size = opts.size || 128;
  const base = opts.base || '#ffffff';
  const stud = opts.stud || base;
  const grout = Math.max(0, Math.min(0.5, opts.grout == null ? 0.055 : opts.grout));
  const studRadius = Math.max(0, Math.min(0.5, opts.studRadius == null ? 0.3 : opts.studRadius));
  const lift = Math.max(0, Math.min(1, opts.shade == null ? 0.26 : opts.shade));
  const key = `stud|${size}|${base}|${stud}|${grout}|${studRadius}|${lift}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, tex);
    return tex;
  }

  const s = size;
  const g = Math.max(1, Math.round(s * grout));
  const r = s * studRadius;
  const cx = s / 2;
  const cy = s / 2;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  // soft plate bevel: light top-left rim, shaded bottom-right rim
  ctx.fillStyle = shade(base, lift);
  ctx.fillRect(g, g, s - g * 2, Math.max(1, g * 0.7));
  ctx.fillRect(g, g, Math.max(1, g * 0.7), s - g * 2);
  ctx.fillStyle = shade(base, -lift * 0.8);
  ctx.fillRect(g, s - g * 2, s - g * 2, Math.max(1, g * 0.7));
  ctx.fillRect(s - g * 2, g, Math.max(1, g * 0.7), s - g * 2);

  // grout seams around the cell
  ctx.fillStyle = shade(base, -0.34);
  ctx.fillRect(0, 0, s, g);
  ctx.fillRect(0, 0, g, s);
  ctx.fillRect(0, s - g, s, g);
  ctx.fillRect(s - g, 0, g, s);

  // stud drop shadow (light comes from the top-left)
  const shadow = ctx.createRadialGradient(cx + r * 0.28, cy + r * 0.34, r * 0.1, cx + r * 0.2, cy + r * 0.25, r * 1.25);
  shadow.addColorStop(0, 'rgba(0,0,0,0.22)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(cx + r * 0.2, cy + r * 0.24, r * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // stud body: vertical gradient plus a bright top-left cap
  const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  body.addColorStop(0, shade(stud, lift * 1.7));
  body.addColorStop(0.55, stud);
  body.addColorStop(1, shade(stud, -lift * 1.4));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = shade(stud, -lift * 1.5);
  ctx.lineWidth = Math.max(1.5, s * 0.014);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  const gloss = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.34, 0, cx - r * 0.3, cy - r * 0.32, r * 0.85);
  gloss.addColorStop(0, 'rgba(255,255,255,0.7)');
  gloss.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

/** Tinted stud material. repeat* is in stud cells. */
export function studdedMaterial(colorHex, repeatX = 1, repeatY = 1, opts = {}) {
  const tex = studTexture({ base: '#ffffff', stud: '#ffffff', ...opts }).clone();
  tex.needsUpdate = true;
  tex.repeat.set(repeatX, repeatY);
  return new THREE.MeshLambertMaterial({ color: colorHex, map: tex });
}

/** World-space UVs so a stud grid lines up across any shape. axis 'y' for XZ discs built in XY. */
export function planarUV(geometry, metersPerStud = 4, axis = 'z') {
  const pos = geometry.getAttribute('position');
  if (!pos) return geometry;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i);
    const b = axis === 'y' ? pos.getY(i) : pos.getZ(i);
    uv[i * 2] = a / metersPerStud;
    uv[i * 2 + 1] = b / metersPerStud;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Board tile top: candy plate, one stud, icon and a chunky label. */
export function tileTopTexture(style, label) {
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = style.color;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // bevel frame
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(0, 0, size, 10);
  ctx.fillRect(0, 0, 10, size);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, size - 10, size, 10);
  ctx.fillRect(size - 10, 0, 10, size);

  // outer dark outline
  ctx.strokeStyle = 'rgba(24,20,40,0.55)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // stud disc behind the icon
  const cx = size / 2;
  const cy = size * 0.42;
  const r = size * 0.23;
  const shadow = ctx.createRadialGradient(cx + 4, cy + 6, 2, cx + 3, cy + 5, r * 1.3);
  shadow.addColorStop(0, 'rgba(0,0,0,0.24)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, r * 1.25, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.72)');
  grad.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#20203a';
  ctx.font = 'bold 64px system-ui, "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.icon, cx, cy + 2);

  ctx.fillStyle = '#1d1b33';
  ctx.font = 'bold 24px system-ui, "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(String(label).slice(0, 5), cx, size * 0.8);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(16, 16, 26, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Billboards and screens: wooden sign face, board medallion. */
export function signTexture(lines, color = '#ffd24a', bg = '#3a2b1a') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, 0, 256, 12);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 182);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const step = 150 / Math.max(1, lines.length);
  lines.forEach((line, i) => {
    ctx.font = `bold ${i === 0 ? 44 : 30}px system-ui, "Apple SD Gothic Neo", sans-serif`;
    ctx.fillText(line, 128, 44 + step * i);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial glow sprite used for sun, lamps and token halos. */
export function glowSprite(colorHex, size = 4, opacity = 1) {
  const key = `glow|${colorHex}|${size}|${opacity}`;
  if (textureCache.has(key)) {
    const cached = textureCache.get(key);
    return new THREE.Sprite(cached.clone());
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  let tex;
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.35, colorHex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    textureCache.set(key, tex);
  }
  const mat = new THREE.SpriteMaterial({
    map: tex || null,
    color: tex ? '#ffffff' : colorHex,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}
