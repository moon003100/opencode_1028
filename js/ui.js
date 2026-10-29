/* ============================================================
   放置天地 · 單機版 — 介面
   ============================================================ */
'use strict';

let ui = {
  tab: null,
  bagFilter: 'all',
  bagSort: 'type',
  create: { classId: 'knight', gender: 'male', alloc: { str: 0, dex: 0, con: 0, int: 0, wis: 0 }, points: 6 },
  modal: null,
};

/* ---------------- 通用 ---------------- */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
}

function themeApply() {
  const th = (S && S.settings && S.settings.theme) || 'default';
  document.body.className = th === 'default' ? '' : 'theme-' + th;
}

/* ---------------- 音效 ---------------- */
let _ac = null;
function sfx(kind) {
  if (!S || !S.settings || !S.settings.sfx) return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = _ac.currentTime;
    const o = _ac.createOscillator();
    const g = _ac.createGain();
    o.connect(g); g.connect(_ac.destination);
    let f = 440, d = 0.06, type = 'square', vol = 0.03;
    if (kind === 'hit') { f = 220; type = 'square'; vol = 0.025; }
    else if (kind === 'skill') { f = 520; d = 0.16; type = 'sawtooth'; vol = 0.03; }
    else if (kind === 'loot') { f = 880; d = 0.1; type = 'sine'; vol = 0.035; }
    else if (kind === 'coin') { f = 1046; d = 0.07; type = 'triangle'; vol = 0.03; }
    else if (kind === 'level') { f = 660; d = 0.28; type = 'sine'; vol = 0.05; }
    else if (kind === 'die') { f = 110; d = 0.4; type = 'sawtooth'; vol = 0.04; }
    else if (kind === 'ui') { f = 500; d = 0.03; vol = 0.015; }
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (kind === 'level') o.frequency.linearRampToValueAtTime(f * 1.6, t + d);
    if (kind === 'die') o.frequency.linearRampToValueAtTime(60, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  } catch (e) { /* 忽略 */ }
}

/* ---------------- 標題 / 建立角色 ---------------- */
function initTitle() {
  if (hasSave()) {
    $('#btn-continue').classList.remove('hidden');
    $('#btn-new').classList.remove('hidden');
  } else {
    $('#btn-continue').classList.add('hidden');
  }
  $('#btn-continue').onclick = () => {
    if (loadGame()) { enterGame(); }
    else toast('存檔讀取失敗');
  };
  $('#btn-new').onclick = () => {
    const go = () => { resetCreate(); showScreen('create'); };
    if (hasSave()) modalConfirm('建立新角色', '這會覆蓋目前的存檔，確定要重新開始嗎？', go);
    else go();
  };
}

function resetCreate() {
  ui.create = { classId: 'knight', gender: 'male', alloc: { str: 0, dex: 0, con: 0, int: 0, wis: 0 }, points: 6 };
  $('#in-name').value = '';
  renderCreate();
}

function renderCreate() {
  const c = ui.create;
  // 職業卡
  $('#class-list').innerHTML = Object.keys(CLASSES).map(k => {
    const cls = CLASSES[k];
    return `<button class="class-card ${c.classId === k ? 'active' : ''}" data-class="${k}">
      <span class="cc-icon">${cls.icon}</span>
      <span class="cc-name">${cls.name}</span>
      <span class="cc-desc">${cls.desc}</span>
    </button>`;
  }).join('');

  // 屬性
  const base = CLASSES[c.classId].base;
  $('#stat-alloc').innerHTML = Object.keys(STAT_INFO).map(k => `
    <div class="stat-row">
      <span class="s-name">${STAT_INFO[k].name}</span>
      <span class="s-val">${base[k] + c.alloc[k]}</span>
      <span class="s-btns">
        <button data-minus="${k}">−</button>
        <button data-plus="${k}">＋</button>
      </span>
    </div>`).join('');
  $('#points-left').textContent = '剩餘 ' + c.points;

  // 預覽
  const tmp = {
    classId: c.classId, level: 1, rebirth: 0, points: {}, equip: {}, inv: [],
  };
  Object.keys(base).forEach(k => { tmp.points[k] = base[k] + c.alloc[k]; });
  const st = derive(tmp);
  $('#create-preview').innerHTML = `
    <div>生命 <b>${st.maxHp}</b>　魔力 <b>${st.maxMp}</b></div>
    <div>攻擊 <b>${st.atk}</b>　防禦 <b>${st.ac}</b>　魔防 <b>${st.mr}</b>　爆擊 <b>${st.crit}%</b></div>
    <div>技能 <b>${st.skill.icon} ${st.skill.name}</b>（${st.skill.desc}）</div>`;

  $$('#gender-seg button').forEach(b => b.classList.toggle('active', b.dataset.g === c.gender));
}

function refreshCreateValues() {
  const c = ui.create;
  const base = CLASSES[c.classId].base;
  const rows = $$('#stat-alloc .stat-row');
  Object.keys(STAT_INFO).forEach((k, i) => {
    if (rows[i]) rows[i].querySelector('.s-val').textContent = base[k] + c.alloc[k];
  });
  $('#points-left').textContent = '剩餘 ' + c.points;

  const tmp = { classId: c.classId, level: 1, rebirth: 0, points: {}, equip: {}, inv: [] };
  Object.keys(base).forEach(k => { tmp.points[k] = base[k] + c.alloc[k]; });
  const st = derive(tmp);
  $('#create-preview').innerHTML = `
    <div>生命 <b>${st.maxHp}</b>　魔力 <b>${st.maxMp}</b></div>
    <div>攻擊 <b>${st.atk}</b>　防禦 <b>${st.ac}</b>　魔防 <b>${st.mr}</b>　爆擊 <b>${st.crit}%</b></div>
    <div>技能 <b>${st.skill.icon} ${st.skill.name}</b>（${st.skill.desc}）</div>`;
}

