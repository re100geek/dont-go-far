// All DOM: HUD, aim panel, field controls, board bar, sheets and modals.

import { CONFIG, RARITY } from '../Config/GameConfig.js';
import { CREATURES, CREATURE_BY_ID } from '../Config/Creatures.js';
import { MUTATION_BY_ID } from '../Config/Mutations.js';
import { PETS, PET_BY_ID, PET_STATS } from '../Config/Pets.js';
import { BIOMES } from '../Config/Biomes.js';
import { Joystick } from './Joystick.js';
import { Sfx } from '../Systems/Sfx.js';

const $ = (id) => document.getElementById(id);

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 100000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 10 ? n.toFixed(1) : `${Math.floor(n)}`;
}

function mutationLabel(id) {
  const m = MUTATION_BY_ID[id] || MUTATION_BY_ID.normal;
  return m;
}

export class UIManager {
  constructor(game) {
    this.game = game;
    this.el = {
      gp: $('gp-value'),
      rate: $('gp-rate'),
      zoneChip: $('zone-chip'),
      zoneName: $('zone-name'),
      zoneDist: $('zone-dist'),
      zoneRisk: $('zone-risk'),
      basePanel: $('base-panel'),
      hint: $('hint'),
      aimPanel: $('aim-panel'),
      aimTitle: $('aim-title'),
      aimSub: $('aim-sub'),
      loadRow: $('load-row'),
      slider: $('gp-slider'),
      gpLabel: $('gp-value-label'),
      zone: $('gauge-zone'),
      marker: $('gauge-marker'),
      gaugeHint: $('gauge-hint'),
      fieldControls: $('field-controls'),
      hpFill: $('hp-fill'),
      hpLabel: $('hp-label'),
      dangerFill: $('danger-fill'),
      dangerLabel: $('danger-label'),
      tameBtn: $('btn-tame'),
      tameSub: $('tame-sub'),
      returnBtn: $('btn-return'),
      boardPanel: $('board-panel'),
      boardInfo: $('board-info'),
      dicePopup: $('dice-popup'),
      sheet: $('sheet'),
      sheetTitle: $('sheet-title'),
      sheetBody: $('sheet-body'),
      sheetTabs: $('sheet-tabs'),
      toasts: $('toast-layer'),
      modalLayer: $('modal-layer'),
      loading: $('loading'),
    };
    this.sheetTab = 'cards';
    this.joystick = new Joystick($('joystick'), $('joystick-knob'));
    this.mode = 'base';
    this.bind();
    const zone = this.el.zone;
    zone.style.left = `${CONFIG.cannon.gaugeZoneStart * 100}%`;
    zone.style.width = `${(CONFIG.cannon.gaugeZoneEnd - CONFIG.cannon.gaugeZoneStart) * 100}%`;
    this.el.slider.min = CONFIG.cannon.minGunpowder;
    this.el.slider.max = CONFIG.cannon.maxGunpowder;
    this.el.slider.step = CONFIG.cannon.stepGunpowder;
    this.el.slider.value = CONFIG.cannon.defaultGunpowder;
  }

