/* ============================================================
   放置天地 · 單機版 — 遊戲引擎
   ============================================================ */
'use strict';

const SAVE_KEY = 'afei_single_v1';
const MAX_OFFLINE = 12 * 3600;   // 離線最多累積 12 小時
const LEVEL_CAP = 60;

let S = null;        // 遊戲存檔狀態
let TICK = null;     // 戰鬥計時器
let _busy = false;   // 防止重複結算

/* ---------------- 存檔 ---------------- */
function now() { return Date.now(); }

function defaultState() {
  return {
    version: 1,
    settings: { theme: 'default', sfx: true, autoPotion: true },
    player: null,
    shop: { slots: [], nextAt: 0 },
    meta: { createdAt: now(), kills: 0, bossKills: 0, rebirths: 0 },
    lastTick: now(),
  };
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.player) return false;
    S = Object.assign(defaultState(), data);
    S.settings = Object.assign({ theme: 'default', sfx: true, autoPotion: true }, data.settings || {});
    S.player = normalizePlayer(S.player);
    return true;
  } catch (e) {
    console.warn('存檔讀取失敗', e);
    return false;
  }
}

function normalizePlayer(p) {
  p.inv = p.inv || [];
  p.equip = p.equip || {};
  p.points = p.points || { str: 10, dex: 10, con: 10, int: 10, wis: 10 };
  p.freePoints = p.freePoints || 0;
  p.gold = p.gold || 0;
  p.diamond = p.diamond || 0;
  p.rebirth = p.rebirth || 0;
  p.skillCd = p.skillCd || 0;
  p.potionCd = p.potionCd || 0;
  p.uid = p.uid || 1;
  p.mapId = p.mapId || 'island';
  p.auto = p.auto !== false;
  p.mon = p.mon || null;
  p.boss = p.boss || null;
  p.logs = p.logs || [];
  p.stats = p.stats || { kills: 0, deaths: 0, bossKills: 0 };
  return p;
}

/* ---------------- 建立角色 ---------------- */
function createPlayer(opt) {
  const c = CLASSES[opt.classId];
  const pts = {};
  for (const k in c.base) pts[k] = c.base[k] + (opt.alloc[k] || 0);
  const p = normalizePlayer({
    name: opt.name,
    classId: opt.classId,
    gender: opt.gender || 'male',
    level: 1,
    exp: 0,
    points: pts,
    freePoints: 0,
    gold: 1000,
    diamond: 10,
    inv: [],
    equip: {},
    hp: 1, mp: 1,
    mapId: 'island',
    auto: true,
    mon: null,
    boss: null,
    logs: [],
    stats: { kills: 0, deaths: 0, bossKills: 0 },
    rebirth: 0,
    skillCd: 0,
    potionCd: 0,
    uid: 1,
  });
  // 初始裝備與補給
  addItem(p, 'p_red', 10);
  addItem(p, 'sc_ench', 1);
  const st = derive(p);
  p.hp = st.maxHp;
  p.mp = st.maxMp;
  return p;
}

function startNewGame(opt) {
  S = defaultState();
  S.player = createPlayer(opt);
  rollShop(true);
  saveGame();
  return S.player;
}

/* ---------------- 數值計算 ---------------- */
function equipBonus(p) {
  const b = { atk: 0, ac: 0, mr: 0, hp: 0, mp: 0, dex: 0, spd: 0 };
  for (const slot in p.equip) {
    const uid = p.equip[slot];
    if (!uid) continue;
    const e = p.inv.find(x => x.uid === uid);
    if (!e) continue;
    const it = itemById(e.id);
    if (!it) continue;
    const k = e.enh || 0;
    if (it.atk) b.atk += it.atk * (1 + k * 0.15);
    if (it.ac) b.ac += it.ac + k;
    if (it.mr) b.mr += it.mr + k * 0.5;
    if (it.hp) b.hp += it.hp;
    if (it.mp) b.mp += it.mp;
    if (it.dex) b.dex += it.dex;
    if (it.spd) b.spd += it.spd;
  }
  return b;
}

