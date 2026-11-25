// Entry point: wires config, systems, world and UI into one loop.
// State machine: base -> aim -> flight -> field / board, and back.

import * as THREE from '../vendor/three.module.js';
import { CONFIG, RARITY, DANGER_LABEL } from './Config/GameConfig.js';
import { BIOMES, biomeAt } from './Config/Biomes.js';
import { CREATURE_BY_ID } from './Config/Creatures.js';
import { BOARD_TILES } from './Config/BoardCells.js';
import { SaveSystem } from './Systems/SaveSystem.js';
import { EconomySystem } from './Systems/EconomySystem.js';
import { YardSystem } from './Systems/YardSystem.js';
import { PetSystem } from './Systems/PetSystem.js';
import { TamingSystem } from './Systems/TamingSystem.js';
import { createCreatureFactory } from './Systems/CreatureFactory.js';
import { buildWorld } from './Systems/WorldBuilder.js';
import { WildSystem } from './Systems/WildSystem.js';
import { PlayerController } from './Systems/PlayerController.js';
import { CannonSystem, returnCost } from './Systems/CannonSystem.js';
import { BoardSystem } from './Systems/BoardSystem.js';
import { UIManager } from './UI/UIManager.js';
import { Sfx } from './Systems/Sfx.js';

const LAUNCH_DIR = new THREE.Vector3(0, 0, -1);