  bind() {
    const g = this.game;
    const tap = (id, fn) => {
      const node = $(id);
      if (!node) return;
      node.addEventListener('click', (e) => {
        e.preventDefault();
        Sfx.unlock();
        fn(e);
      });
    };
    tap('btn-launch-creature', () => g.openAim('creature'));
    tap('btn-launch-self', () => g.openAim('self'));
    tap('btn-board', () => g.enterBoard());
    tap('btn-aim-cancel', () => g.cancelAim());
    tap('btn-fire', () => g.fire());
    tap('btn-tame', () => g.tame());
    tap('btn-return', () => g.returnHome());
    tap('btn-dice', () => g.rollDice());
    tap('btn-board-leave', () => g.leaveBoard());
    tap('btn-help', () => g.showIntro());
    tap('btn-collection', () => this.openSheet('cards'));
    tap('btn-pets', () => this.openSheet('pets'));
    tap('sheet-close', () => this.closeSheet());

    this.el.slider.addEventListener('input', () => {
      const v = Number(this.el.slider.value);
      this.el.gpLabel.textContent = `${v}`;
      g.onGunpowderSlider(v);
    });

    this.el.sheetTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      this.sheetTab = btn.dataset.tab;
      for (const b of this.el.sheetTabs.querySelectorAll('button')) b.classList.toggle('active', b === btn);
      this.renderSheet();
    });
  }

  // ---------------- modes ----------------
  setMode(mode) {
    this.mode = mode;
    this.el.basePanel.classList.toggle('hidden', mode !== 'base');
    this.el.aimPanel.classList.toggle('hidden', mode !== 'aim');
    this.el.fieldControls.classList.toggle('hidden', mode !== 'field');
    this.el.boardPanel.classList.toggle('hidden', mode !== 'board');
    this.el.zoneChip.classList.toggle('hidden', !(mode === 'field' || mode === 'flight'));
    this.el.hint.classList.toggle('hidden', mode !== 'base');
    if (mode !== 'field') this.joystick.reset();
  }

  setHint(text) {
    this.el.hint.textContent = text;
    this.el.hint.classList.remove('hidden');
  }

  // ---------------- HUD ----------------
  updateGunpowder(value, rate) {
    this.el.gp.textContent = fmt(value);
    this.el.rate.textContent = `+${rate.toFixed(1)}/s`;
  }

  updateZone(biomeName, distance, riskText, riskColor) {
    this.el.zoneName.textContent = biomeName;
    this.el.zoneDist.textContent = `${Math.round(distance)}m`;
    this.el.zoneRisk.textContent = riskText;
    this.el.zoneRisk.style.color = riskColor;
  }

  updateField(hp, maxHp, danger) {
    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    this.el.hpFill.style.width = `${hpPct}%`;
    this.el.hpLabel.textContent = `HP ${Math.max(0, Math.round(hp))} / ${Math.round(maxHp)}`;
    this.el.dangerFill.style.width = `${Math.min(100, danger)}%`;
    this.el.dangerLabel.textContent = `위험도 ${Math.round(danger)}%`;
  }

  updateAim({ gunpowder, range, gaugeValue, risk }) {
    this.el.gpLabel.textContent = `${gunpowder}`;
    this.el.marker.style.left = `${Math.max(0, Math.min(1, gaugeValue)) * 100}%`;
    const tail = risk ? ` · 장전 크리처 도주 ${risk}` : ' · 초록 구간에서 멈추면 최대 파워';
    this.el.gaugeHint.textContent = `화약 ${gunpowder} · 예상 비거리 ${Math.round(range)}m${tail}`;
  }

  updateTameButton(enabled, label) {
    this.el.tameBtn.disabled = !enabled;
    this.el.tameSub.textContent = label;
  }

  updateReturnButton(cost, affordable) {
    this.el.returnBtn.textContent = `귀환 · ${cost}`;
    this.el.returnBtn.style.opacity = affordable ? '1' : '0.55';
  }

  // ---------------- aim load chips ----------------
  renderLoadChips(selectedUid) {
    const state = this.game.state;
    const inYard = state.cards.filter((c) => state.yard.includes(c.uid));
    const rest = state.cards.filter((c) => !state.yard.includes(c.uid));
    const list = [...inYard, ...rest].slice(0, 14);
    this.el.loadRow.innerHTML = '';
    if (!list.length) {
      this.el.loadRow.innerHTML = '<div class="load-chip active">장전할 크리처 없음<small>본인 발사로 잡아오세요</small></div>';
      return;
    }
    for (const card of list) {
      const sp = CREATURE_BY_ID[card.speciesId];
      const mut = mutationLabel(card.mutation);
      const btn = document.createElement('button');
      btn.className = `load-chip${card.uid === selectedUid ? ' active' : ''}`;
      btn.innerHTML = `${sp.nameKo}<small>${mut.nameKo} · ${(RARITY[sp.rarity] || RARITY.common).nameKo}</small>`;
      btn.style.borderColor = card.uid === selectedUid ? '#ff9d1f' : 'transparent';
      btn.addEventListener('click', () => this.game.setLoadCard(card.uid));
      this.el.loadRow.appendChild(btn);
    }
  }

  aimTitle(mode) {
    this.el.aimTitle.textContent = mode === 'creature' ? '캐릭터 발사 · 자동 테이밍' : '본인 발사 · 직접 탐험';
    this.el.aimSub.textContent = mode === 'creature'
      ? '크리처를 장전해 탄착점 주변을 자동 포획'
      : '멀리 갈수록 희귀하지만 위험! 적당히 돌아오세요';
  }

  // ---------------- dice ----------------
  showDice(n) {
    const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const pop = this.el.dicePopup;
    pop.textContent = faces[n] || String(n);
    pop.classList.add('show');
    clearTimeout(this._diceTimer);
    this._diceTimer = setTimeout(() => pop.classList.remove('show'), 900);
  }

  setBoardInfo(html) {
    this.el.boardInfo.innerHTML = html;
  }

  setDiceEnabled(enabled) {
    const btn = document.getElementById('btn-dice');
    if (btn) btn.disabled = !enabled;
  }

  // ---------------- toasts ----------------
  toast(text, kind = '') {
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    node.textContent = text;
    this.el.toasts.appendChild(node);
    setTimeout(() => {
      node.style.transition = 'opacity 0.3s, transform 0.3s';
      node.style.opacity = '0';
      node.style.transform = 'translateY(-6px)';
      setTimeout(() => node.remove(), 320);
    }, 1700);
  }

  // ---------------- modal ----------------
  showModal({ title, body, actions = [{ label: '확인' }], onClose = null }) {
    const layer = this.el.modalLayer;
    layer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal';
    const h = document.createElement('h3');
    h.textContent = title;
    const b = document.createElement('div');
    b.className = 'body';
    if (typeof body === 'string') b.innerHTML = body;
    else b.appendChild(body);
    const row = document.createElement('div');
    row.className = 'actions';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.className = `big-btn ${act.style || 'primary'}`;
      btn.textContent = act.label;
      btn.addEventListener('click', () => {
        this.hideModal();
        if (act.onClick) act.onClick();
        else if (onClose) onClose();
      });
      row.appendChild(btn);
    }
    modal.append(h, b, row);
    layer.appendChild(modal);
    layer.classList.remove('hidden');
    this._modalOpen = true;
    document.getElementById('app')?.classList.add('ui-blocked');
  }

  hideModal() {
    this.el.modalLayer.classList.add('hidden');
    this.el.modalLayer.innerHTML = '';
    this._modalOpen = false;
    if (!this.sheetOpen) document.getElementById('app')?.classList.remove('ui-blocked');
  }

  get modalOpen() {
    return this._modalOpen === true;
  }

  // ---------------- sheets ----------------
  openSheet(tab = 'cards') {
    this.sheetTab = tab;
    for (const b of this.el.sheetTabs.querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.tab === tab);
    }
    this.el.sheetTitle.textContent = tab === 'dex' ? '도감' : tab === 'pets' ? '펫' : '보유 크리처';
    this.el.sheet.classList.remove('hidden');
    document.getElementById('app')?.classList.add('ui-blocked');
    this.renderSheet();
  }

  closeSheet() {
    this.el.sheet.classList.add('hidden');
    if (!this.modalOpen) document.getElementById('app')?.classList.remove('ui-blocked');
  }

  get sheetOpen() {
    return !this.el.sheet.classList.contains('hidden');
  }

  renderSheet() {
    const g = this.game;
    this.el.sheetTitle.textContent = this.sheetTab === 'dex' ? '도감' : this.sheetTab === 'pets' ? '펫' : '보유 크리처';
    if (this.sheetTab === 'cards') this.renderCards();
    else if (this.sheetTab === 'dex') this.renderDex();
    else this.renderPets();
  }

  renderCards() {
    const g = this.game;
    const body = this.el.sheetBody;
    const yard = g.yard;
    body.innerHTML = '';

    const headRow = document.createElement('div');
    headRow.className = 'card-row';
    headRow.innerHTML = `
      <div class="swatch" style="background:linear-gradient(#ffd777,#ff9d1f)"></div>
      <div class="card-main">
        <div class="card-name">마당 슬롯 ${yard.placed} / ${yard.capacity}</div>
        <div class="card-sub">수입 ${yard.incomePerSecond(1 + g.pets.bonus('income')).toFixed(1)} 화약/s · 배치된 크리처가 자동 생산</div>
      </div>`;
    if (yard.canBuySlot()) {
      const btn = document.createElement('button');
      btn.className = 'mini-btn';
      btn.textContent = `확장 ${yard.nextSlotCost()}`;
      btn.disabled = g.state.gunpowder < yard.nextSlotCost();
      btn.addEventListener('click', () => { g.buySlot(); this.renderCards(); });
      headRow.appendChild(btn);
    }
    body.appendChild(headRow);

    const cards = [...g.state.cards].sort((a, b) => {
      const oa = RARITY[CREATURE_BY_ID[a.speciesId]?.rarity]?.order ?? 0;
      const ob = RARITY[CREATURE_BY_ID[b.speciesId]?.rarity]?.order ?? 0;
      if (oa !== ob) return ob - oa;
      return yard.cardValue(b) - yard.cardValue(a);
    });

    if (!cards.length) {
      const empty = document.createElement('div');
      empty.className = 'card-row';
      empty.innerHTML = '<div class="card-main"><div class="card-name">아직 크리처가 없어요</div><div class="card-sub">대포를 쏴서 첫 크리처를 잡아보세요!</div></div>';
      body.appendChild(empty);
      return;
    }

    const title = document.createElement('div');
    title.className = 'section-title';
    title.innerHTML = `<span>보유 ${cards.length}마리</span><span>배치하면 초당 화약</span>`;
    body.appendChild(title);

    for (const card of cards) {
      const sp = CREATURE_BY_ID[card.speciesId];
      const rar = RARITY[sp.rarity] || RARITY.common;
      const mut = mutationLabel(card.mutation);
      const placed = yard.isPlaced(card.uid);
      const row = document.createElement('div');
      row.className = 'card-row';
      const color = mut.color || sp.bodyHex;
      row.innerHTML = `
        <div class="swatch" style="background:${color}"></div>
        <div class="card-main">
          <div class="card-name">${sp.nameKo}
            <span class="rarity" style="background:${rar.colorHex}">${rar.nameKo}</span>
            ${mut.id !== 'normal' ? `<span class="rarity" style="background:${mut.color}">${mut.nameKo} x${mut.mult}</span>` : ''}
          </div>
          <div class="card-sub">${sp.income.toFixed(2)} → ${yard.cardValue(card).toFixed(2)} 화약/s · ${placed ? '마당 근무 중' : '대기 중'}</div>
        </div>`;
      const placeBtn = document.createElement('button');
      placeBtn.className = `mini-btn${placed ? ' on' : ''}`;
      placeBtn.textContent = placed ? '회수' : '배치';
      placeBtn.addEventListener('click', () => {
        if (placed) g.unplaceCard(card.uid);
        else g.placeCard(card.uid);
        this.renderCards();
      });
      const sellBtn = document.createElement('button');
      sellBtn.className = 'mini-btn sell';
      sellBtn.textContent = `판매 ${yard.sellPrice(card)}`;
      sellBtn.addEventListener('click', () => {
        g.sellCard(card.uid);
        this.renderCards();
      });
      row.append(placeBtn, sellBtn);
      body.appendChild(row);
    }
  }

  renderDex() {
    const body = this.el.sheetBody;
    const seen = this.game.state.seen || {};
    const captured = this.game.state.cards.reduce((acc, c) => {
      const e = acc[c.speciesId] || { count: 0, best: 'normal' };
      e.count += 1;
      const order = { normal: 0, gold: 1, diamond: 2 };
      if (order[c.mutation] > order[e.best]) e.best = c.mutation;
      acc[c.speciesId] = e;
      return acc;
    }, {});
    body.innerHTML = '';
    const groups = ['common', 'rare', 'epic', 'legendary', 'mythic'];
    for (const rarityId of groups) {
      const list = CREATURES.filter((c) => c.rarity === rarityId);
      const title = document.createElement('div');
      title.className = 'section-title';
      title.innerHTML = `<span>${RARITY[rarityId].nameKo}</span><span>${list.filter((c) => captured[c.id]).length}/${list.length}</span>`;
      body.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'grid-3';
      for (const sp of list) {
        const info = captured[sp.id];
        const card = document.createElement('div');
        card.className = `dex-card${info ? '' : ' locked'}`;
        const mut = info ? mutationLabel(info.best) : null;
        card.innerHTML = `
          <div class="dot" style="background:${mut && mut.color ? mut.color : sp.bodyHex}"></div>
          <div class="nm">${info ? sp.nameKo : '???'}</div>
          <div class="cnt">${info ? `${info.count}마리` : sp.biomes.map((b) => BIOMES.find((x) => x.id === b)?.nameKo).join('·')}</div>
          ${mut && mut.id !== 'normal' ? `<div class="mut">${mut.nameKo}</div>` : ''}
        `;
        grid.appendChild(card);
      }
      body.appendChild(grid);
    }
  }

  renderPets() {
    const body = this.el.sheetBody;
    const g = this.game;
    const equipped = g.state.equipped;
    const bonuses = g.pets.summary();
    body.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'card-row';
    const parts = Object.entries(bonuses)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => PET_STATS[k].display(v));
    summary.innerHTML = `
      <div class="swatch" style="background:linear-gradient(#d6b6ff,#a86bff)"></div>
      <div class="card-main">
        <div class="card-name">장착 ${equipped.length} / ${CONFIG.pets.equipSlots}</div>
        <div class="card-sub">${parts.length ? parts.join(' · ') : '아직 능력치 보너스가 없어요'}</div>
      </div>`;
    body.appendChild(summary);

    const owned = g.pets.owned();
    const title = document.createElement('div');
    title.className = 'section-title';
    title.innerHTML = `<span>보유 펫 ${owned.length}</span><span>보드게임 알에서 획득</span>`;
    body.appendChild(title);

    if (!owned.length) {
      const empty = document.createElement('div');
      empty.className = 'card-row';
      empty.innerHTML = '<div class="card-main"><div class="card-name">펫이 없어요</div><div class="card-sub">보드게임에서 펫 알 칸에 멈추면 뽑을 수 있어요</div></div>';
      body.appendChild(empty);
    }

    for (const id of owned) {
      const pet = PET_BY_ID[id];
      if (!pet) continue;
      const rar = RARITY[pet.rarity] || RARITY.common;
      const isOn = g.pets.isEquipped(id);
      const row = document.createElement('div');
      row.className = 'card-row';
      row.innerHTML = `
        <div class="swatch" style="background:${rar.colorHex}"></div>
        <div class="card-main">
          <div class="card-name">${pet.nameKo}
            <span class="rarity" style="background:${rar.colorHex}">${rar.nameKo}</span>
            ${g.pets.count(id) > 1 ? `<span class="rarity" style="background:#7b8296">x${g.pets.count(id)}</span>` : ''}
          </div>
          <div class="card-sub">${PET_STATS[pet.stat].display(pet.value)} · ${pet.descKo}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = `mini-btn${isOn ? ' on' : ''}`;
      btn.textContent = isOn ? '해제' : '장착';
      btn.addEventListener('click', () => {
        if (isOn) g.pets.unequip(id);
        else g.pets.equip(id);
        this.renderPets();
      });
      row.appendChild(btn);
      body.appendChild(row);
    }
  }

  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  showLoading(text) {
    this.el.loading.classList.remove('hidden');
    const label = this.el.loading.querySelector('div:last-child');
    if (label) label.textContent = text;
  }
}