function derive(p) {
  const c = CLASSES[p.classId];
  const a = p.points;
  const eq = equipBonus(p);
  const rb = 1 + (p.rebirth || 0) * 0.05;   // 每次轉世 +5%
  const magic = p.classId === 'wizard';
  const atk = (4 + (magic ? a.int * 1.9 : a.str * 1.8 + a.dex * 0.5) + eq.atk) * rb;
  const ac = (2 + a.con * 0.6 + eq.ac) * rb;
  const mr = (a.wis * 1.2 + a.int * 0.3 + eq.mr) * rb;
  const maxHp = Math.floor((50 + a.con * 10 + p.level * 8 + eq.hp) * rb);
  const maxMp = Math.floor((20 + a.wis * 6 + a.int * 2 + p.level * 2 + eq.mp) * rb);
  const crit = Math.min(60, 5 + (a.dex + eq.dex) * 0.6);
  const spd = eq.spd;
  const regenHp = Math.max(1, Math.floor(maxHp * 0.008));
  const regenMp = Math.max(1, Math.floor(maxMp * 0.02));
  return {
    atk: Math.round(atk), ac: Math.round(ac), mr: Math.round(mr),
    maxHp, maxMp, crit: Math.round(crit * 10) / 10, spd, regenHp, regenMp,
    skill: c.skill, className: c.name, icon: c.icon,
  };
}

function expNeed(level) {
  return Math.floor(40 * Math.pow(level, 1.72));
}

/* ---------------- 道具操作 ---------------- */
function addItem(p, id, qty, enh) {
  const it = itemById(id);
  if (!it) return null;
  qty = qty || 1;
  enh = enh || 0;
  if (it.type === 'consumable' || it.type === 'material') {
    const ex = p.inv.find(x => x.id === id && !x.equipSlot);
    if (ex) { ex.qty += qty; return ex; }
    const e = { uid: p.uid++, id, qty, enh: 0 };
    p.inv.push(e);
    return e;
  }
  const e = { uid: p.uid++, id, qty: 1, enh };
  p.inv.push(e);
  return e;
}

function removeItem(p, uid, qty) {
  const i = p.inv.findIndex(x => x.uid === uid);
  if (i < 0) return false;
  const e = p.inv[i];
  qty = qty || 1;
  if ((e.qty || 1) <= qty) {
    for (const s in p.equip) if (p.equip[s] === uid) p.equip[s] = null;
    p.inv.splice(i, 1);
  } else {
    e.qty -= qty;
  }
  return true;
}

function countItem(p, id) {
  return p.inv.filter(x => x.id === id).reduce((n, x) => n + (x.qty || 1), 0);
}

function equipItem(p, uid) {
  const e = p.inv.find(x => x.uid === uid);
  if (!e) return '找不到道具';
  const it = itemById(e.id);
  if (!isEquip(it)) return '此道具無法裝備';
  if (it.lv && p.level < it.lv) return `需要等級 ${it.lv}`;
  if (it.cls && it.cls.indexOf(p.classId) < 0) return '職業不符';
  p.equip[it.type] = uid;
  return null;
}

function unequip(p, slot) {
  p.equip[slot] = null;
}

function sellPrice(e) {
  const it = itemById(e.id);
  if (!it) return 0;
  return Math.max(1, Math.floor(it.price * 0.35 * (1 + (e.enh || 0) * 0.25)));
}

function sellItem(p, uid) {
  const e = p.inv.find(x => x.uid === uid);
  if (!e) return 0;
  for (const s in p.equip) if (p.equip[s] === uid) p.equip[s] = null;
  const gold = sellPrice(e) * (e.qty || 1);
  p.gold += gold;
  removeItem(p, uid, e.qty || 1);
  return gold;
}