class Game {
  constructor() {
    this.save = new SaveSystem(CONFIG.saveKey);
    this.state = this.save.load();
    this.setupState();

    this.economy = new EconomySystem(this.state);
    this.yard = new YardSystem(this.state);
    this.pets = new PetSystem(this.state);
    this.taming = new TamingSystem(this.state, this.pets);

    this.mode = 'base';
    this.aimMode = 'creature';
    this.loadUid = null;
    this.hp = CONFIG.field.baseHp;
    this.danger = 0;
    this.tripCaptures = [];
    this.tameCooldown = 0;
    this.gaugeRange = 0;
    this.pendingLaunch = null;
    this.yardVisuals = new Map();
    this.yardSignature = '';
    this.hudTimer = 0;
    this.saveTimer = 0;
    this.clock = new THREE.Clock();

    this.initThree();
    this.ui = new UIManager(this);
    this.ui.hideLoading();
    this.bindGlobal();
    this.syncYardVisual();
    this.ui.setMode('base');
    this.ui.setHint('화면을 드래그해 기지를 둘러보세요');
    this.refreshHud(true);
    this.announceReturn();
    this.showIntroOnce();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  showIntro() {
    this.ui.showModal({
      title: "Don't go far!",
      body: `
        <div style="line-height:1.7">
          <div><b>1.</b> <b>캐릭터 발사</b> — 크리처를 장전해 탄착점 주변을 자동 포획</div>
          <div><b>2.</b> <b>본인 발사</b> — 직접 날아가 테이밍. 멀수록 희귀하지만 위험!</div>
          <div><b>3.</b> 타이밍 게이지 <b>MAX</b> 구간에서 멈추면 최대 비거리</div>
          <div><b>4.</b> 마당에 배치한 크리처가 <b>화약</b>을 자동 생산 (골드 x2.5 / 다이아 x6)</div>
          <div><b>5.</b> 보드게임에서 주사위를 굴려 펫을 뽑고 능력치를 올리세요</div>
        </div>`,
      actions: [{ label: '닫기' }],
    });
  }

  showIntroOnce() {
    let seen = false;
    try { seen = localStorage.getItem('dont-go-far-intro') === '1'; } catch (err) { seen = true; }
    if (seen) return;
    try { localStorage.setItem('dont-go-far-intro', '1'); } catch (err) { /* private mode */ }
    this.ui.showModal({
      title: "Don't go far!",
      body: `
        <div style="line-height:1.7">
          <div><b>1.</b> <b>캐릭터 발사</b> — 크리처를 장전해 탄착점 주변을 자동 포획</div>
          <div><b>2.</b> <b>본인 발사</b> — 직접 날아가 테이밍. 멀수록 희귀하지만 위험!</div>
          <div><b>3.</b> 타이밍 게이지 <b>MAX</b> 구간에서 멈추면 최대 비거리</div>
          <div><b>4.</b> 마당에 배치한 크리처가 <b>화약</b>을 자동 생산 (골드 x2.5 / 다이아 x6)</div>
          <div><b>5.</b> 보드게임에서 주사위를 굴려 펫을 뽑고 능력치를 올리세요</div>
        </div>`,
      actions: [{ label: '출발!' }],
    });
  }

  // ---------------- state ----------------
  setupState() {
    const s = this.state;
    if (!s.stats) s.stats = { launches: 0, selfLaunches: 0, captures: 0, bestDistance: 0, boardRolls: 0, playSeconds: 0 };
    if (!Array.isArray(s.cards)) s.cards = [];
    if (!Array.isArray(s.yard)) s.yard = [];
    if (!s.seen) s.seen = {};
    if (!s.pets) s.pets = {};
    if (!Array.isArray(s.equipped)) s.equipped = [];
    if (typeof s.buffs !== 'number') s.buffs = 0;
    if (typeof s.pendingMutation !== 'number') s.pendingMutation = 0;
    if (typeof s.boardPos !== 'number') s.boardPos = 0;
    if (typeof s.frac !== 'number') s.frac = 0;
    s.yard = s.yard.filter((uid) => s.cards.some((c) => c.uid === uid));

    const fresh = !s.savedAt && s.cards.length === 0;
    if (fresh) {
      s.gunpowder = CONFIG.start.gunpowder;
      const species = CREATURE_BY_ID[CONFIG.start.starterCreature] || CREATURE_BY_ID.rabbit;
      const card = {
        uid: `start${Date.now().toString(36)}`,
        speciesId: species.id,
        mutation: 'normal',
        distance: 0,
        source: 'start',
        caughtAt: Date.now(),
      };
      s.cards.push(card);
      s.yard.push(card.uid);
      s.seen[species.id] = 1;
    }
  }

  offlineGain() {
    const last = this.state.savedAt || 0;
    if (!last) return 0;
    const seconds = Math.min((Date.now() - last) / 1000, CONFIG.income.offlineCapHours * 3600);
    if (seconds < 60) return 0;
    const rate = this.incomeRate();
    return Math.floor(rate * seconds * CONFIG.income.offlineRate);
  }

  announceReturn() {
    const gain = this.offlineGain();
    if (gain > 0) {
      this.economy.add(gain);
      this.ui.toast(`자리를 비운 동안 마당이 일했습니다: +${gain} 화약`, 'good');
    }
  }

  incomeRate() {
    const mult = 1 + this.pets.bonus('income') + this.state.buffs * 0.02;
    return this.yard.incomePerSecond(mult);
  }

  firepowerBonus() {
    return this.pets.bonus('firepower') + this.state.buffs * 0.01;
  }

  maxHp() {
    return CONFIG.field.baseHp + this.pets.bonus('hp');
  }

  // ---------------- three ----------------
  initThree() {
    this.canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camYaw = 0.5;
    this.camPitch = 0.3;
    this.camDist = 68;
    this.lookTarget = new THREE.Vector3(0, 5, -2);
    this.camera.position.set(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      5 + Math.sin(this.camPitch) * this.camDist,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
    );
    this.camera.lookAt(this.lookTarget);

    this.factory = createCreatureFactory();
    this.world = buildWorld(this.scene, this.factory);

    this.player = new PlayerController(this.scene);
    this.player.teleport(this.world.basePos.x, this.world.baseHeight + 0.02, this.world.basePos.z);
    this.player.group.rotation.y = Math.PI;

    this.wild = new WildSystem(this.scene, this.factory);
    this.wild.tamer = this.taming;
    this.wild.spawn(18, this.world.basePos);
    this.wild.REJECT_RADIUS = 28;

    this.cannon = new CannonSystem(this.world, this.scene);
    this.board = new BoardSystem(this.world);
    this.board.setPosition(this.state.boardPos || 0);
    this.board.onLanding = (cell) => this.onBoardLanding(cell);

    this.bindCameraDrag();
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  bindGlobal() {
    window.addEventListener('beforeunload', () => this.saveNow());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveNow();
    });
  }

