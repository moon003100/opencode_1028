/* ============================================================
   放置天地 · 單機版 — 遊戲資料
   ============================================================ */
'use strict';

const RARITY = [
  { name: '普通', color: '#cfd8dc', cls: 'r0', bd: 'bd0', mult: 1.0 },
  { name: '稀有', color: '#6cc7f5', cls: 'r1', bd: 'bd1', mult: 2.6 },
  { name: '英雄', color: '#bd9dff', cls: 'r2', bd: 'bd2', mult: 7.0 },
  { name: '傳說', color: '#ffd45e', cls: 'r3', bd: 'bd3', mult: 18.0 },
];

const EQUIP_SLOTS = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'shield', 'cloak', 'ring', 'amulet'];
const SLOT_NAME = {
  weapon: '武器', armor: '盔甲', helmet: '頭盔', gloves: '手套', boots: '靴子',
  shield: '盾牌', cloak: '斗篷', ring: '戒指', amulet: '項鍊',
};

const CLASSES = {
  knight: {
    id: 'knight', name: '騎士', icon: '🛡️', emoji: '🛡️',
    desc: '厚實生命與防禦，正面承受傷害',
    base: { str: 13, dex: 8, con: 14, int: 6, wis: 6 },
    growth: 'con', weaponType: 'sword',
    skill: { name: '衝擊之暈', icon: '💥', mp: 12, cd: 6, mult: 2.0, stun: 2, desc: '重擊目標並使其暈眩' },
  },
  elf: {
    id: 'elf', name: '妖精', icon: '🏹', emoji: '🏹',
    desc: '遠程輸出，兼具治療與加速',
    base: { str: 9, dex: 14, con: 9, int: 8, wis: 11 },
    growth: 'dex', weaponType: 'bow',
    skill: { name: '三重矢', icon: '🎯', mp: 10, cd: 5, mult: 2.2, stun: 0, desc: '連續射出三箭' },
  },
  wizard: {
    id: 'wizard', name: '法師', icon: '🔮', emoji: '🧙',
    desc: '高魔法傷害，脆皮但爆發強',
    base: { str: 6, dex: 8, con: 8, int: 15, wis: 13 },
    growth: 'int', weaponType: 'staff',
    skill: { name: '火球術', icon: '🔥', mp: 14, cd: 5, mult: 2.6, stun: 0, desc: '投擲火球造成魔法傷害' },
  },
  darkelf: {
    id: 'darkelf', name: '黑暗妖精', icon: '🗡️', emoji: '🥷',
    desc: '雙刀連擊，爆擊率高',
    base: { str: 11, dex: 13, con: 10, int: 8, wis: 8 },
    growth: 'str', weaponType: 'ddagger',
    skill: { name: '雙重破壞', icon: '⚡', mp: 12, cd: 5, mult: 2.1, stun: 0, desc: '高速雙擊，爆擊率提升' },
  },
};

/* 屬性說明 */
const STAT_INFO = {
  str: { name: '力量', short: 'STR', desc: '物理攻擊力' },
  dex: { name: '敏捷', short: 'DEX', desc: '爆擊率與命中' },
  con: { name: '體質', short: 'CON', desc: '生命值與防禦' },
  int: { name: '智力', short: 'INT', desc: '魔法攻擊與魔力' },
  wis: { name: '精神', short: 'WIS', desc: '魔力與魔法防禦' },
};

/* ---------------- 道具 ---------------- */
/* type: 裝備槽位 或 consumable / material
   atk/ac/mr/hp/mp 為基礎數值；price 為基準售價（金幣）
   lv 需求等級；cls 職業限制；use 使用效果 */