function useItem(p, uid) {
  const e = p.inv.find(x => x.uid === uid);
  if (!e) return;
  const it = itemById(e.id);
  if (!it || !it.use) return;
  const st = derive(p);
  const u = it.use;
  if (u.hp) p.hp = Math.min(st.maxHp, p.hp + u.hp);
  if (u.mp) p.mp = Math.min(st.maxMp, p.mp + u.mp);
  if (u.point) { p.freePoints += 1; }
  if (u.teleport) { p.hp = st.maxHp; p.mp = st.maxMp; p.auto = false; }
  removeItem(p, uid, 1);
}

/* ---------------- 強化 ---------------- */
const SAFE = { weapon: 6, armor: 4, helmet: 4, gloves: 4, boots: 4, shield: 4, cloak: 4, ring: 4, amulet: 4 };

function enhanceRate(slot, enh) {
  const safe = SAFE[slot] ?? 4;
  const table = {
    0: 0.95, 1: 0.92, 2: 0.88, 3: 0.82, 4: 0.76, 5: 0.68,
    6: 0.58, 7: 0.46, 8: 0.34, 9: 0.22, 10: 0.12,
  };
  let r = table[Math.min(10, enh)] || 0.1;
  if (enh >= 8) r *= 0.75;
  return r;
}

function enhanceCost(slot, enh) {
  return Math.floor(600 * Math.pow(1.75, enh));
}

function doEnhance(p, uid, bless) {
  const e = p.inv.find(x => x.uid === uid);
  if (!e) return { ok: false, msg: '找不到裝備' };
  const it = itemById(e.id);
  if (!isEquip(it)) return { ok: false, msg: '此道具無法強化' };
  if ((e.enh || 0) >= 12) return { ok: false, msg: '已達最大強化值' };

  // 需要卷軸
  const scrollId = bless ? 'sc_bless' : 'sc_ench';
  const sc = p.inv.find(x => x.id === scrollId && (x.qty || 0) > 0);
  if (!sc) return { ok: false, msg: `缺少${bless ? '祝福強化卷軸' : '強化卷軸'}` };

  const cost = enhanceCost(it.type, e.enh || 0);
  if (p.gold < cost) return { ok: false, msg: `金幣不足（需要 ${num(cost)}）` };

  p.gold -= cost;
  removeItem(p, sc.uid, 1);

  let rate = enhanceRate(it.type, e.enh || 0);
  if (bless) rate = Math.min(0.98, rate + 0.15);
  const success = Math.random() < rate;
  const safe = SAFE[it.type] ?? 4;
  let msg, lost = false;

  if (success) {
    e.enh = (e.enh || 0) + 1;
    msg = `強化成功！${it.name} +${e.enh}`;
  } else if ((e.enh || 0) < safe) {
    msg = `強化失敗，裝備無損（安定值內）`;
  } else if (Math.random() < 0.35 && (e.enh || 0) > safe) {
    e.enh -= 1;
    msg = `強化失敗，${it.name} 降為 +${e.enh}`;
  } else {
    msg = `強化失敗，裝備無損`;
  }
  return { ok: success, msg, enh: e.enh, cost };
}

/* ---------------- 戰鬥 ---------------- */
function currentMap(p) {
  return MAPS.find(m => m.id === p.mapId) || MAPS[0];
}

function spawnMonster(p) {
  const map = currentMap(p);
  const id = map.mobs[Math.floor(Math.random() * map.mobs.length)];
  const base = MONSTERS[id];
  const scale = 1 + Math.max(0, p.level - map.lv) * 0.012;
  const hp = Math.floor(base.hp * scale);
  p.mon = { id, hp, maxHp: hp, stun: 0 };
  return p.mon;
}

function monsterAtkOf(p) {
  const map = currentMap(p);
  const base = MONSTERS[p.mon.id];
  const scale = 1 + Math.max(0, p.level - map.lv) * 0.015;
  return base.atk * scale;
}

