// src/core/state.js —— 全局状态 + 关系账本（core 管账本）
//
// 一句话记忆：core 管账本，report 记账，garden 看账。
// `zhijian-relations` 唯一写入口 = applyAnalysisToGarden()；唯一调用方 = report.js。
import {
  resolveRelationTarget,
  normalizeConversation,
} from './relations.js';
import { ALL_NODE_IDS, NONE_ID, displayOf } from './nodes.js';

/**
 * 全局可变状态单例（跨模块共享的少量状态）。
 * @type {{conversation: string, inputMode: string, ocrText: string, currentViewParty: string|null, shareAnalysisRef: object|null, shareBound: boolean, lastClickX: number, lastClickY: number}}
 */
export const state = {
  conversation: '',
  inputMode: 'paste',
  ocrText: '',
  currentViewParty: null,
  shareAnalysisRef: null,
  shareBound: false,
  lastClickX: 0,
  lastClickY: 0,
};

/** localStorage key：关系账本 */
const RELATIONS_KEY = 'zhijian-relations';

/** 24 小时（ms）：去重时间窗 */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 空账本工厂 */
/**
 * @typedef {Object} RelationEvent
 * @property {string} id
 * @property {number} at
 * @property {'family'|'partner'|'friend'|'child'|'colleague'|'none'} scene
 * @property {number} gain
 * @property {'analysis'|'water'|'animal'} source
 * @property {string} dedupeKey
 * @property {string} hint
 */

/**
 * @typedef {Object} RelationBucket
 * @property {number} total
 * @property {RelationEvent[]} events
 */

/**
 * @typedef {Object} RelationStore
 * @property {RelationBucket} family
 * @property {RelationBucket} partner
 * @property {RelationBucket} friend
 * @property {RelationBucket} child
 * @property {RelationBucket} colleague
 * @property {RelationBucket} none
 */

/**
 * 空账本工厂。
 * 键集合派生自 ALL_NODE_IDS（单一派生源）——新增节点只改 core/nodes.js 一处。
 * @returns {RelationStore}
 */
function emptyStore() {
  return Object.fromEntries(ALL_NODE_IDS.map((id) => [id, { total: 0, events: [] }]));
}

/**
 * 补齐缺失字段，防止老数据结构导致渲染崩溃。
 *
 * 前向兼容（禁止 version 字段、禁止迁移脚本）：
 *   本函数以 emptyStore() 为底逐键填充。旧数据（仅 3/4 个桶）读入后，
 *   缺失节点（child / colleague）自动补 0，旧数据零丢失。
 *   遍历数组与 emptyStore 的键集合天然一致（二者同派生自 ALL_NODE_IDS）。
 * @param {Partial<RelationStore>} raw
 * @returns {RelationStore}
 */
function normalizeStore(raw) {
  const base = emptyStore();
  // 数组也满足 typeof === 'object'，须显式排除
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  for (const node of ALL_NODE_IDS) {
    const entry = raw[node];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      base[node].total = Number.isFinite(entry.total) ? entry.total : 0;
      base[node].events = Array.isArray(entry.events) ? entry.events : [];
    }
  }
  return base;
}

/**
 * 读关系账本（garden.js / report.js 均只读）。
 * @returns {RelationStore}
 */
export function readRelations() {
  try {
    const raw = localStorage.getItem(RELATIONS_KEY);
    if (!raw) return emptyStore();
    return normalizeStore(JSON.parse(raw));
  } catch (err) {
    console.warn('[relations] 读取账本失败，返回空账本', err);
    return emptyStore();
  }
}

/**
 * 写关系账本（仅 applyAnalysisToGarden 内部调用；外部不得直接调）。
 * @param {RelationStore} store
 */
function writeRelations(store) {
  localStorage.setItem(RELATIONS_KEY, JSON.stringify(store));
}

/** FNV-1a 32 位哈希（纯 JS、同步、非加密、仅去重） @param {string} str @returns {string} 8 位十六进制 */
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * 计算去重键：优先 crypto.subtle SHA-1（异步），不可用时降级 FNV-1a。
 * 只存哈希，不存对话明文（与产品隐私底线一致）。
 * @param {string} conversation
 * @returns {Promise<string>} 16 位十六进制前缀
 */