  bindCameraDrag() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId = null;
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', (e) => {
      if (this.mode === 'flight') return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try { canvas.setPointerCapture?.(e.pointerId); } catch (err) { /* synthetic pointer */ }
      Sfx.unlock();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.camYaw -= dx * 0.006;
      if (this.mode === 'base' || this.mode === 'board') {
        this.camPitch = Math.max(0.22, Math.min(1.05, this.camPitch + dy * 0.004));
      }
    });

    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
      if (this.mode !== 'base') return;
      e.preventDefault();
      this.camDist = Math.max(34, Math.min(88, this.camDist + e.deltaY * 0.05));
    }, { passive: false });
  }

  // ---------------- loop ----------------
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.state.stats.playSeconds += dt;

    const rate = this.incomeRate();
    this.economy.tick(dt, rate);
    this.cannon.update(dt);
    this.board.update(dt);

    if (this.mode === 'field' || this.mode === 'field-return') {
      this.updateField(dt);
    } else {
      this.wild.update(dt, this.player.position, false);
    }

    if (this.mode !== 'flight' && this.mode !== 'field' && this.mode !== 'field-return') {
      this.player.update(dt, this.fieldMove, this.camYaw, this.moveSpeed());
    }

    if (this.mode === 'aim' && this.cannon.aiming) {
      const zone = { start: CONFIG.cannon.gaugeZoneStart, end: CONFIG.cannon.gaugeZoneEnd };
      this.ui.el.marker.style.left = `${Math.max(0, Math.min(1, this.cannon.gaugeValue)) * 100}%`;
      this.ui.el.zone.style.left = `${zone.start * 100}%`;
      this.ui.el.zone.style.width = `${(zone.end - zone.start) * 100}%`;
    }

    this.updateYard(dt);
    this.updateCamera(dt);

    this.hudTimer += dt;
    if (this.hudTimer > 0.15) {
      this.hudTimer = 0;
      this.refreshHud();
    }

    this.saveTimer += dt;
    if (this.saveTimer > 8) {
      this.saveTimer = 0;
      this.saveNow();
    }

    this.renderer.render(this.scene, this.camera);
  }

  moveSpeed() {
    return CONFIG.field.baseSpeed * (1 + this.pets.bonus('speed'));
  }

  // ---------------- camera ----------------
  updateCamera(dt) {
    const desired = new THREE.Vector3();
    const look = new THREE.Vector3();

    if (this.mode === 'board') {
      const c = CONFIG.board.center;
      const p = this.board.token?.position || new THREE.Vector3(c.x, 0, c.z);
      const follow = c.x + (p.x - c.x) * 0.02;
      const depth = c.z + (p.z - c.z) * 0.04;
      const wide = this.camera.aspect > 1.15;
      desired.set(follow, wide ? 38 : 57, depth + (wide ? 25 : 39));
      look.set(follow, wide ? -3 : 2, depth + 2);
      this.lookTarget.lerp(look, 1 - Math.exp(-9 * dt));
    } else if (this.mode === 'field' || this.mode === 'flight') {
      const p = this.cannon.flying && this.flightMesh ? this.flightMesh.position : this.player.position;
      const yaw = this.camYaw;
      const flight = this.mode === 'flight';
      const back = flight ? 28 : 25;
      const height = flight ? 17 : 15;
      desired.set(p.x + Math.sin(yaw) * back, p.y + height, p.z + Math.cos(yaw) * back);
      look.set(p.x, p.y + 1.4, p.z);
      this.lookTarget.lerp(look, 1 - Math.exp(-9 * dt));
    } else if (this.mode === 'aim') {
      const yaw = this.camYaw;
      const d = 30;
      desired.set(-2 + Math.sin(yaw) * d * 0.35, 24, 8 + Math.cos(yaw) * d * 0.75);
      look.set(-1, 5, -10);
      this.lookTarget.lerp(look, 1 - Math.exp(-6 * dt));
    } else {
      const yaw = this.camYaw;
      const r = this.camDist;
      const pitch = this.camPitch;
      desired.set(
        Math.sin(yaw) * Math.cos(pitch) * r,
        5 + Math.sin(pitch) * r,
        Math.cos(yaw) * Math.cos(pitch) * r,
      );
      look.set(0, 5, -2);
      this.lookTarget.lerp(look, 1 - Math.exp(-6 * dt));
    }

    if (this.snapCamera) {
      this.snapCamera = false;
      this.camera.position.copy(desired);
      this.lookTarget.copy(look);
    }
    const k = 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(desired, k);
    this.camera.lookAt(this.lookTarget);

    if (this.world.updateSun) {
      const focus = this.mode === 'board' ? this.board.token.position : this.lookTarget;
      this.world.updateSun(focus, performance.now() / 1000);
    }
  }

  // ---------------- yard visuals ----------------
  syncYardVisual() {
    const sig = this.state.yard.join(',');
    if (sig === this.yardSignature) return;
    this.yardSignature = sig;
    for (const [uid, group] of this.yardVisuals) {
      if (!this.state.yard.includes(uid)) {
        this.scene.remove(group);
        this.yardVisuals.delete(uid);
      }
    }
    this.state.yard.forEach((uid, i) => {
      if (this.yardVisuals.has(uid)) return;
      const card = this.yard.cardById(uid);
      const pad = this.world.yardPads[i];
      if (!card || !pad) return;
      const species = CREATURE_BY_ID[card.speciesId];
      if (!species) return;
      const group = this.factory.build(species, card.mutation);
      group.position.copy(pad.position);
      group.position.y = this.world.baseHeight + 0.3;
      group.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(group);
      this.yardVisuals.set(uid, group);
    });
  }

  updateYard(dt) {
    this.syncYardVisual();
    let i = 0;
    for (const [, group] of this.yardVisuals) {
      group.rotation.y += dt * 0.35;
      group.position.y = this.world.baseHeight + 0.3 + Math.sin(performance.now() / 600 + i) * 0.07;
      i += 1;
    }
  }

  // ---------------- aim / fire ----------------
  openAim(mode) {
    if (this.mode !== 'base') return;
    if (mode === 'creature' && this.state.cards.length === 0) {
      this.ui.toast('장전할 크리처가 없어요. 본인 발사로 먼저 잡아오세요!', 'bad');
      return;
    }
    this.aimMode = mode;
    this.mode = 'aim';
    const gp = Math.min(CONFIG.cannon.defaultGunpowder, Math.max(CONFIG.cannon.minGunpowder, Math.floor(this.state.gunpowder)));
    this.ui.el.slider.value = gp;
    this.gunpowderChoice = gp;
    this.cannon.startAim(gp);
    this.loadUid = mode === 'creature' ? (this.state.yard[0] || this.state.cards[0].uid) : null;
    this.ui.setMode('aim');
    this.ui.aimTitle(mode);
    this.ui.renderLoadChips(this.loadUid);
    this.updateAimUi();
  }

  onGunpowderSlider(value) {
    this.gunpowderChoice = value;
    this.cannon.startAim(value);
    this.updateAimUi();
  }

  setLoadCard(uid) {
    this.loadUid = uid;
    this.ui.renderLoadChips(uid);
  }

  updateAimUi() {
    const gp = this.gunpowderChoice || CONFIG.cannon.defaultGunpowder;
    const range = this.cannon.rangeFor(gp, 1, this.firepowerBonus());
    let risk = null;
    if (this.aimMode === 'creature') {
      const pct = Math.min(CONFIG.cannon.creatureEscapeCap, Math.max(0, range - 60) * CONFIG.cannon.creatureEscapePerMeter);
      risk = `${Math.round(pct * 100)}%`;
    }
    this.ui.updateAim({ gunpowder: gp, range, gaugeValue: this.cannon.gaugeValue, risk });
    const fireBtn = document.getElementById('btn-fire');
    if (fireBtn) {
      const afford = this.state.gunpowder >= gp;
      fireBtn.disabled = !afford;
      fireBtn.textContent = afford ? '발사!' : '화약 부족';
    }
    const slider = this.ui.el.slider;
    const pct = ((gp - CONFIG.cannon.minGunpowder) / (CONFIG.cannon.maxGunpowder - CONFIG.cannon.minGunpowder)) * 100;
    slider.style.background = `linear-gradient(90deg, #ff9d1f ${pct}%, #ffe6b0 ${pct}%)`;
  }

  cancelAim() {
    this.cannon.stopAim();
    this.mode = 'base';
    this.ui.setMode('base');
  }

  fire() {
    if (this.mode !== 'aim') return;
    const gp = this.gunpowderChoice || CONFIG.cannon.defaultGunpowder;
    if (!this.economy.spend(gp)) {
      this.ui.toast('화약이 부족합니다', 'bad');
      return;
    }
    const acc = this.cannon.judge();
    const range = this.cannon.rangeFor(gp, acc.mult, this.firepowerBonus());
    this.cannon.stopAim();

    const from = new THREE.Vector3();
    this.world.muzzleTip.getWorldPosition(from);

    const distance = Math.min(range, 248);
    const target = new THREE.Vector3(0, 0, -distance);

    this.state.stats.launches += 1;
    if (this.aimMode === 'self') this.state.stats.selfLaunches += 1;
    this.state.stats.bestDistance = Math.max(this.state.stats.bestDistance, Math.round(distance));

    let mesh;
    if (this.aimMode === 'self') {
      mesh = this.player.group;
      this.player.group.visible = true;
      this.hp = this.maxHp();
      this.danger = 0;
      this.tripCaptures = [];
    } else {
      const card = this.yard.cardById(this.loadUid) || this.state.cards[0];
      const species = CREATURE_BY_ID[card.speciesId];
      mesh = this.factory.build(species, card.mutation);
      this.scene.add(mesh);
    }

    this.flightMesh = mesh;
    this.mode = 'flight';
    this.ui.setMode('flight');
    Sfx.fire();

    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.5;pointer-events:none;z-index:90;transition:opacity .25s';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 30);

    this.pendingLaunch = { distance, acc, gp, mesh, target };
    this.flightDistance = distance;
    this.cannon.launch({
      mesh,
      from,
      to: target,
      range: distance,
      spin: this.aimMode === 'creature',
      onDone: () => this.onLanding(),
    });
    this.ui.toast(`${acc.label}! ${Math.round(distance)}m 지점으로 발사`, acc.tier === 'perfect' ? 'gold' : '');
  }

  onLanding() {
    Sfx.land();
    const { distance, acc } = this.pendingLaunch;
    if (this.aimMode === 'self') {
      this.arriveField(distance);
    } else {
      this.resolveAutoTame(distance, acc);
    }
  }

  arriveField(distance) {
    const land = new THREE.Vector3(0, 0, -distance);
    this.player.teleport(land.x, 0.02, land.z);
    this.player.setVisible(true);
    this.cannon.flight = null;
    this.mode = 'field';
    this.fieldMove = { x: 0, z: 0 };
    this.danger = 8;
    this.ui.setMode('field');
    const biome = biomeAt(distance);
    this.ui.toast(`${biome.nameKo} 도착! 주변 크리처를 테이밍하세요`, '');
    this.updateFieldUi();
    this.updateZoneUi();
  }

  resolveAutoTame(distance, acc) {
    const landing = new THREE.Vector3(0, 0, -distance);
    const radius = CONFIG.cannon.autoTameRadius;
    const caught = [];
    // the landing patch is inhabited even if the player has never been there
    this.wild.populateAround(landing, 10, 4, 22);
    const pool = this.wild.creatures.filter((c) => c.alive && c.pos.distanceTo(landing) <= radius);
    for (const creature of pool) {
      if (caught.length >= CONFIG.cannon.maxAutoCaptures) break;
      const chance = Math.min(0.95, Math.max(0.14, this.taming.chance(creature.species.id, distance) * 0.7));
      if (Math.random() < chance) {
        const card = this.taming.capture(creature.species.id, { distance, source: 'auto' });
        this.wild.capture(creature);
        caught.push(card);
        this.tripCaptures.push(card.uid);
      }
    }

    // loaded creature can run off on a long shot
    const card = this.yard.cardById(this.loadUid);
    let escaped = false;
    if (card && this.state.cards.length > 1) {
      const escapeChance = Math.min(CONFIG.cannon.creatureEscapeCap, Math.max(0, distance - 60) * CONFIG.cannon.creatureEscapePerMeter);
      if (Math.random() < escapeChance) {
        escaped = true;
        const idx = this.state.cards.findIndex((c) => c.uid === card.uid);
        if (idx >= 0) this.state.cards.splice(idx, 1);
        this.yard.remove(card.uid);
        this.yardSignature = '';
        this.syncYardVisual();
      }
    }

    if (caught.length) {
      this.yard.autoFill();
      this.yardSignature = '';
      this.syncYardVisual();
    }
    this.showLaunchResult({ distance, caught, escaped, card });
    this.cannon.launch({
      mesh: this.pendingLaunch.mesh,
      from: landing,
      to: this.world.basePos.clone(),
      range: distance,
      spin: true,
      onDone: () => {
        if (this.pendingLaunch?.mesh && this.pendingLaunch.mesh !== this.player.group) {
          this.scene.remove(this.pendingLaunch.mesh);
        }
        this.flightMesh = null;
        this.mode = 'base';
        this.ui.setMode('base');
      },
    });
  }

  showLaunchResult({ distance, caught, escaped, card }) {
    const rows = [];
    for (const c of caught) {
      const sp = CREATURE_BY_ID[c.speciesId];
      const mut = c.mutation === 'normal' ? '' : ` · ${c.mutation === 'gold' ? '골드' : '다이아'}`;
      rows.push(`<div class="result-item"><span class="sw" style="background:${sp.bodyHex}"></span>${sp.nameKo} (${RARITY[sp.rarity].nameKo}${mut})</div>`);
    }
    let body = `<div><b>${Math.round(distance)}m</b> 지점 자동 포획 결과</div>`;
    if (rows.length) body += `<div class="result-list">${rows.join('')}</div>`;
    else body += '<div style="margin-top:8px">아무도 잡지 못했습니다. 더 멀리 쏘면 희귀한 크리처가 기다립니다.</div>';
    if (escaped) body += `<div style="margin-top:8px;color:#d02b2b;font-weight:900">장전한 크리처가 도망쳤습니다! (너무 멀리 갔어요)</div>`;
    this.ui.showModal({ title: caught.length ? '자동 테이밍 성공!' : '자동 테이밍 실패', body, actions: [{ label: '확인' }] });
  }

  // ---------------- field ----------------
  get playerDistance() {
    return Math.hypot(this.player.position.x, this.player.position.z);
  }

  updateField(dt) {
    const move = this.ui.joystick.value;
    this.fieldMove = { x: move.x, z: move.z };
    this.player.update(dt, this.fieldMove, this.camYaw, this.moveSpeed());
    const p = this.player.position;
    const dist = Math.hypot(p.x, p.z);
    const biome = biomeAt(dist);
    const resist = Math.min(0.6, this.pets.bonus('resist'));
    this.danger += biome.dangerPerSec * 0.6 * (1 - resist) * dt;

    // wild creatures bite when they catch you
    this.wild.update(dt, p, true);
    const near = this.wild.nearest(p, 3.2);
    if (near && near.state === 'chase') {
      this.hp -= 5.5 * dt;
      if (Math.random() < dt * 2) Sfx.hurt();
    }

    if (this.danger >= CONFIG.field.dangerMax) {
      this.danger = 35;
      this.hp -= CONFIG.field.dangerRaidDamage;
      Sfx.hurt();
      this.ui.toast('야생의 역습! 체력을 잃었습니다', 'bad');
    }

    if (this.hp <= 0) {
      this.faint();
      return;
    }

    if (dist < 20 && this.mode === 'field') {
      this.ui.toast('기지로 무사히 돌아왔습니다', 'good');
      this.finishTrip(true);
      return;
    }

    this.tameCooldown = Math.max(0, this.tameCooldown - dt);
    this.updateFieldUi();
    this.updateZoneUi();
  }

  updateFieldUi() {
    this.ui.updateField(this.hp, this.maxHp(), this.danger);
    const cost = returnCost(this.playerDistance);
    this.ui.updateReturnButton(cost, this.state.gunpowder >= cost);
    const target = this.wild.nearest(this.player.position, CONFIG.field.tameRadius);
    this.wild.highlight(target);
    if (this.tameCooldown > 0) this.ui.updateTameButton(false, '준비 중');
    else if (target) this.ui.updateTameButton(true, `${target.species.nameKo} 발견`);
    else this.ui.updateTameButton(false, '주변 탐색');
  }

  updateZoneUi() {
    const dist = this.mode === 'flight' && this.flightDistance ? this.flightDistance : this.playerDistance;
    const biome = biomeAt(dist);
    const idx = Math.max(0, Math.min(DANGER_LABEL.length - 1, BIOMES.findIndex((b) => b.id === biome.id)));
    const risk = DANGER_LABEL[idx];
    this.ui.updateZone(biome.nameKo, dist, risk.text, risk.color);
  }

  tame() {
    if (this.mode !== 'field' || this.tameCooldown > 0) return;
    const nearest = this.wild.nearest(this.player.position, CONFIG.field.tameRadius);
    if (!nearest) {
      this.ui.toast('주변에 테이밍할 크리처가 없습니다', '');
      return;
    }
    this.tameCooldown = CONFIG.field.tameCooldownMs / 1000;
    const species = nearest.species;
    const chance = this.taming.chance(species.id, this.playerDistance);
    if (Math.random() < chance) {
      const card = this.taming.capture(species.id, { distance: this.playerDistance, source: 'field' });
      this.wild.capture(nearest);
      this.tripCaptures.push(card.uid);
      Sfx.tame();
      const mut = card.mutation === 'normal' ? '' : card.mutation === 'gold' ? ' 골드!' : ' 다이아!!';
      this.ui.toast(`${species.nameKo} 테이밍 성공!${mut}`, card.mutation === 'normal' ? 'good' : 'gold');
      if (card.mutation !== 'normal') Sfx.reward();
    } else {
      Sfx.fail();
      nearest.state = 'chase';
      this.hp -= 6;
      this.ui.toast(`${species.nameKo} 테이밍 실패… 반격당했다!`, 'bad');
    }
    this.updateFieldUi();
  }

  returnHome() {
    if (this.mode !== 'field') return;
    const cost = returnCost(this.playerDistance);
    if (!this.economy.spend(cost)) {
      this.ui.toast(`귀환에는 화약 ${cost}이 필요합니다`, 'bad');
      return;
    }
    this.finishTrip(true, true);
  }

  finishTrip(heal, showSummary = false) {
    const captured = this.tripCaptures.length;
    if (showSummary && captured > 0) {
      this.ui.toast(`${captured}마리와 함께 귀환!`, 'good');
    }
    this.tripCaptures = [];
    this.danger = 0;
    this.hp = this.maxHp();
    this.mode = 'base';
    this.fieldMove = { x: 0, z: 0 };
    this.wild.highlight(null);
    this.wild.update(0.001, this.world.basePos, false);
    this.player.teleport(this.world.basePos.x, this.world.baseHeight + 0.02, this.world.basePos.z);
    this.player.group.rotation.y = Math.PI;
    this.ui.setMode('base');
    this.yard.autoFill();
    this.yardSignature = '';
    this.syncYardVisual();
    this.refreshHud(true);
    this.saveNow();
  }

  faint() {
    const lost = Math.ceil(this.tripCaptures.length / 2);
    const lostUids = this.tripCaptures.slice(0, lost);
    for (const uid of lostUids) {
      const idx = this.state.cards.findIndex((c) => c.uid === uid);
      if (idx >= 0) this.state.cards.splice(idx, 1);
      this.yard.remove(uid);
    }
    this.tripCaptures = [];
    this.ui.showModal({
      title: '기절했다…',
      body: `<div>너무 멀리 갔습니다. 기지로 끌려왔고, 이번 탐험에서 잡은 크리처 <span class="em">${lost}마리</span>를 잃었어요.</div>`,
      actions: [{ label: '다시 도전' }],
    });
    this.finishTrip(false);
  }

  // ---------------- board ----------------
  enterBoard() {
    if (this.mode !== 'base') return;
    this.mode = 'board';
    this.snapCamera = true;
    this.ui.setMode('board');
    this.updateBoardInfo();
  }

  leaveBoard() {
    this.mode = 'base';
    this.ui.setMode('base');
  }

  updateBoardInfo() {
    const cell = BOARD_TILES[this.board.position];
    if (!cell) return;
    this.ui.setBoardInfo(`현재 칸: <b>${cell.nameKo}</b> · ${cell.descKo}`);
  }

  rollDice() {
    if (this.mode !== 'board' || this.board.busy) return;
    Sfx.dice();
    this.ui.setDiceEnabled(false);
    const n = this.board.rollDice();
    this.state.stats.boardRolls += 1;
    this.ui.showDice(n);
    this.ui.setBoardInfo(`주사위 <b>${n}</b> … 이동 중!`);
  }

  onBoardLanding(cell) {
    this.state.boardPos = this.board.position;
    const state = this.state;
    const bag = {
      gunpowder: state.gunpowder,
      buffPoints: state.buffs,
      pendingMutation: state.pendingMutation,
      position: this.board.position,
    };
    const effect = this.board.game.resolve(cell, bag);
    let message = effect.message;

    switch (effect.kind) {
      case 'gunpowder':
      case 'jackpot':
        this.economy.add(effect.gunpowder);
        Sfx.reward();
        break;
      case 'risk':
        this.economy.spend(Math.min(state.gunpowder, cell.value));
        Sfx.fail();
        break;
      case 'buff':
        state.buffs += effect.buffPoints;
        Sfx.reward();
        break;
      case 'mutation':
        state.pendingMutation += effect.captures;
        Sfx.reward();
        break;
      case 'egg':
        if (state.gunpowder >= cell.cost) {
          this.economy.spend(cell.cost);
          this.openEgg();
        } else {
          message = `화약이 부족해 알을 살 수 없습니다 (필요 ${cell.cost})`;
          this.ui.toast(message, 'bad');
        }
        break;
      case 'chance':
        message = this.applyChance(effect);
        break;
      case 'start':
        this.economy.add(10);
        Sfx.reward();
        break;
      default:
        break;
    }

    if (effect.kind !== 'egg' && effect.kind !== 'chance') this.ui.toast(message, effect.kind === 'risk' ? 'bad' : 'good');
    this.ui.setDiceEnabled(true);
    this.updateBoardInfo();
    this.board.setPosition(this.board.position);
    this.refreshHud(true);
    this.saveNow();
  }

  applyChance(effect) {
    const sub = effect.effect;
    const n = BOARD_TILES.length;
    switch (sub.type) {
      case 'gain':
        this.economy.add(sub.amount);
        Sfx.reward();
        this.ui.toast(effect.message, 'good');
        break;
      case 'lose':
        this.economy.spend(Math.min(this.state.gunpowder, sub.amount));
        Sfx.fail();
        this.ui.toast(effect.message, 'bad');
        break;
      case 'teleport': {
        const target = ((this.board.position + sub.amount) % n + n) % n;
        this.board.setPosition(target);
        this.board.game.jumpTo(target);
        this.ui.toast(effect.message, '');
        break;
      }
      case 'freeEgg':
        this.ui.toast(effect.message, 'gold');
        this.openEgg(true);
        break;
      default:
        this.ui.toast(effect.message, '');
        break;
    }
    return effect.message;
  }

  openEgg(free = false) {
    const pet = this.pets.rollEgg();
    const result = this.pets.grant(pet, this.economy);
    const rar = RARITY[pet.rarity] || RARITY.common;
    Sfx.egg();
    const body = result.duplicate
      ? `<div><b>${pet.nameKo}</b> (${rar.nameKo}) 는 이미 있어요.</div><div style="margin-top:6px">대신 <span class="em">+${result.gunpowder} 화약</span>으로 바꿨습니다.</div>`
      : `<div><b>${pet.nameKo}</b> <span style="color:${rar.colorHex};font-weight:900">(${rar.nameKo})</span></div>
         <div style="margin-top:6px">${pet.descKo}</div>
         <div style="margin-top:6px">자동으로 장착 슬롯에 넣었습니다!</div>`;
    this.ui.showModal({
      title: free ? '무료 알에서 펫 획득!' : '펫 알 결과',
      body,
      actions: [{ label: '확인' }],
    });
    this.refreshHud(true);
  }

  // ---------------- card actions ----------------
  placeCard(uid) {
    if (!this.yard.place(uid)) {
      this.ui.toast('마당 슬롯이 부족합니다. 슬롯을 확장하거나 크리처를 판매하세요', 'bad');
    }
    this.yardSignature = '';
    this.syncYardVisual();
    this.refreshHud(true);
  }

  unplaceCard(uid) {
    this.yard.remove(uid);
    this.yardSignature = '';
    this.syncYardVisual();
    this.refreshHud(true);
  }

  sellCard(uid) {
    const card = this.yard.cardById(uid);
    if (!card) return;
    const price = this.yard.sellPrice(card);
    this.yard.remove(uid);
    const idx = this.state.cards.findIndex((c) => c.uid === uid);
    if (idx >= 0) this.state.cards.splice(idx, 1);
    this.economy.add(price);
    this.yardSignature = '';
    this.syncYardVisual();
    this.ui.toast(`판매 완료 +${price} 화약`, 'good');
    this.refreshHud(true);
  }

  buySlot() {
    if (this.yard.buySlot(this.economy)) {
      this.ui.toast(`마당 슬롯 확장! (${this.yard.capacity}칸)`, 'good');
      this.refreshHud(true);
    } else {
      this.ui.toast('화약이 부족하거나 최대 슬롯입니다', 'bad');
    }
  }

  // ---------------- HUD ----------------
  refreshHud(force = false) {
    const rate = this.incomeRate();
    this.ui.updateGunpowder(this.state.gunpowder, rate);
    if (this.mode === 'aim') this.updateAimUi();
    if (this.mode === 'field') this.updateFieldUi();
    if (force) this.updateZoneUi();
  }

  saveNow() {
    this.state.savedAt = Date.now();
    this.state.boardPos = this.board.position;
    this.save.save(this.state);
  }
}

function boot() {
  try {
    const game = new Game();
    window.__game = game;
    window.__ready = true;
  } catch (err) {
    console.error('[boot] failed', err);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `<div style="max-width:80vw;text-align:center">게임을 시작할 수 없습니다.<br/><small>${String(err && err.message ? err.message : err)}</small></div>`;
    }
    window.__bootError = String(err && err.stack ? err.stack : err);
  }
}

boot();