function damageToMonster(p, st, mult) {
  const ac = MONSTERS[p.mon.id].ac;
  let dmg = st.atk * (1 - ac / (ac + 80)) * (0.9 + Math.random() * 0.2);
  const crit = Math.random() * 100 < st.crit;
  if (crit) dmg *= 1.8;
  dmg *= (mult || 1);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function damageToPlayer(p, st, rawAtk) {
  let dmg = rawAtk * (1 - st.ac / (st.ac + 120)) * (0.9 + Math.random() * 0.2);
  dmg = Math.max(1, Math.round(dmg));
  return dmg;
}

function gainExp(p, amount) {
  p.exp += amount;
  let ups = 0;
  while (p.level < LEVEL_CAP && p.exp >= expNeed(p.level)) {
    p.exp -= expNeed(p.level);
    p.level++;
    p.freePoints += 1;
    const g = CLASSES[p.classId].growth;
    p.points[g] += 1;
    ups++;
  }
  if (p.level >= LEVEL_CAP) p.exp = 0;
  if (ups) {
    const st = derive(p);
    p.hp = st.maxHp;
    p.mp = st.maxMp;
    log(`✦ 升級！Lv.${p.level}　獲得 ${ups} 點屬性點`, 'good');
    sfx('level');
  }
}

function onKill(p, monId) {
  const m = MONSTERS[monId];
  const map = currentMap(p);
  const scale = 1 + Math.max(0, p.level - map.lv) * 0.02;
  const exp = Math.round(m.exp * scale);
  const gold = Math.round(m.gold * scale);
  gainExp(p, exp);
  p.gold += gold;
  p.stats.kills++;
  S.meta.kills = (S.meta.kills || 0) + 1;
  log(`擊殺 ${m.name}　+${num(exp)} 經驗　+${num(gold)} 金幣`);
  // 掉落
  for (const [id, rate] of m.drops) {
    if (Math.random() < rate) {
      const it = itemById(id);
      addItem(p, id, 1);
      log(`　掉落：${it.name}`, 'rare');
      sfx('loot');
    }
  }
  // 金幣/裝備隨機額外掉落
  if (Math.random() < 0.03) {
    const b = Math.round(gold * 2.5);
    p.gold += b;
    log(`　額外金幣 +${num(b)}`, 'good');
  }
}

function playerDie(p) {
  const st = derive(p);
  p.stats.deaths++;
  const loss = Math.floor(expNeed(p.level) * 0.05);
  p.exp = Math.max(0, p.exp - loss);
  p.hp = Math.floor(st.maxHp * 0.5);
  p.mp = Math.floor(st.maxMp * 0.5);
  p.auto = false;
  log(`☠ 你被擊倒了…損失 ${num(loss)} 經驗，已停止掛機`, 'bad');
  sfx('die');
}

function autoPotion(p, st) {
  if (!S.settings.autoPotion) return;
  if (now() < (p.potionCd || 0)) return;
  if (p.hp > st.maxHp * 0.38) return;
  const order = ['p_white', 'p_orange', 'p_red'];
  for (const id of order) {
    const e = p.inv.find(x => x.id === id && (x.qty || 0) > 0);
    if (!e) continue;
    const it = itemById(id);
    p.hp = Math.min(st.maxHp, p.hp + it.use.hp);
    p.potionCd = now() + 1200;
    removeItem(p, e.uid, 1);
    log(`使用 ${it.name} 回復 ${it.use.hp} 生命`, 'good');
    return;
  }
}

function tick() {
  if (!S || !S.player) return;
  const p = S.player;
  if (_busy) return;
  if (!document.hidden) S.lastTick = now();
  _busy = true;
  try {
    if (p.boss && p.boss.active) { tickBoss(p); _busy = false; return; }
    if (!p.auto) { _busy = false; return; }

    const st = derive(p);
    // 自然回復
    p.hp = Math.min(st.maxHp, p.hp + st.regenHp);
    p.mp = Math.min(st.maxMp, p.mp + st.regenMp);
    autoPotion(p, st);

    if (!p.mon || p.mon.hp <= 0) spawnMonster(p);
    const mon = p.mon;
    const mdef = MONSTERS[mon.id];

    // 技能
    let mult = 1, castSkill = null;
    const sk = st.skill;
    if (now() >= (p.skillCd || 0) && p.mp >= sk.mp) {
      p.mp -= sk.mp;
      p.skillCd = now() + sk.cd * 1000;
      mult = sk.mult;
      castSkill = sk;
    }

    const hit = damageToMonster(p, st, mult);
    mon.hp -= hit.dmg;
    uiDamage(hit.dmg, hit.crit, false);
    if (castSkill) {
      log(`使用【${castSkill.name}】造成 ${num(hit.dmg)} 傷害`, 'warn');
      if (castSkill.stun) mon.stun = now() + castSkill.stun * 1000;
      sfx('skill');
    } else {
      sfx('hit');
    }
    uiHitMonster();

    if (mon.hp <= 0) {
      onKill(p, mon.id);
      spawnMonster(p);
      uiRenderMonster();
    } else {
      // 怪物反擊
      if (!mon.stun || now() > mon.stun) {
        let d = damageToPlayer(p, st, monsterAtkOf(p));
        p.hp -= d;
        uiDamage(d, false, true);
        if (p.hp <= 0) { p.hp = 0; playerDie(p); }
      }
    }
    uiSyncHud();
    uiSyncMonster();
  } finally {
    _busy = false;
  }
}

/* ---------------- 世界王 ---------------- */
function bossHpMax(p) {
  return Math.floor(WORLD_BOSS.baseHp * (1 + p.level * 0.08));
}

function startBoss(p) {
  if (p.boss && p.boss.active) return '世界王戰鬥中';
  const cdUntil = (p.boss && p.boss.cdUntil) || 0;
  if (now() < cdUntil) return '冷卻中';
  const maxHp = bossHpMax(p);
  p.boss = { active: true, hp: maxHp, maxHp, dmg: 0, lastHit: 0, endAt: now() + WORLD_BOSS.duration * 1000, cdUntil: 0 };
  p.auto = false;
  log('⚔ 世界王【巨龍王 · 巴列斯】降臨！', 'warn');
  return null;
}

function tickBoss(p) {
  const b = p.boss;
  if (!b || !b.active) return;
  const st = derive(p);
  if (now() >= b.endAt) { endBoss(p); return; }

  const ac = 18;
  let dmg = st.atk * (1 - ac / (ac + 80)) * (0.9 + Math.random() * 0.2);
  if (Math.random() * 100 < st.crit) dmg *= 1.8;
  dmg = Math.max(1, Math.round(dmg));
  b.hp -= dmg;
  b.dmg += dmg;
  uiDamage(dmg, false, false);

  // 王反擊（每 2 秒）
  if (now() - (b.lastHit || 0) >= 2000) {
    b.lastHit = now();
    const d = Math.max(1, Math.round(WORLD_BOSS.atk * (1 - st.ac / (st.ac + 120))));
    p.hp -= d;
    uiDamage(d, false, true);
    if (p.hp <= 0) { playerDie(p); endBoss(p); return; }
  }
  if (b.hp <= 0) { b.hp = 0; endBoss(p, true); return; }
  uiSyncBoss();
}

function endBoss(p, killed) {
  const b = p.boss;
  if (!b) return;
  b.active = false;
  b.cdUntil = now() + WORLD_BOSS.cooldown * 1000;
  const gold = Math.floor(b.dmg * 2.2) + (killed ? 5000 : 0);
  const dia = Math.floor(b.dmg / 900) + (killed ? 10 : 0);
  p.gold += gold;
  p.diamond += dia;
  p.stats.bossKills += (killed ? 1 : 0);
  S.meta.bossKills = (S.meta.bossKills || 0) + (killed ? 1 : 0);
  const st = derive(p);
  p.hp = Math.max(1, p.hp);
  p.mp = Math.min(st.maxMp, p.mp + st.maxMp * 0.3);
  log(killed ? '🏆 世界王已被擊敗！' : '世界王撤退了…', killed ? 'good' : 'warn');
  showBossResult(b, killed, gold, dia);
  saveGame();
}

/* ---------------- 商店（隨機交易所） ---------------- */
function pickWeighted(list, weightFn) {
  let total = 0;
  const w = list.map(x => { const v = Math.max(0, weightFn(x)); total += v; return v; });
  if (total <= 0) return list[Math.floor(Math.random() * list.length)];
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

function rarityWeight(lvl, r) {
  if (r === 0) return 100;
  if (r === 1) return 26 + lvl * 0.55;
  if (r === 2) return 3 + lvl * 0.34;
  return 0.25 + Math.max(0, lvl - 18) * 0.055;
}

function rollEquipment(p, slotFilter, rarityBias) {
  const lvl = p.level;
  const pool = ITEMS.filter(it => isEquip(it)
    && (!slotFilter || slotFilter.indexOf(it.type) >= 0)
    && it.lv <= lvl + 8
    && (!it.cls || it.cls.indexOf(p.classId) >= 0));
  if (!pool.length) return ITEMS[0];
  return pickWeighted(pool, it => rarityWeight(lvl, it.rarity) * (rarityBias && it.rarity >= 2 ? 1.35 : 1) / (1 + Math.max(0, it.lv - lvl) * 0.06));
}

function rollShop(force) {
  const p = S.player;
  if (!p) return;
  const lvl = p.level;
  const slots = [];

  // 1. 補給品 ×2（藥水、卷軸）
  const consPool = ['p_red', 'p_orange', 'p_white', 'p_mp', 'sc_ench', 'sc_bless'];
  const picked = [];
  while (picked.length < 2) {
    const id = consPool[Math.floor(Math.random() * consPool.length)];
    if (picked.indexOf(id) < 0) picked.push(id);
  }
  for (const id of picked) {
    const it = itemById(id);
    let qty = 10;
    if (id === 'p_white' || id === 'sc_ench') qty = 5;
    if (id === 'sc_bless') qty = 2;
    const price = Math.floor(it.price * qty * (0.85 + Math.random() * 0.3));
    slots.push({ id, qty, enh: 0, price, cur: 'gold', stock: 3, tag: '補給' });
  }

  // 2. 裝備 ×4
  const used = new Set();
  for (let i = 0; i < 4; i++) {
    let it = null;
    for (let t = 0; t < 8; t++) {
      const cand = rollEquipment(p, null, i === 3);
      if (!used.has(cand.id)) { it = cand; break; }
    }
    if (!it) it = rollEquipment(p, null, false);
    used.add(it.id);
    const enh = Math.random() < 0.35 ? Math.floor(Math.random() * 3) : 0;
    let price = it.price * (0.9 + Math.random() * 0.5) * (1 + enh * 0.45);
    if (it.rarity >= 2) price *= 1.1;
    slots.push({
      id: it.id, qty: 1, enh,
      price: Math.max(50, Math.floor(price)),
      cur: 'gold', stock: 1, tag: it.rarity >= 2 ? '珍品' : '裝備',
    });
  }

  // 3. 材料 ×1
  const matPool = ['m_leather', 'm_iron', 'm_bone', 'm_gem', 'm_scale', 'm_tear'];
  const matId = pickWeighted(matPool, id => (ITEM_MAP[id].rarity === 0 ? 100 : ITEM_MAP[id].rarity === 1 ? 30 : 8));
  const mat = itemById(matId);
  const mqty = mat.rarity === 0 ? 10 + Math.floor(Math.random() * 10) : 3;
  slots.push({
    id: matId, qty: mqty, enh: 0,
    price: Math.max(20, Math.floor(mat.price * mqty * (0.8 + Math.random() * 0.4))),
    cur: 'gold', stock: 2, tag: '材料',
  });

  // 4. 稀有品（鑽石） ×1 —— 以裝備為主
  const rarePool = ITEMS.filter(it => it.rarity >= 2 && isEquip(it)
    && (!it.cls || it.cls.indexOf(p.classId) >= 0) && (it.lv || 1) <= lvl + 12);
  const rareCons = ITEMS.filter(it => it.rarity >= 2 && it.type === 'consumable' && (it.lv || 1) <= lvl + 12);
  let rare;
  if (rarePool.length && Math.random() < 0.75) {
    rare = pickWeighted(rarePool, it => 100 / (1 + Math.abs(it.lv - lvl) * 0.2));
  } else if (rareCons.length) {
    rare = rareCons[Math.floor(Math.random() * rareCons.length)];
  } else {
    rare = itemById('sc_bless');
  }
  slots.push({
    id: rare.id, qty: 1, enh: 0,
    price: Math.max(2, Math.floor(rare.price / 2500) + 2),
    cur: 'diamond', stock: 1, tag: '稀有',
  });

  S.shop.slots = slots;
  S.shop.nextAt = now() + SHOP_REFRESH_MS;
  saveGame();
}

const SHOP_REFRESH_MS = 3 * 60 * 1000;
const SHOP_MANUAL_COST = 300;

function refreshShop(manual) {
  if (manual) {
    if (S.player.gold < SHOP_MANUAL_COST) return '金幣不足';
    S.player.gold -= SHOP_MANUAL_COST;
  }
  rollShop(true);
  return null;
}

function buyShop(index) {
  const p = S.player;
  const s = S.shop.slots[index];
  if (!s || s.stock <= 0) return '已售完';
  if (s.cur === 'gold' && p.gold < s.price) return '金幣不足';
  if (s.cur === 'diamond' && p.diamond < s.price) return '藍鑽不足';
  if (s.cur === 'gold') p.gold -= s.price; else p.diamond -= s.price;
  addItem(p, s.id, s.qty, s.enh);
  s.stock -= 1;
  const it = itemById(s.id);
  log(`購買 ${it.name}${s.enh ? ' +' + s.enh : ''} ×${s.qty}`, 'good');
  sfx('coin');
  saveGame();
  return null;
}

/* ---------------- 抽獎 ---------------- */
function gachaRoll(n) {
  const p = S.player;
  const cost = n === 10 ? GACHA.ten : GACHA.single;
  if (p.gold < cost) return { err: `金幣不足（需要 ${num(cost)}）` };
  p.gold -= cost;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let acc = 0, rarity = 0;
    for (let k = 0; k < GACHA.weights.length; k++) {
      acc += GACHA.weights[k];
      if (r <= acc) { rarity = k; break; }
      rarity = k;
    }
    const pool = ITEMS.filter(it => it.rarity === rarity);
    const it = pool[Math.floor(Math.random() * pool.length)] || ITEM_MAP.p_red;
    const qty = (it.type === 'consumable' || it.type === 'material') ? (rarity >= 2 ? 3 : 10) : 1;
    addItem(p, it.id, qty);
    out.push({ id: it.id, qty, rarity });
  }
  saveGame();
  return { items: out };
}

/* ---------------- 製作 / 兌換 ---------------- */
function canCraft(p, rc) {
  for (const id in rc.need) if (countItem(p, id) < rc.need[id]) return false;
  return p.gold >= rc.gold;
}

function craft(p, rcId) {
  const rc = RECIPES.find(r => r.id === rcId);
  if (!rc) return '找不到配方';
  if (!canCraft(p, rc)) return '材料或金幣不足';
  for (const id in rc.need) {
    let need = rc.need[id];
    while (need > 0) {
      const e = p.inv.find(x => x.id === id && (x.qty || 0) > 0);
      if (!e) break;
      const take = Math.min(need, e.qty || 1);
      removeItem(p, e.uid, take);
      need -= take;
    }
  }
  p.gold -= rc.gold;

  if (rc.out.type === 'item') {
    addItem(p, rc.out.id, rc.out.qty);
    return { msg: `製作成功：${itemById(rc.out.id).name} ×${rc.out.qty}`, item: itemById(rc.out.id) };
  }
  // 隨機裝備
  const pool = ITEMS.filter(it => isEquip(it) && rc.out.slots.indexOf(it.type) >= 0
    && rc.out.rarity.indexOf(it.rarity) >= 0
    && (!it.cls || it.cls.indexOf(p.classId) >= 0));
  const it = pool[Math.floor(Math.random() * pool.length)] || itemById('w_dagger');
  const enh = Math.random() < 0.3 ? 1 : 0;
  addItem(p, it.id, 1, enh);
  return { msg: `製作出 ${it.name}${enh ? ' +' + enh : ''}`, item: it };
}

function exchange(p, exId) {
  const ex = EXCHANGE.find(e => e.id === exId);
  if (!ex) return '找不到兌換項目';
  if (ex.cost.gold && p.gold < ex.cost.gold) return '金幣不足';
  if (ex.cost.diamond && p.diamond < ex.cost.diamond) return '藍鑽不足';
  if (ex.cost.gold) p.gold -= ex.cost.gold;
  if (ex.cost.diamond) p.diamond -= ex.cost.diamond;
  addItem(p, ex.item, ex.qty);
  return `兌換成功：${itemById(ex.item).name} ×${ex.qty}`;
}

/* ---------------- 轉世 ---------------- */
function rebirthCost(p) {
  return 100000 * Math.pow(2, p.rebirth || 0);
}

function doRebirth(p) {
  const cost = rebirthCost(p);
  if (p.level < 20) return '需要等級 20 以上';
  if (p.gold < cost) return `金幣不足（需要 ${num(cost)}）`;
  p.gold -= cost;
  p.rebirth = (p.rebirth || 0) + 1;
  p.level = 1;
  p.exp = 0;
  p.points = Object.assign({}, CLASSES[p.classId].base);
  p.freePoints = 3;
  p.equip = {};
  const st = derive(p);
  p.hp = st.maxHp;
  p.mp = st.maxMp;
  p.mon = null;
  p.boss = null;
  log(`✧ 轉世重生第 ${p.rebirth} 次，永久加成 +${p.rebirth * 5}%`, 'good');
  saveGame();
  return null;
}

/* ---------------- 離線收益 ---------------- */
function offlineReport() {
  const p = S.player;
  if (!p) return null;
  const elapsed = Math.min(MAX_OFFLINE, Math.floor((now() - (S.lastTick || now())) / 1000));
  if (elapsed < 60 || !p.auto) { S.lastTick = now(); return null; }

  const map = currentMap(p);
  const st = derive(p);
  const ids = map.mobs;
  let avgHp = 0, avgExp = 0, avgGold = 0, avgAc = 0;
  ids.forEach(id => {
    const m = MONSTERS[id];
    const scale = 1 + Math.max(0, p.level - map.lv) * 0.02;
    avgHp += m.hp * (1 + Math.max(0, p.level - map.lv) * 0.012);
    avgExp += m.exp * scale;
    avgGold += m.gold * scale;
    avgAc += m.ac;
  });
  avgHp /= ids.length; avgExp /= ids.length; avgGold /= ids.length; avgAc /= ids.length;

  const dps = Math.max(1, st.atk * (1 - avgAc / (avgAc + 80)));
  const killTime = Math.max(1.2, avgHp / dps);
  const kills = Math.floor(elapsed / killTime * 0.75);   // 離線效率 75%
  const exp = Math.floor(avgExp * kills);
  const gold = Math.floor(avgGold * kills);
  addItem(p, 'p_red', Math.floor(kills / 12) || 1);

  gainExp(p, exp);
  p.gold += gold;
  p.stats.kills += kills;
  S.meta.kills = (S.meta.kills || 0) + kills;
  S.lastTick = now();
  saveGame();
  return { elapsed, kills, exp, gold };
}

/* ---------------- 計時器 ---------------- */
function startLoop() {
  if (TICK) clearInterval(TICK);
  TICK = setInterval(tick, 1000);
  setInterval(() => { if (S) saveGame(); }, 8000);
  setInterval(() => { if (S && S.player) uiSyncHud(); }, 1000);
}

/* ---------------- 日誌 ---------------- */
function log(text, kind) {
  if (!S || !S.player) return;
  S.player.logs.unshift({ t: now(), text, kind: kind || '' });
  if (S.player.logs.length > 60) S.player.logs.pop();
  if (typeof uiRenderLog === 'function') uiRenderLog();
}