const ITEMS = [
  /* ===== 武器 ===== */
  { id: 'w_dagger',  name: '匕首',     type: 'weapon', icon: '🗡️', rarity: 0, atk: 4,  lv: 1,  price: 200,   cls: null, desc: '輕巧的短刃' },
  { id: 'w_short',   name: '短劍',     type: 'weapon', icon: '⚔️', rarity: 0, atk: 7,  lv: 4,  price: 700,   cls: null, desc: '冒險者的基本配劍' },
  { id: 'w_long',    name: '長劍',     type: 'weapon', icon: '⚔️', rarity: 1, atk: 11, lv: 9,  price: 2200,  cls: null, desc: '均衡而可靠' },
  { id: 'w_broad',   name: '闊劍',     type: 'weapon', icon: '⚔️', rarity: 1, atk: 15, lv: 15, price: 5200,  cls: null, desc: '厚重的斬擊武器' },
  { id: 'w_twohand', name: '雙手劍',   type: 'weapon', icon: '⚔️', rarity: 2, atk: 22, lv: 23, price: 16000, cls: null, desc: '需要雙手揮動' },
  { id: 'w_dragon',  name: '龍牙巨劍', type: 'weapon', icon: '🗡️', rarity: 3, atk: 32, lv: 36, price: 68000, cls: null, desc: '以巨龍之牙鍛成' },
  { id: 'w_bow',     name: '短弓',     type: 'weapon', icon: '🏹', rarity: 0, atk: 6,  lv: 1,  price: 260,   cls: ['elf'], desc: '妖精的入門弓' },
  { id: 'w_cross',   name: '十字弓',   type: 'weapon', icon: '🏹', rarity: 1, atk: 12, lv: 11, price: 2800,  cls: ['elf'], desc: '精準的遠程武器' },
  { id: 'w_moon',    name: '月神長弓', type: 'weapon', icon: '🏹', rarity: 3, atk: 24, lv: 33, price: 56000, cls: ['elf'], desc: '月光凝成的弓身' },
  { id: 'w_staff',   name: '木法杖',   type: 'weapon', icon: '🪄', rarity: 0, atk: 5,  lv: 1,  price: 240,   cls: ['wizard'], desc: '初學者的法杖' },
  { id: 'w_wand',    name: '魔杖',     type: 'weapon', icon: '🪄', rarity: 1, atk: 10, lv: 11, price: 3000,  cls: ['wizard'], desc: '蘊含微弱魔力' },
  { id: 'w_destiny', name: '毀滅魔杖', type: 'weapon', icon: '🔮', rarity: 3, atk: 26, lv: 33, price: 58000, cls: ['wizard'], desc: '凝聚毀滅之力' },
  { id: 'w_ddagger', name: '雙刀',     type: 'weapon', icon: '🗡️', rarity: 1, atk: 9,  lv: 8,  price: 2000,  cls: ['darkelf'], desc: '黑妖的雙持短刃' },
  { id: 'w_shadow',  name: '暗影雙刀', type: 'weapon', icon: '🗡️', rarity: 3, atk: 23, lv: 31, price: 54000, cls: ['darkelf'], desc: '斬開黑暗的利刃' },

  /* ===== 盔甲 ===== */
  { id: 'a_leather', name: '皮甲',     type: 'armor',  icon: '🥋', rarity: 0, ac: 4,  lv: 1,  price: 300,  cls: null, desc: '輕便的獸皮護甲' },
  { id: 'a_chain',   name: '鎖子甲',   type: 'armor',  icon: '🧥', rarity: 1, ac: 7,  lv: 8,  price: 2600, cls: null, desc: '環環相扣的鐵甲' },
  { id: 'a_metal',   name: '金屬盔甲', type: 'armor',  icon: '🛡️', rarity: 1, ac: 10, lv: 16, price: 6200, cls: null, desc: '厚重的金屬護甲' },
  { id: 'a_elf',     name: '精靈盔甲', type: 'armor',  icon: '🧝', rarity: 2, ac: 9,  mr: 6, lv: 21, price: 18000, cls: null, desc: '精靈工藝，抗魔性佳' },
  { id: 'a_dragon',  name: '龍鱗甲',   type: 'armor',  icon: '🐲', rarity: 3, ac: 15, mr: 8, lv: 33, price: 72000, cls: null, desc: '以龍鱗層層疊成' },

  /* ===== 頭盔 ===== */
  { id: 'h_cap',     name: '皮帽',     type: 'helmet', icon: '🧢', rarity: 0, ac: 1, lv: 1,  price: 120,  cls: null, desc: '簡單的皮製帽子' },
  { id: 'h_iron',    name: '鐵盔',     type: 'helmet', icon: '⛑️', rarity: 1, ac: 3, lv: 7,  price: 900,  cls: null, desc: '常見的鐵製頭盔' },
  { id: 'h_mage',    name: '魔法頭巾', type: 'helmet', icon: '🎩', rarity: 1, ac: 2, mr: 4, lv: 9, price: 1400, cls: null, desc: '增幅魔力的頭巾' },
  { id: 'h_dragon',  name: '龍頭盔',   type: 'helmet', icon: '🐉', rarity: 3, ac: 6, mr: 4, lv: 31, price: 38000, cls: null, desc: '龍骨打造的頭盔' },

  /* ===== 手套 ===== */
  { id: 'g_leather', name: '皮手套',   type: 'gloves', icon: '🧤', rarity: 0, ac: 1, lv: 1,  price: 110,  cls: null, desc: '保暖又輕便' },
  { id: 'g_iron',    name: '鐵手套',   type: 'gloves', icon: '🧤', rarity: 1, ac: 3, lv: 9,  price: 1200, cls: null, desc: '帶有鐵片的護手' },
  { id: 'g_power',   name: '力量手套', type: 'gloves', icon: '💪', rarity: 2, atk: 3, lv: 20, price: 15000, cls: null, desc: '提升揮擊力道' },

  /* ===== 靴子 ===== */
  { id: 'b_leather', name: '皮靴',     type: 'boots',  icon: '👣', rarity: 0, ac: 1, lv: 1,  price: 110,  cls: null, desc: '耐走的皮靴' },
  { id: 'b_iron',    name: '鐵靴',     type: 'boots',  icon: '🥾', rarity: 1, ac: 3, lv: 9,  price: 1300, cls: null, desc: '沉穩的鐵製靴' },
  { id: 'b_haste',   name: '加速靴',   type: 'boots',  icon: '⚡', rarity: 2, ac: 2, spd: 20, lv: 18, price: 22000, cls: null, desc: '移動與出手更迅速' },

  /* ===== 盾牌 ===== */
  { id: 's_wood',    name: '木盾',     type: 'shield', icon: '🪵', rarity: 0, ac: 2,  lv: 1,  price: 180,  cls: null, desc: '基本的防護盾' },
  { id: 's_iron',    name: '鐵盾',     type: 'shield', icon: '🛡️', rarity: 1, ac: 5,  lv: 8,  price: 1800, cls: null, desc: '堅固的鐵盾' },
  { id: 's_elf',     name: '精靈盾',   type: 'shield', icon: '🔰', rarity: 2, ac: 3, mr: 7, lv: 18, price: 16000, cls: null, desc: '精靈祝福的守護' },
  { id: 's_dragon',  name: '龍盾',     type: 'shield', icon: '🛡️', rarity: 3, ac: 9, mr: 3, lv: 30, price: 46000, cls: null, desc: '龍鱗覆蓋的大盾' },

  /* ===== 斗篷 ===== */
  { id: 'c_cloth',   name: '布斗篷',   type: 'cloak',  icon: '🧣', rarity: 0, ac: 1, lv: 1,  price: 150,  cls: null, desc: '擋風的粗布' },
  { id: 'c_protect', name: '守護斗篷', type: 'cloak',  icon: '🧣', rarity: 1, ac: 3, mr: 3, lv: 10, price: 2400, cls: null, desc: '帶有守護咒文' },
  { id: 'c_mana',    name: '魔力斗篷', type: 'cloak',  icon: '🌌', rarity: 2, ac: 1, mr: 8, lv: 20, price: 17000, cls: null, desc: '魔力流動的布料' },

  /* ===== 戒指 ===== */
  { id: 'r_str',     name: '力量戒指', type: 'ring',   icon: '💍', rarity: 1, atk: 2, lv: 8,  price: 2200, cls: null, desc: '微微增幅力量' },
  { id: 'r_dex',     name: '敏捷戒指', type: 'ring',   icon: '💍', rarity: 1, dex: 3, lv: 8,  price: 2200, cls: null, desc: '提升敏捷與爆擊' },
  { id: 'r_guard',   name: '守護戒指', type: 'ring',   icon: '💍', rarity: 2, ac: 3, lv: 16, price: 13000, cls: null, desc: '形成守護結界' },
  { id: 'r_life',    name: '生命戒指', type: 'ring',   icon: '💍', rarity: 2, hp: 60,  lv: 16, price: 13000, cls: null, desc: '提升生命上限' },

  /* ===== 項鍊 ===== */
  { id: 'n_heal',    name: '治癒項鍊', type: 'amulet', icon: '📿', rarity: 1, hp: 40, lv: 7,  price: 2000, cls: null, desc: '緩慢回復生命' },
  { id: 'n_magic',   name: '魔法項鍊', type: 'amulet', icon: '📿', rarity: 1, mp: 50, lv: 7,  price: 2000, cls: null, desc: '提升魔力上限' },
  { id: 'n_dragon',  name: '龍之項鍊', type: 'amulet', icon: '🔱', rarity: 3, atk: 3, mr: 5, lv: 30, price: 40000, cls: null, desc: '龍之力凝成的項鍊' },

  /* ===== 消耗品 ===== */
  { id: 'p_red',     name: '紅色藥水', type: 'consumable', icon: '🧪', rarity: 0, price: 60,  use: { hp: 45 },  desc: '回復 45 生命' },
  { id: 'p_orange',  name: '橙色藥水', type: 'consumable', icon: '🧴', rarity: 1, price: 180, use: { hp: 120 }, desc: '回復 120 生命' },
  { id: 'p_white',   name: '白色藥水', type: 'consumable', icon: '🧼', rarity: 2, price: 450, use: { hp: 300 }, desc: '回復 300 生命' },
  { id: 'p_mp',      name: '魔力藥水', type: 'consumable', icon: '🫙', rarity: 1, price: 130, use: { mp: 60 },  desc: '回復 60 魔力' },
  { id: 'sc_ench',   name: '強化卷軸', type: 'consumable', icon: '📜', rarity: 1, price: 1600, use: { scroll: 'ench' }, desc: '提升裝備強化值' },
  { id: 'sc_bless',  name: '祝福強化卷軸', type: 'consumable', icon: '🧾', rarity: 2, price: 6000, use: { scroll: 'bless' }, desc: '強化成功率 +15%' },
  { id: 'sc_tele',   name: '傳送卷軸', type: 'consumable', icon: '🌀', rarity: 0, price: 320, use: { teleport: true }, desc: '立即返回村莊並恢復' },
  { id: 'elixir',    name: '萬能藥',   type: 'consumable', icon: '⚗️', rarity: 3, price: 60000, use: { point: 1 }, desc: '永久獲得 1 點屬性點' },

  /* ===== 材料 ===== */
  { id: 'm_leather', name: '皮革',     type: 'material', icon: '🟫', rarity: 0, price: 45,   desc: '製作防具的材料' },
  { id: 'm_iron',    name: '鐵礦',     type: 'material', icon: '⛏️', rarity: 0, price: 70,   desc: '製作武器的材料' },
  { id: 'm_bone',    name: '骨頭',     type: 'material', icon: '🦴', rarity: 0, price: 35,   desc: '不死系怪物的殘骸' },
  { id: 'm_gem',     name: '魔法寶石', type: 'material', icon: '💠', rarity: 1, price: 320,  desc: '蘊含魔力的寶石' },
  { id: 'm_scale',   name: '龍鱗',     type: 'material', icon: '🐲', rarity: 2, price: 900,  desc: '巨龍身上的鱗片' },
  { id: 'm_tear',    name: '精靈之淚', type: 'material', icon: '💧', rarity: 2, price: 1500, desc: '妖精森林的結晶' },
];