function bindCreate() {
  $('#class-list').addEventListener('click', e => {
    const b = e.target.closest('[data-class]');
    if (!b) return;
    // 換職業時重設配點
    ui.create.classId = b.dataset.class;
    ui.create.alloc = { str: 0, dex: 0, con: 0, int: 0, wis: 0 };
    ui.create.points = 6;
    sfx('ui');
    renderCreate();
  });
  $('#stat-alloc').addEventListener('click', e => {
    const plus = e.target.closest('[data-plus]');
    const minus = e.target.closest('[data-minus]');
    if (plus) {
      if (ui.create.points <= 0) return;
      ui.create.alloc[plus.dataset.plus]++;
      ui.create.points--;
    } else if (minus) {
      const k = minus.dataset.minus;
      if (ui.create.alloc[k] <= 0) return;
      ui.create.alloc[k]--;
      ui.create.points++;
    } else return;
    sfx('ui');
    refreshCreateValues();
  });
  $('#gender-seg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    ui.create.gender = b.dataset.g;
    renderCreate();
  });
  $('#btn-create').onclick = () => {
    const name = ($('#in-name').value || '').trim();
    if (name.length < 1) return toast('請輸入角色名稱');
    if (ui.create.points > 0) return toast(`還有 ${ui.create.points} 點屬性未分配`);
    startNewGame({
      name, classId: ui.create.classId, gender: ui.create.gender,
      alloc: ui.create.alloc,
    });
    enterGame();
    toast('歡迎來到放置天地！');
  };
}

/* ---------------- 進入遊戲 ---------------- */
function enterGame() {
  themeApply();
  showScreen('game');
  ui.tab = null;
  closePanel();
  ensureMonster();
  renderStaticHud();
  uiRenderLog();
  uiRenderMonster();
  uiSyncHud();
  startLoop();
  const rep = offlineReport();
  if (rep) showOffline(rep);
}

function ensureMonster() {
  const p = S.player;
  if (!p.mon) spawnMonster(p);
}

function renderStaticHud() {
  const p = S.player;
  const c = CLASSES[p.classId];
  $('#hud-class').textContent = c.icon;
  $('#hud-name').textContent = p.name;
  $('#h-emoji').textContent = p.classId === 'wizard' ? '🧙' : (p.classId === 'elf' ? '🧝' : (p.classId === 'darkelf' ? '🥷' : '🛡️'));
  $('#h-name').textContent = p.name;
  $('#map-name').textContent = currentMap(p).icon + ' ' + currentMap(p).name;
}

function uiSyncHud() {
  if (!S || !S.player) return;
  const p = S.player;
  const st = derive(p);
  p.hp = Math.min(p.hp, st.maxHp);
  p.mp = Math.min(p.mp, st.maxMp);
  const hpP = Math.max(0, p.hp / st.maxHp * 100);
  const mpP = Math.max(0, p.mp / st.maxMp * 100);
  const need = expNeed(p.level);
  const exP = Math.min(100, p.exp / need * 100);
  $('#bar-hp').style.width = hpP + '%';
  $('#bar-mp').style.width = mpP + '%';
  $('#bar-exp').style.width = exP + '%';
  $('#txt-hp').textContent = `${Math.ceil(p.hp)}/${st.maxHp}`;
  $('#txt-mp').textContent = `${Math.floor(p.mp)}/${st.maxMp}`;
  $('#txt-exp').textContent = `${exP.toFixed(1)}%`;
  $('#hud-lv').textContent = 'Lv.' + p.level;
  $('#hud-gold').textContent = num(p.gold);
  $('#hud-dia').textContent = num(p.diamond);
  $('#hud-ac').textContent = st.ac;
  $('#hud-mr').textContent = st.mr;
  $('#hud-atk').textContent = st.atk;
  $('#hud-crit').textContent = st.crit + '%';
  $('#btn-attack').classList.toggle('hidden', p.auto);
  $('#btn-stop').classList.toggle('hidden', !p.auto);
}

function uiRenderMonster() {
  const p = S.player;
  if (!p.mon) return;
  const m = MONSTERS[p.mon.id];
  $('#m-emoji').textContent = m.icon;
  $('#m-name').textContent = m.name;
  uiSyncMonster();
}

function uiSyncMonster() {
  const p = S.player;
  if (!p.mon) return;
  const pct = Math.max(0, p.mon.hp / p.mon.maxHp * 100);
  $('#m-hp').style.width = pct + '%';
  $('#m-txt').textContent = `${Math.max(0, Math.ceil(p.mon.hp))}/${p.mon.maxHp}`;
}

function uiHitMonster() {
  const e = $('#m-emoji');
  if (!e) return;
  e.classList.add('hit');
  setTimeout(() => e.classList.remove('hit'), 90);
}