export async function computeDedupeKey(conversation) {
  const normalized = normalizeConversation(conversation);
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const bytes = new TextEncoder().encode(normalized);
      const buffer = await crypto.subtle.digest('SHA-1', bytes);
      const arr = Array.from(new Uint8Array(buffer));
      const hex = arr.map((b) => b.toString(16).padStart(2, '0')).join('');
      return hex.slice(0, 16);
    }
  } catch (err) {
    console.warn('[relations] crypto.subtle 不可用，降级 FNV-1a', err);
  }
  return (fnv1a(normalized) + fnv1a(normalized + '#salt')).slice(0, 16);
}

/** 生成事件 id：'evt_' + 时间戳 + 随机后缀 */
function makeEventId(now) {
  return `evt_${now}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 由节点名生成内部 hint（仅调试/文案生成用，不显示给用户）。派生自 core/nodes.js */
function sceneHint(node) {
  return displayOf(node);
}

/**
 * 把一次成功分析写入关系账本。仅此函数可写 zhijian-relations。
 * fire-and-forget：内部自吞异常，绝不向调用方抛错。
 * @param {object} analysis - 合法分析对象（caller 需确保非空）
 * @param {object} [opts]
 * @param {string} [opts.conversation] - 用于计算 dedupeKey（不存储明文）
 * @param {'family'|'partner'|'friend'|'child'|'colleague'} [opts.explicitScene] - P1 用户显式选择（本轮不传）
 * @param {number} [opts.gain=10] - 本次养分增量
 * @returns {Promise<{scored: boolean, node: string}>} scored=false 表示被去重；
 *          任何内部异常都静默返回 { scored:false, node:'none' }
 */
export async function applyAnalysisToGarden(analysis, opts = {}) {
  try {
    // 守卫必须排除数组：typeof [] === 'object'，若只判 typeof 会放行空数组
    if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
      return { scored: false, node: NONE_ID };
    }
    // opts 同理：数组 / null 都不合法，回落为默认空对象
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
      opts = {};
    }
    const gain = Number.isFinite(opts.gain) ? opts.gain : 10;
    const conversation = opts.conversation || '';

    // ① 判定主轴（core/relations.js 纯函数）
    const node = resolveRelationTarget(analysis, {
      explicitScene: opts.explicitScene,
      conversation,
    });

    // ② 计算 dedupeKey
    const dedupeKey = await computeDedupeKey(conversation);

    // ③ 读账本
    const store = readRelations();
    const bucket = store[node];

    const now = Date.now();
    const hit = bucket.events.find(
      (evt) => evt && evt.dedupeKey === dedupeKey && now - evt.at < DEDUPE_WINDOW_MS
    );

    if (hit) {
      // 24h 内命中 → 不加分，仅刷 at + 轻脉冲
      hit.at = now;
      writeRelations(store);
      return { scored: false, node };
    }

    // 未命中（或超 24h）→ 正常写入并 total += gain
    bucket.total += gain;
    bucket.events.push({
      id: makeEventId(now),
      at: now,
      scene: node,
      gain,
      source: 'analysis',
      dedupeKey,
      hint: sceneHint(node),
    });

    // ④ 落盘
    writeRelations(store);

    // none 兜底：只增总量，不增任何 family/partner/friend（D.5）
    // zhijian-nurture 总量同步增量（页面不显示分数，仅顶部卡片）
    try {
      const prevTotal = parseInt(localStorage.getItem('zhijian-nurture') || '0', 10);
      const base = Number.isNaN(prevTotal) ? 0 : prevTotal;
      localStorage.setItem('zhijian-nurture', String(base + gain));
    } catch (err) {
      console.warn('[relations] 总量写入失败（不影响报告展示）', err);
    }

    return { scored: true, node };
  } catch (err) {
    console.warn('[relations] 写入失败（不影响报告展示）', err);
    return { scored: false, node: NONE_ID }; // 吞掉异常
  }
}