const ITEM_MAP = {};
ITEMS.forEach(it => { ITEM_MAP[it.id] = it; });

function itemById(id) { return ITEM_MAP[id]; }
function isEquip(it) { return !!(it && it.type !== 'consumable' && it.type !== 'material'); }

/* ---------------- 怪物 ---------------- */
const MONSTERS = {
  goblin:   { id: 'goblin',   name: '妖魔',       icon: '👺', hp: 34,  atk: 12,  ac: 1,  exp: 10,  gold: 9,   drops: [['m_leather', .10], ['p_red', .06], ['w_dagger', .015]] },
  wolf:     { id: 'wolf',     name: '野狼',       icon: '🐺', hp: 62,  atk: 18,  ac: 3,  exp: 18,  gold: 15,  drops: [['m_leather', .14], ['p_red', .05], ['a_leather', .012]] },
  orc:      { id: 'orc',      name: '半獸人',     icon: '👹', hp: 104, atk: 26,  ac: 5,  exp: 30,  gold: 24,  drops: [['m_iron', .14], ['m_leather', .10], ['w_short', .02]] },
  skeleton: { id: 'skeleton', name: '骷髏',       icon: '💀', hp: 156, atk: 34,  ac: 7,  exp: 46,  gold: 36,  drops: [['m_bone', .20], ['m_iron', .10], ['p_orange', .05]] },
  ghoul:    { id: 'ghoul',    name: '食屍鬼',     icon: '🧟', hp: 224, atk: 42,  ac: 9,  exp: 66,  gold: 50,  drops: [['m_bone', .22], ['m_gem', .05], ['n_heal', .012]] },
  bat:      { id: 'bat',      name: '巨大蝙蝠',   icon: '🦇', hp: 192, atk: 38,  ac: 5,  exp: 58,  gold: 44,  drops: [['m_leather', .16], ['p_mp', .07], ['c_cloth', .02]] },
  spider:   { id: 'spider',   name: '毒蜘蛛',     icon: '🕷️', hp: 286, atk: 50,  ac: 10, exp: 86,  gold: 64,  drops: [['m_gem', .07], ['m_leather', .12], ['s_wood', .02]] },
  scorpion: { id: 'scorpion', name: '火龍蠍',     icon: '🦂', hp: 384, atk: 62,  ac: 13, exp: 122, gold: 90,  drops: [['m_scale', .04], ['m_gem', .08], ['h_iron', .02]] },
  demon:    { id: 'demon',    name: '地獄犬',     icon: '😈', hp: 508, atk: 78,  ac: 16, exp: 176, gold: 128, drops: [['m_gem', .10], ['m_scale', .06], ['w_broad', .015]] },
  drake:    { id: 'drake',    name: '幼龍',       icon: '🐉', hp: 690, atk: 96,  ac: 19, exp: 248, gold: 180, drops: [['m_scale', .12], ['m_gem', .10], ['a_elf', .012]] },
  dknight:  { id: 'dknight',  name: '死亡騎士',   icon: '⚔️', hp: 900, atk: 116, ac: 22, exp: 336, gold: 246, drops: [['m_bone', .18], ['m_scale', .10], ['s_elf', .012]] },
  dragon:   { id: 'dragon',   name: '黑龍',       icon: '🐲', hp: 1240, atk: 142, ac: 26, exp: 470, gold: 340, drops: [['m_scale', .20], ['m_tear', .05], ['w_dragon', .004], ['a_dragon', .004]] },
};