function uiDamage(v, crit, hurt) {
  const layer = $('#fx');
  if (!layer) return;
  const d = document.createElement('div');
  d.className = 'dmg' + (crit ? ' crit' : '') + (hurt ? ' hurt' : '');
  d.textContent = (hurt ? '-' : '') + num(v);
  const x = hurt ? 20 + Math.random() * 40 : 35 + Math.random() * 30;
  const y = hurt ? 68 + Math.random() * 8 : 26 + Math.random() * 14;
  d.style.left = x + '%';
  d.style.top = y + '%';
  layer.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function uiRenderLog() {
  const box = $('#log');
  if (!box || !S || !S.player) return;
  box.innerHTML = S.player.logs.slice(0, 4).map(l =>
    `<div class="l ${l.kind}">${l.text}</div>`).join('');
}

/* ---------------- 面板切換 ---------------- */
function closePanel() {
  const p = $('#panel');
  p.classList.add('hidden');
  p.innerHTML = '';
  $$('.tabs button').forEach(b => b.classList.remove('active'));
  ui.tab = null;
}

function openTab(name) {
  if (ui.tab === name) { closePanel(); return; }
  ui.tab = name;
  $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  const p = $('#panel');
  p.classList.remove('hidden');
  renderPanel(name);
  sfx('ui');
}

function renderPanel(name) {
  const body = $('#panel');
  if (!body) return;
  const p = S.player;
  let head = '', content = '';

  if (name === 'hunt') {
    head = `<div class="panel-head"><h2>狩 獵 場</h2><span class="sub">選擇掛機地點</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = MAPS.map(m => {
      const locked = p.level < m.lv;
      const names = m.mobs.map(id => MONSTERS[id].name).join(' · ');
      return `<button class="map-card ${p.mapId === m.id ? 'active' : ''} ${locked ? 'locked' : ''}" data-map="${m.id}" ${locked ? 'disabled' : ''}>
        <span class="mc-ico">${m.icon}</span>
        <span class="mc-info">
          <span class="mc-name">${m.name}</span>
          <span class="mc-meta">${locked ? `需要 Lv.${m.lv}` : names}</span>
          <span class="mc-meta">${m.desc}</span>
        </span>
        <span class="mc-meta">Lv.${m.lv}+</span>
      </button>`;
    }).join('');
  }

  if (name === 'bag') {
    head = `<div class="panel-head"><h2>背 包</h2><span class="sub">${p.inv.length} 格</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = renderEquipGrid() + renderBagFilters() + renderBagList();
  }

  if (name === 'stat') {
    const st = derive(p);
    head = `<div class="panel-head"><h2>能 力</h2><span class="sub">${st.className}</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = `
      <div class="card">
        <div class="card-title"><span>基本數值</span><span class="badge">剩餘點數 ${p.freePoints}</span></div>
        ${Object.keys(STAT_INFO).map(k => `
          <div class="stat-line">
            <span>${STAT_INFO[k].name} <span class="muted">${STAT_INFO[k].short}</span></span>
            <span class="row">
              <b>${p.points[k]}</b>
              ${p.freePoints > 0 ? `<button class="alloc-btn" data-add="${k}">＋</button>` : ''}
            </span>
          </div>`).join('')}
        <p class="muted" style="margin:8px 0 0">${STAT_INFO ? '每升 1 級獲得 1 點屬性點，職業主屬性自動 +1。' : ''}</p>
      </div>
      <div class="card">
        <div class="card-title"><span>戰鬥數值</span></div>
        <div class="stat-cols">
          <div class="stat-line"><span>生命</span><b>${Math.ceil(p.hp)}/${st.maxHp}</b></div>
          <div class="stat-line"><span>魔力</span><b>${Math.floor(p.mp)}/${st.maxMp}</b></div>
          <div class="stat-line"><span>攻擊</span><b>${st.atk}</b></div>
          <div class="stat-line"><span>防禦</span><b>${st.ac}</b></div>
          <div class="stat-line"><span>魔防</span><b>${st.mr}</b></div>
          <div class="stat-line"><span>爆擊</span><b>${st.crit}%</b></div>
        </div>
        <div class="stat-line"><span>技能</span><b>${st.skill.icon} ${st.skill.name}</b></div>
        <p class="muted" style="margin:6px 0 0">${st.skill.desc} · 消耗 ${st.skill.mp} MP · 冷卻 ${st.skill.cd}s</p>
      </div>
      <div class="card">
        <div class="card-title"><span>戰績</span></div>
        <div class="stat-cols">
          <div class="stat-line"><span>擊殺</span><b>${num(p.stats.kills)}</b></div>
          <div class="stat-line"><span>死亡</span><b>${num(p.stats.deaths)}</b></div>
          <div class="stat-line"><span>世界王</span><b>${num(p.stats.bossKills)}</b></div>
          <div class="stat-line"><span>轉世</span><b>${p.rebirth} 次</b></div>
        </div>
        <p class="muted" style="margin:6px 0 0">每次轉世永久提升全能力 5%</p>
      </div>`;
  }

  if (name === 'shop') {
    head = `<div class="panel-head"><h2>隨 機 交 易 所</h2><span class="sub">每 3 分鐘自動換貨</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = renderShop();
  }

  if (name === 'hall') {
    head = `<div class="panel-head"><h2>大 廳</h2><span class="sub">村莊 NPC</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = `
      <div class="card">
        <div class="card-title"><span>${currentMap(p).icon} ${currentMap(p).name}</span><span class="badge">${p.auto ? '掛機中' : '休息中'}</span></div>
        <p class="muted">擊殺 ${num(p.stats.kills)}　轉世 ${p.rebirth} 次　永久加成 +${p.rebirth * 5}%</p>
      </div>
      <div class="npc-grid">
        <button class="npc-card" data-npc="smith"><span class="npc-ico">🔨</span><span class="npc-nm">鐵匠</span><span class="npc-ds">強化裝備</span></button>
        <button class="npc-card" data-npc="craft"><span class="npc-ico">📜</span><span class="npc-nm">製作</span><span class="npc-ds">材料合成</span></button>
        <button class="npc-card" data-npc="gacha"><span class="npc-ico">🎁</span><span class="npc-nm">潘朵拉</span><span class="npc-ds">金幣抽獎</span></button>
        <button class="npc-card" data-npc="boss"><span class="npc-ico">👑</span><span class="npc-nm">世界王</span><span class="npc-ds">限時挑戰</span></button>
        <button class="npc-card" data-npc="exchange"><span class="npc-ico">🔄</span><span class="npc-nm">兌換</span><span class="npc-ds">藍鑽金幣兌換</span></button>
        <button class="npc-card" data-npc="rebirth"><span class="npc-ico">🧙</span><span class="npc-nm">孟婆</span><span class="npc-ds">轉世重生</span></button>
      </div>
      <p class="muted" style="margin-top:14px;text-align:center">所有交易皆為單機模擬，無須連線</p>`;
  }

  if (name === 'setting') {
    head = `<div class="panel-head"><h2>設 定</h2><span class="sub">單機存檔</span><span class="spacer"></span><button class="close-x" data-close>✕</button></div>`;
    content = `
      <div class="card">
        <div class="set-row">
          <div><div class="st">遊戲音效</div><div class="sd">攻擊、掉落、升級提示音</div></div>
          <div class="switch ${S.settings.sfx ? 'on' : ''}" data-toggle="sfx"><i></i></div>
        </div>
        <div class="set-row">
          <div><div class="st">自動喝水</div><div class="sd">生命低於 38% 時自動使用藥水</div></div>
          <div class="switch ${S.settings.autoPotion ? 'on' : ''}" data-toggle="potion"><i></i></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>面板配色</span></div>
        <div class="theme-list">
          ${[
            ['default', '預設', '#171c26'],
            ['forest', '森林', '#16211b'],
            ['blood', '血月', '#211417'],
            ['ocean', '深海', '#0f1a24'],
            ['sand', '沙漠', '#221d14'],
          ].map(([k, n, c]) => `<button class="theme-dot ${S.settings.theme === k ? 'active' : ''}" data-theme="${k}" style="background:${c}"><span>${n}</span></button>`).join('')}
        </div>
        <div style="height:18px"></div>
      </div>
      <div class="card">
        <div class="card-title"><span>存檔</span></div>
        <p class="muted">進度自動儲存在此瀏覽器（localStorage）。更換瀏覽器或清除資料會遺失進度。</p>
        <div class="wrap" style="margin-top:10px">
          <button class="btn btn-ghost" data-act="export">匯出存檔</button>
          <button class="btn btn-ghost" data-act="import">匯入存檔</button>
          <button class="btn btn-ghost" style="border-color:#6d3b3b;color:#f0c9c9" data-act="reset">刪除存檔</button>
        </div>
      </div>
      <p class="muted" style="text-align:center">放置天地 · 單機版 v1.0</p>`;
  }

  body.innerHTML = head + `<div class="panel-body">${content}</div>`;
  body.scrollTop = 0;
  bindPanel(name);
}

/* ---------------- 背包 ---------------- */
function renderEquipGrid() {
  const p = S.player;
  return `<div class="card">
    <div class="card-title"><span>裝備</span><span class="muted">點擊卸下</span></div>
    <div class="equip-grid">
      ${EQUIP_SLOTS.map(slot => {
        const uid = p.equip[slot];
        const e = uid ? p.inv.find(x => x.uid === uid) : null;
        const it = e ? itemById(e.id) : null;
        if (!it) return `<div class="eq-slot"><span class="eq-ico">＋</span><span class="eq-nm">${SLOT_NAME[slot]}</span></div>`;
        return `<button class="eq-slot filled ${RARITY[it.rarity].bd}" data-unequip="${slot}">
          <span class="eq-ico">${it.icon}</span>
          <span class="eq-nm ${RARITY[it.rarity].cls}">${it.name}${e.enh ? ' +' + e.enh : ''}</span>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

function renderBagFilters() {
  const f = ui.bagFilter;
  const opts = [['all', '全部'], ['equip', '裝備'], ['consumable', '消耗'], ['material', '材料']];
  return `<div class="seg" style="margin-bottom:10px">
    ${opts.map(([k, n]) => `<button data-filter="${k}" class="${f === k ? 'active' : ''}">${n}</button>`).join('')}
  </div>`;
}

function renderBagList() {
  const p = S.player;
  const f = ui.bagFilter;
  let list = p.inv.filter(e => {
    const it = itemById(e.id);
    if (!it) return false;
    if (f === 'all') return true;
    if (f === 'equip') return isEquip(it);
    return it.type === f;
  });
  const equipped = new Set(Object.values(p.equip).filter(Boolean));
  // 排序：裝備優先、稀有度、強化
  const order = { weapon: 0, armor: 1, helmet: 2, shield: 3, gloves: 4, boots: 5, cloak: 6, ring: 7, amulet: 8 };
  list.sort((a, b) => {
    const ia = itemById(a.id), ib = itemById(b.id);
    const ea = equipped.has(a.uid) ? -1 : 0, eb = equipped.has(b.uid) ? -1 : 0;
    if (ea !== eb) return ea - eb;
    if (ia.type !== ib.type) return (order[ia.type] ?? 9) - (order[ib.type] ?? 9);
    if (ia.rarity !== ib.rarity) return ib.rarity - ia.rarity;
    return (b.enh || 0) - (a.enh || 0);
  });

  if (!list.length) return `<p class="muted" style="text-align:center;padding:26px 0">背包是空的</p>`;

  return list.map(e => {
    const it = itemById(e.id);
    const isEq = isEquip(it);
    const isOn = equipped.has(e.uid);
    const meta = [];
    if (isEq) {
      if (it.atk) meta.push(`攻擊 +${it.atk}`);
      if (it.ac) meta.push(`防禦 +${it.ac}`);
      if (it.mr) meta.push(`魔防 +${it.mr}`);
      if (it.hp) meta.push(`生命 +${it.hp}`);
      if (it.mp) meta.push(`魔力 +${it.mp}`);
      if (it.dex) meta.push(`敏捷 +${it.dex}`);
      if (it.spd) meta.push(`攻速 +${it.spd}%`);
      if (e.enh) meta.push(`強化 +${e.enh}`);
      meta.push(RARITY[it.rarity].name);
    } else if (it.type === 'consumable') {
      meta.push(it.desc);
    } else {
      meta.push('材料');
    }
    if ((e.qty || 1) > 1) meta.push(`×${e.qty}`);
    const canUse = it.type === 'consumable' && it.use && !it.use.scroll;
    return `<div class="item ${RARITY[it.rarity].bd}">
      <div class="ico">${it.icon}</div>
      <div class="info">
        <div class="nm ${RARITY[it.rarity].cls}">${it.name}${e.enh ? `<span class="enh">+${e.enh}</span>` : ''}${isOn ? '<span class="equipped-tag">裝備中</span>' : ''}</div>
        <div class="meta">${meta.join(' · ')}</div>
      </div>
      <div class="acts">
        ${isEq ? `<button class="btn ${isOn ? 'btn-sell' : 'btn-use'}" data-equip="${e.uid}">${isOn ? '卸下' : '裝備'}</button>` : ''}
        ${canUse ? `<button class="btn btn-use" data-use="${e.uid}">使用</button>` : ''}
        ${isEq ? `<button class="btn btn-ghost" data-detail="${e.uid}">強化</button>` : ''}
        <button class="btn btn-ghost" data-sell="${e.uid}">賣</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------------- 商店 ---------------- */
function renderShop() {
  const p = S.player;
  const shop = S.shop;
  if (!shop.slots || !shop.slots.length) rollShop(true);
  const left = Math.max(0, Math.floor((S.shop.nextAt - now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const cards = S.shop.slots.map((s, i) => {
    const it = itemById(s.id);
    if (!it) return '';
    const sold = s.stock <= 0;
    const priceTxt = s.cur === 'gold' ? `💰 ${num(s.price)}` : `💎 ${s.price}`;
    const cls = s.cur === 'gold' ? '' : 'dia';
    return `<div class="shop-card ${RARITY[it.rarity].bd} ${sold ? 'sold' : ''}">
      ${s.tag ? `<span class="sc-badge">${s.tag}</span>` : ''}
      <div class="sc-top">
        <div class="sc-ico">${it.icon}</div>
        <div>
          <div class="sc-nm ${RARITY[it.rarity].cls}">${it.name}${s.enh ? '+' + s.enh : ''}${s.qty > 1 ? ' ×' + s.qty : ''}</div>
          <div class="sc-type">${isEquip(it) ? SLOT_NAME[it.type] : (it.type === 'material' ? '材料' : '消耗品')} · ${RARITY[it.rarity].name}</div>
        </div>
      </div>
      <div class="sc-price">
        <b class="${cls}">${priceTxt}</b>
        <button class="btn btn-use" data-buy="${i}" ${sold ? 'disabled' : ''}>${sold ? '售完' : '購買'}</button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card between">
      <div>
        <div class="st" style="font-size:12px">商品刷新</div>
        <div class="muted" id="shop-timer">自動換貨 ${mm}:${ss}</div>
      </div>
      <button class="btn btn-ghost" data-refresh="1" style="padding:8px 12px;font-size:11px">刷新（${SHOP_MANUAL_COST} 金幣）</button>
    </div>
    <div class="shop-grid">${cards}</div>
    <p class="muted" style="margin-top:12px;text-align:center">商品依等級隨機生成，偶爾出現高稀有度裝備</p>`;
}

function tickShopTimer() {
  if (ui.tab !== 'shop') return;
  const el = $('#shop-timer');
  if (!el) return;
  const left = Math.max(0, Math.floor((S.shop.nextAt - now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  el.textContent = `自動換貨 ${mm}:${ss}`;
  if (left <= 0) { rollShop(true); renderPanel('shop'); }
}

/* ---------------- 面板事件 ---------------- */
function bindPanel(name) {
  const body = $('#panel');

  body.onclick = e => {
    if (e.target.closest('[data-close]')) { closePanel(); return; }

    if (name === 'hunt') {
      const b = e.target.closest('[data-map]');
      if (b && !b.disabled) {
        const p = S.player;
        p.mapId = b.dataset.map;
        p.mon = null;
        spawnMonster(p);
        renderStaticHud();
        uiRenderMonster();
        renderPanel('hunt');
        toast('前往 ' + currentMap(p).name);
      }
      return;
    }

    if (name === 'bag') {
      const f = e.target.closest('[data-filter]');
      if (f) { ui.bagFilter = f.dataset.filter; renderPanel('bag'); return; }

      const eq = e.target.closest('[data-equip]');
      if (eq) {
        const uid = +eq.dataset.equip;
        const p = S.player;
        if (Object.values(p.equip).includes(uid)) {
          const slot = Object.keys(p.equip).find(s => p.equip[s] === uid);
          unequip(p, slot);
        } else {
          const err = equipItem(p, uid);
          if (err) toast(err); else sfx('ui');
        }
        saveGame(); renderPanel('bag'); uiSyncHud();
        return;
      }
      const un = e.target.closest('[data-unequip]');
      if (un) { unequip(S.player, un.dataset.unequip); saveGame(); renderPanel('bag'); uiSyncHud(); return; }

      const use = e.target.closest('[data-use]');
      if (use) {
        useItem(S.player, +use.dataset.use);
        sfx('coin'); saveGame(); renderPanel('bag'); uiSyncHud();
        return;
      }
      const sell = e.target.closest('[data-sell]');
      if (sell) {
        const uid = +sell.dataset.sell;
        const p = S.player;
        const entry = p.inv.find(x => x.uid === uid);
        if (!entry) return;
        const price = sellPrice(entry) * (entry.qty || 1);
        modalConfirm('出售道具', `確定要出售 ${itemById(entry.id).name}，獲得 ${num(price)} 金幣嗎？`, () => {
          const g = sellItem(p, uid);
          toast('出售獲得 ' + num(g) + ' 金幣');
          sfx('coin'); saveGame(); renderPanel('bag'); uiSyncHud();
        });
        return;
      }
      const det = e.target.closest('[data-detail]');
      if (det) { openEnhance(+det.dataset.detail); return; }
      return;
    }

    if (name === 'stat') {
      const add = e.target.closest('[data-add]');
      if (add) {
        const p = S.player;
        if (p.freePoints <= 0) return;
        p.points[add.dataset.add]++;
        p.freePoints--;
        sfx('ui'); saveGame(); renderPanel('stat'); uiSyncHud();
      }
      return;
    }

    if (name === 'shop') {
      const b = e.target.closest('[data-buy]');
      if (b) {
        const err = buyShop(+b.dataset.buy);
        if (err) toast(err); else toast('購買成功');
        renderPanel('shop'); uiSyncHud();
        return;
      }
      const r = e.target.closest('[data-refresh]');
      if (r) {
        const err = refreshShop(true);
        if (err) toast(err); else toast('商店已刷新');
        renderPanel('shop'); uiSyncHud();
        return;
      }
      return;
    }

    if (name === 'hall') {
      const npc = e.target.closest('[data-npc]');
      if (npc) {
        const k = npc.dataset.npc;
        if (k === 'smith') openSmith();
        if (k === 'craft') openCraft();
        if (k === 'gacha') openGacha();
        if (k === 'boss') openBoss();
        if (k === 'exchange') openExchange();
        if (k === 'rebirth') openRebirth();
      }
      return;
    }

    if (name === 'setting') {
      const tg = e.target.closest('[data-toggle]');
      if (tg) {
        const k = tg.dataset.toggle;
        if (k === 'sfx') S.settings.sfx = !S.settings.sfx;
        if (k === 'potion') S.settings.autoPotion = !S.settings.autoPotion;
        tg.classList.toggle('on');
        sfx('ui');
        saveGame();
        return;
      }
      const th = e.target.closest('[data-theme]');
      if (th) {
        S.settings.theme = th.dataset.theme;
        themeApply();
        saveGame();
        renderPanel('setting');
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'export') exportSave();
        if (act.dataset.act === 'import') importSave();
        if (act.dataset.act === 'reset') {
          modalConfirm('刪除存檔', '所有進度將永久消失，確定嗎？', () => {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
          });
        }
      }
    }
  };
}

/* ---------------- Modal 基礎 ---------------- */
function closeModal() {
  $('#modal-root').innerHTML = '';
  ui.modal = null;
}

function openModal(html) {
  $('#modal-root').innerHTML = `<div class="modal-mask" data-mask>${html}</div>`;
  const mask = $('#modal-root .modal-mask');
  mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
  return mask;
}

function modalConfirm(title, text, onOk) {
  openModal(`<div class="modal">
    <div class="modal-head"><h3>${title}</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">${text}</div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-x>取消</button>
      <button class="btn btn-gold" data-ok>確定</button>
    </div>
  </div>`);
  const root = $('#modal-root');
  root.querySelectorAll('[data-x]').forEach(b => b.onclick = closeModal);
  root.querySelector('[data-ok]').onclick = () => { closeModal(); onOk && onOk(); };
}

/* ---------------- 強化 ---------------- */
function openEnhance(uid) {
  const p = S.player;
  const e = p.inv.find(x => x.uid === uid);
  if (!e) return;
  const it = itemById(e.id);
  const enh = e.enh || 0;
  const rate = Math.floor(enhanceRate(it.type, enh) * 100);
  const blessRate = Math.min(98, Math.floor((enhanceRate(it.type, enh) + 0.15) * 100));
  const cost = enhanceCost(it.type, enh);
  const scrolls = countItem(p, 'sc_ench');
  const bless = countItem(p, 'sc_bless');
  const safe = SAFE[it.type] ?? 4;

  openModal(`<div class="modal">
    <div class="modal-head"><h3>裝 備 強 化</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">
      <div class="item ${RARITY[it.rarity].bd}" style="margin-bottom:12px">
        <div class="ico">${it.icon}</div>
        <div class="info">
          <div class="nm ${RARITY[it.rarity].cls}">${it.name} <span class="enh">+${enh}</span></div>
          <div class="meta">${it.atk ? '攻擊 +' + it.atk : ''}${it.ac ? ' 防禦 +' + it.ac : ''}${it.mr ? ' 魔防 +' + it.mr : ''}</div>
        </div>
      </div>
      <div class="muted">
        目前強化 <b style="color:#9fe8a0">+${enh}</b>　安定值 <b>+${safe}</b><br>
        強化費用 <b>${num(cost)}</b> 金幣<br>
        一般成功率 <b>${rate}%</b>（強化卷軸 ×${scrolls}）<br>
        祝福成功率 <b>${blessRate}%</b>（祝福卷軸 ×${bless}）<br>
        <span style="color:#f0c46a">超過安定值失敗可能降級（不會爆裝）</span>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-enh="0">強化 ${rate}%</button>
      <button class="btn btn-gold" data-enh="1">祝福 ${blessRate}%</button>
    </div>
  </div>`);

  const root = $('#modal-root');
  root.querySelector('[data-x]').onclick = closeModal;
  root.querySelectorAll('[data-enh]').forEach(b => {
    b.onclick = () => {
      const blessMode = b.dataset.enh === '1';
      const r = doEnhance(S.player, uid, blessMode);
      toast(r.msg);
      if (r.ok) sfx('level'); else sfx('die');
      saveGame();
      uiSyncHud();
      if (S.player.inv.find(x => x.uid === uid)) openEnhance(uid);
      else closeModal();
      if (ui.tab === 'bag') renderPanel('bag');
    };
  });
}

/* ---------------- 鐵匠 ---------------- */
function openSmith() {
  const p = S.player;
  const equips = p.inv.filter(e => isEquip(itemById(e.id)));
  if (!equips.length) {
    openModal(`<div class="modal">
      <div class="modal-head"><h3>鐵 匠</h3><button class="close-x" data-x>✕</button></div>
      <div class="modal-body">你身上沒有可強化的裝備。</div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>關閉</button></div>
    </div>`);
    bindCloseAll();
    return;
  }
  openModal(`<div class="modal">
    <div class="modal-head"><h3>鐵 匠</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">
      <p class="muted">強化卷軸 ×${countItem(p, 'sc_ench')}　祝福卷軸 ×${countItem(p, 'sc_bless')}</p>
      ${equips.map(e => {
        const it = itemById(e.id);
        return `<button class="item ${RARITY[it.rarity].bd}" style="width:100%;text-align:left" data-pick="${e.uid}">
          <div class="ico">${it.icon}</div>
          <div class="info">
            <div class="nm ${RARITY[it.rarity].cls}">${it.name} <span class="enh">+${e.enh || 0}</span></div>
            <div class="meta">${SLOT_NAME[it.type]}${p.equip[it.type] === e.uid ? ' · 裝備中' : ''}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-x>關閉</button></div>
  </div>`);
  bindCloseAll();
  $$('#modal-root [data-pick]').forEach(b => b.onclick = () => openEnhance(+b.dataset.pick));
}

function bindCloseAll() {
  const root = $('#modal-root');
  root.querySelectorAll('[data-x]').forEach(b => b.onclick = closeModal);
}

/* ---------------- 製作 ---------------- */
function openCraft() {
  const p = S.player;
  const rows = RECIPES.map(rc => {
    const ok = canCraft(p, rc);
    const needs = Object.keys(rc.need).map(id => {
      const have = countItem(p, id);
      const good = have >= rc.need[id];
      return `<span style="color:${good ? '#8fdca8' : '#f08a8a'}">${itemById(id).name} ${have}/${rc.need[id]}</span>`;
    }).join('　');
    return `<div class="card">
      <div class="between">
        <div class="row"><span style="font-size:20px">${rc.icon}</span>
          <div><div style="font-size:12.5px;font-weight:700">${rc.name}</div>
          <div class="muted">${rc.desc}</div></div>
        </div>
        <button class="btn ${ok ? 'btn-gold' : 'btn-ghost'}" data-craft="${rc.id}" ${ok ? '' : 'disabled'} style="padding:8px 12px;font-size:11px">製作</button>
      </div>
      <div class="muted" style="margin-top:8px">${needs}　💰${num(rc.gold)}</div>
    </div>`;
  }).join('');

  openModal(`<div class="modal">
    <div class="modal-head"><h3>製 作</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">${rows}</div>
    <div class="modal-foot"><button class="btn btn-ghost" data-x>關閉</button></div>
  </div>`);
  bindCloseAll();
  $$('#modal-root [data-craft]').forEach(b => b.onclick = () => {
    const r = craft(S.player, b.dataset.craft);
    if (typeof r === 'string') toast(r);
    else {
      toast(r.msg);
      sfx(r.item && r.item.rarity >= 2 ? 'level' : 'coin');
      saveGame(); uiSyncHud();
      if (ui.tab === 'bag') renderPanel('bag');
      openCraft();
    }
  });
}

/* ---------------- 抽獎 ---------------- */
function openGacha() {
  const p = S.player;
  openModal(`<div class="modal">
    <div class="modal-head"><h3>潘 朵 拉 的 黑 市</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body boss-body">
      <div class="boss-emoji">🎁</div>
      <p class="muted">花金幣轉動命運的齒輪<br>可能抽中任何物品（含 ★傳說級）</p>
      <div class="muted" style="margin:10px 0">
        普通 62% · 稀有 29% · 英雄 8.5% · 傳說 0.5%
      </div>
      <div class="muted">持有金幣 <b style="color:#e8c87a">${num(p.gold)}</b></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-roll="1">單抽<br><span style="font-size:10px">${num(GACHA.single)}</span></button>
      <button class="btn btn-gold" data-roll="10">十連<br><span style="font-size:10px">${num(GACHA.ten)}</span></button>
    </div>
  </div>`);
  bindCloseAll();
  $$('#modal-root [data-roll]').forEach(b => b.onclick = () => {
    const r = gachaRoll(+b.dataset.roll);
    if (r.err) return toast(r.err);
    showGachaResult(r.items);
  });
}

function showGachaResult(items) {
  const rows = items.map(x => {
    const it = itemById(x.id);
    return `<div class="gacha-item">
      <span class="gi-ico">${it.icon}</span>
      <span class="gi-nm ${RARITY[it.rarity].cls}">${it.name}${x.qty > 1 ? ' ×' + x.qty : ''}</span>
      <span class="spacer" style="flex:1"></span>
      <span class="muted">${RARITY[it.rarity].name}</span>
    </div>`;
  }).join('');
  openModal(`<div class="modal">
    <div class="modal-head"><h3>抽 獎 結 果</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">${rows}</div>
    <div class="modal-foot"><button class="btn btn-gold" data-x>收下</button></div>
  </div>`);
  bindCloseAll();
  sfx('loot');
  saveGame(); uiSyncHud();
}

/* ---------------- 兌換 ---------------- */
function openExchange() {
  const p = S.player;
  const rows = EXCHANGE.map(ex => {
    const it = itemById(ex.item);
    const costTxt = ex.cost.gold ? `💰 ${num(ex.cost.gold)}` : `💎 ${ex.cost.diamond}`;
    const ok = (!ex.cost.gold || p.gold >= ex.cost.gold) && (!ex.cost.diamond || p.diamond >= ex.cost.diamond);
    return `<div class="item ${RARITY[it.rarity].bd}">
      <div class="ico">${it.icon}</div>
      <div class="info">
        <div class="nm ${RARITY[it.rarity].cls}">${it.name} ×${ex.qty}</div>
        <div class="meta">${it.desc}</div>
      </div>
      <button class="btn ${ok ? 'btn-use' : 'btn-ghost'}" data-ex="${ex.id}" ${ok ? '' : 'disabled'}>${costTxt}</button>
    </div>`;
  }).join('');
  openModal(`<div class="modal">
    <div class="modal-head"><h3>兌 換</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">
      <p class="muted">持有 💰${num(p.gold)}　💎${num(p.diamond)}</p>
      ${rows}
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-x>關閉</button></div>
  </div>`);
  bindCloseAll();
  $$('#modal-root [data-ex]').forEach(b => b.onclick = () => {
    const r = exchange(S.player, b.dataset.ex);
    toast(r);
    sfx('coin'); saveGame(); uiSyncHud();
    openExchange();
  });
}

/* ---------------- 轉世 ---------------- */
function openRebirth() {
  const p = S.player;
  const cost = rebirthCost(p);
  openModal(`<div class="modal">
    <div class="modal-head"><h3>孟 婆</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body boss-body">
      <div class="boss-emoji">🧙</div>
      <p class="muted">喝下這碗湯，忘卻前塵，以全新的名字轉世重生吧。</p>
      <div class="offline-num">+${(p.rebirth + 1) * 5}%</div>
      <p class="muted">轉世後永久提升全能力</p>
      <div class="muted" style="margin-top:10px">
        目前轉世 <b>${p.rebirth}</b> 次（+${p.rebirth * 5}%）<br>
        需要等級 <b>20</b>（目前 Lv.${p.level}）<br>
        費用 <b>${num(cost)}</b> 金幣
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-x>再想想</button>
      <button class="btn btn-gold" data-rebirth>轉 世 重 生</button>
    </div>
  </div>`);
  bindCloseAll();
  $('#modal-root [data-rebirth]').onclick = () => {
    const err = doRebirth(S.player);
    if (err) return toast(err);
    closeModal();
    toast('轉世成功！永久加成 +' + S.player.rebirth * 5 + '%');
    sfx('level');
    renderStaticHud(); uiSyncHud(); uiRenderMonster();
    if (ui.tab) renderPanel(ui.tab);
    if (ui.tab === 'hall') renderPanel('hall');
  };
}

/* ---------------- 世界王 ---------------- */
function openBoss() {
  const p = S.player;
  const b = p.boss;
  if (b && b.active) {
    openModal(`<div class="modal">
      <div class="modal-head"><h3>世 界 王</h3><span class="muted" id="boss-timer"></span></div>
      <div class="modal-body boss-body">
        <div class="boss-emoji">${WORLD_BOSS.icon}</div>
        <div style="font-weight:700;letter-spacing:.1em">${WORLD_BOSS.name}</div>
        <div class="bar mhp" style="margin-top:10px"><i id="boss-hp"></i><span id="boss-hp-txt"></span></div>
        <div class="muted" style="margin-top:10px">累積傷害 <b id="boss-dmg" style="color:#ffd45e">0</b></div>
        <p class="muted">戰鬥中無法掛機，擊殺或時間結束後結算</p>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>關閉</button></div>
    </div>`);
    bindCloseAll();
    uiSyncBoss();
    return;
  }
  const cd = b ? Math.max(0, Math.ceil((b.cdUntil - now()) / 1000)) : 0;
  openModal(`<div class="modal">
    <div class="modal-head"><h3>世 界 王</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body boss-body">
      <div class="boss-emoji">${WORLD_BOSS.icon}</div>
      <div style="font-weight:700;letter-spacing:.1em">${WORLD_BOSS.name}</div>
      <p class="muted">生命 ${num(bossHpMax(p))}　攻擊 ${WORLD_BOSS.atk}</p>
      <p class="muted">限時 ${WORLD_BOSS.duration} 秒，依累積傷害獲得金幣與藍鑽</p>
      ${cd > 0 ? `<p class="muted" style="color:#f0c46a">冷卻中 ${Math.floor(cd / 60)}:${String(cd % 60).padStart(2, '0')}</p>` : ''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-x>關閉</button>
      <button class="btn btn-gold" data-start ${cd > 0 ? 'disabled' : ''}>挑 戰</button>
    </div>
  </div>`);
  bindCloseAll();
  $('#modal-root [data-start]').onclick = () => {
    const err = startBoss(S.player);
    if (err) return toast(err);
    closeModal();
    openBoss();
    uiSyncHud();
    toast('世界王戰鬥開始！');
  };
}

function uiSyncBoss() {
  const p = S.player;
  if (!p.boss) return;
  const b = p.boss;
  const hp = $('#boss-hp'), txt = $('#boss-hp-txt'), dmg = $('#boss-dmg'), timer = $('#boss-timer');
  if (!hp) return;
  hp.style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
  if (txt) txt.textContent = `${num(b.hp)}/${num(b.maxHp)}`;
  if (dmg) dmg.textContent = num(b.dmg);
  if (timer) {
    const left = Math.max(0, Math.ceil((b.endAt - now()) / 1000));
    timer.textContent = left + 's';
  }
}

function showBossResult(b, killed, gold, dia) {
  const p = S.player;
  const myDmg = b.dmg;
  const others = WORLD_BOSS.ranks.map(n => ({ n, d: Math.floor(myDmg * (0.35 + Math.random() * 1.5)) + Math.floor(80 + Math.random() * 400 + p.level * 20) }));
  others.push({ n: p.name + '（你）', d: myDmg, me: true });
  others.sort((a, b2) => b2.d - a.d);
  const rows = others.map((x, i) => `<div class="rank-row ${x.me ? 'me' : ''}">
    <span>${i + 1}. ${x.n}</span><span>${num(x.d)}</span></div>`).join('');

  openModal(`<div class="modal">
    <div class="modal-head"><h3>${killed ? '討 伐 成 功' : '戰 鬥 結 束'}</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body">
      <div class="boss-body">
        <div class="boss-emoji" style="font-size:48px">${killed ? '🏆' : '🐲'}</div>
        <div class="offline-num">+${num(gold)} 金幣　+${dia} 藍鑽</div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#9aa4b5">傷害排名</div>
      ${rows}
    </div>
    <div class="modal-foot"><button class="btn btn-gold" data-x>收下</button></div>
  </div>`);
  bindCloseAll();
  sfx(killed ? 'level' : 'coin');
}

/* ---------------- 離線收益 ---------------- */
function showOffline(rep) {
  const h = Math.floor(rep.elapsed / 3600);
  const m = Math.floor((rep.elapsed % 3600) / 60);
  openModal(`<div class="modal">
    <div class="modal-head"><h3>離 線 掛 機 收 益</h3><button class="close-x" data-x>✕</button></div>
    <div class="modal-body boss-body">
      <div class="boss-emoji">🌙</div>
      <p class="muted">離線時間 ${h > 0 ? h + ' 小時 ' : ''}${m} 分鐘</p>
      <div class="offline-num">${num(rep.exp)} 經驗</div>
      <div class="offline-num" style="font-size:18px">+${num(rep.gold)} 金幣</div>
      <p class="muted">擊殺 ${num(rep.kills)} 隻怪物</p>
    </div>
    <div class="modal-foot"><button class="btn btn-gold" data-x>收 下</button></div>
  </div>`);
  bindCloseAll();
  sfx('coin');
}

/* ---------------- 存檔匯出/匯入 ---------------- */
function exportSave() {
  const data = JSON.stringify(S, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `afei-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('已匯出存檔');
}

function importSave() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!data.player) throw new Error('格式錯誤');
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        location.reload();
      } catch (e) { toast('存檔格式錯誤'); }
    };
    rd.readAsText(f);
  };
  inp.click();
}

/* ---------------- 主畫面事件 ---------------- */
function bindGame() {
  $$('.tabs button').forEach(b => b.onclick = () => { sfx('ui'); openTab(b.dataset.tab); });

  $('#btn-attack').onclick = () => {
    const p = S.player;
    p.auto = true;
    if (!p.mon) spawnMonster(p);
    uiSyncHud();
    toast('開始掛機');
  };
  $('#btn-stop').onclick = () => {
    S.player.auto = false;
    uiSyncHud();
    toast('已停止掛機');
  };
  $('#btn-map').onclick = () => openTab('hunt');
  $('#btn-boss').onclick = openBoss;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
    else if (S && S.player) { const rep = offlineReport(); if (rep) showOffline(rep); }
  });
  window.addEventListener('beforeunload', saveGame);
  setInterval(tickShopTimer, 1000);
}