/* ---------------- 狩獵場 ---------------- */
const MAPS = [
  { id: 'island',  name: '說話之島',   icon: '🏝️', lv: 1,  mobs: ['goblin', 'wolf', 'orc'],           desc: '新手冒險的起點' },
  { id: 'plain',   name: '銀騎士平原', icon: '🌾', lv: 6,  mobs: ['wolf', 'orc', 'skeleton'],         desc: '風吹過的廣闊草原' },
  { id: 'cave',    name: '眠龍洞穴',   icon: '🕳️', lv: 14, mobs: ['skeleton', 'ghoul', 'bat'],        desc: '陰暗潮濕的地下洞窟' },
  { id: 'nest',    name: '蜘蛛巢穴',   icon: '🕸️', lv: 22, mobs: ['spider', 'ghoul', 'bat'],          desc: '佈滿蛛網的巢穴' },
  { id: 'lava',    name: '火龍窟',     icon: '🌋', lv: 30, mobs: ['scorpion', 'demon', 'spider'],     desc: '岩漿翻騰的灼熱地帶' },
  { id: 'tower',   name: '傲慢之塔',   icon: '🗼', lv: 38, mobs: ['demon', 'dknight', 'drake'],       desc: '高聳入雲的古代塔' },
  { id: 'valley',  name: '龍之谷',     icon: '🏔️', lv: 45, mobs: ['drake', 'dragon', 'dknight'],      desc: '巨龍沉眠的禁忌之地' },
];

/* ---------------- 製作配方 ---------------- */
const RECIPES = [
  { id: 'rc_armor', name: '隨機防具', icon: '🧥', need: { m_leather: 4, m_iron: 2 }, gold: 800,
    out: { type: 'equip', slots: ['armor', 'helmet', 'gloves', 'boots', 'shield', 'cloak'], rarity: [0, 0, 1] },
    desc: '以皮革與鐵礦打造一件防具' },
  { id: 'rc_weapon', name: '隨機武器', icon: '⚔️', need: { m_iron: 5, m_gem: 1 }, gold: 2500,
    out: { type: 'equip', slots: ['weapon'], rarity: [0, 1, 1] },
    desc: '鍛造一把隨機武器' },
  { id: 'rc_gem', name: '魔法寶石', icon: '💠', need: { m_bone: 6, m_iron: 2 }, gold: 600,
    out: { type: 'item', id: 'm_gem', qty: 2 },
    desc: '將殘骸煉成魔法寶石' },
  { id: 'rc_scroll', name: '強化卷軸 ×2', icon: '📜', need: { m_gem: 3, m_iron: 3 }, gold: 1200,
    out: { type: 'item', id: 'sc_ench', qty: 2 },
    desc: '製作強化裝備用的卷軸' },
  { id: 'rc_bless', name: '祝福強化卷軸', icon: '🧾', need: { m_gem: 5, m_tear: 1 }, gold: 5000,
    out: { type: 'item', id: 'sc_bless', qty: 1 },
    desc: '成功率更高的強化卷軸' },
  { id: 'rc_dragon', name: '龍系裝備', icon: '🐲', need: { m_scale: 5, m_gem: 5 }, gold: 20000,
    out: { type: 'equip', slots: ['weapon', 'armor', 'helmet', 'shield'], rarity: [2, 3] },
    desc: '以龍鱗鍛造強力裝備' },
  { id: 'rc_potion', name: '橙色藥水 ×5', icon: '🧴', need: { m_leather: 2, m_bone: 3 }, gold: 400,
    out: { type: 'item', id: 'p_orange', qty: 5 },
    desc: '調製回復藥水' },
];

/* ---------------- 兌換（固定商店） ---------------- */
const EXCHANGE = [
  { id: 'ex_bless', item: 'sc_bless', qty: 1, cost: { diamond: 8 } },
  { id: 'ex_elixir', item: 'elixir', qty: 1, cost: { diamond: 60 } },
  { id: 'ex_white', item: 'p_white', qty: 20, cost: { gold: 6000 } },
  { id: 'ex_tear', item: 'm_tear', qty: 3, cost: { gold: 12000 } },
  { id: 'ex_scale', item: 'm_scale', qty: 5, cost: { gold: 9000 } },
];

/* ---------------- 世界王 ---------------- */
const WORLD_BOSS = {
  name: '巨龍王 · 巴列斯', icon: '🐲', baseHp: 4200, atk: 150,
  duration: 60, cooldown: 180,
  ranks: ['阿肥', '夜行者', '風之妖精', '鋼鐵騎士', '無名之影', '月光下的貓', '暗黑大法師'],
};

/* ---------------- 潘朵拉 ---------------- */
const GACHA = {
  single: 300000, ten: 3000000,
  weights: [0.62, 0.29, 0.085, 0.005], // 普通/稀有/英雄/傳說
};

/* ---------------- 工具 ---------------- */
function num(n) {
  n = Math.floor(n || 0);
  if (n >= 100000000) return (n / 100000000).toFixed(2).replace(/\.00$/, '') + '億';
  if (n >= 10000) return (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '萬';
  return n.toLocaleString('en-US');
}
