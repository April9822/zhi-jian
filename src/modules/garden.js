// src/modules/garden.js —— 关系花园（关系星图 + 角色形态 + none 兜底）
// 一句话记忆：core 管账本，report 记账，garden 看账。
// garden.js 只读账本（readRelations()），不得导出任何写入函数。
import { readRelations, readRelationsByPerson, resolveAnimalSprite, renameWhoInRelation } from '../core/state.js';
import { $, $$, byId } from '../core/dom.js';
import { showToast, escapeHtml } from '../core/utils.js';
import { goTo } from '../core/router.js';
import { NODES, NAMED_NODE_IDS, displayOf, RELATION_CAPS } from '../core/nodes.js';
import { regionStatusOf, EMPTY_STATE_TEXT, SEASON_TEXT, SEASON_DESC } from '../core/copy.js';

/** 季节常量（去 var，仅复用） */
export const SEASONS = ['冬 · 沉淀季', '春 · 生长季', '夏 · 繁盛季', '秋 · 收获季'];

/** 形态三态 → class 后缀（T04：区域形态三态，PRD §7.1.0） */
const SHAPE_CLASSES = ['state--calm', 'state--growing', 'state--bloom'];

/**
 * 缺省锚点（DOM 查询失败时的回退，架构 A.3.3，6 键全覆盖）。
 * 坐标取自架构 §A.3.2（归一化 0–100，相对 #garden-scene），满足同层间距 >20%。
 * ⚠️ 必须含全部具名节点键：若缺键，DOM 查询失败时会得到 undefined ->
 *    bandPath(self, undefined) -> 「M undefined undefined」-> 整条根脉消失。
 */
export const FALLBACK_ANCHORS = {
  self: { x: 50, y: 72 },
  family: { x: 24, y: 40 },
  partner: { x: 56, y: 42 },
  friend: { x: 78, y: 62 },
  child: { x: 36, y: 64 },
  colleague: { x: 81, y: 30 },
};

/** 「档位 × 季节」状态文案表（P1-5：集中一张表便于审校） */
export const STATUS_TEXT = {
  thin: {
    0: '关系在安静地沉淀',
    1: '你的关系正在慢慢生长',
    2: '关系正待滋养',
    3: '你收获了一些理解',
  },
  mid: {
    0: '关系在安静地沉淀',
    1: '连接在生长 · 你的关系正在慢慢生长',
    2: '关系正值繁盛',
    3: '你收获了一些理解',
  },
  thick: {
    0: '关系在安静地沉淀',
    1: '连接很活跃',
    2: '关系正值繁盛',
    3: '连接正繁盛',
  },
  full: {
    0: '关系在安静地沉淀',
    1: '连接正繁盛',
    2: '关系正值繁盛',
    3: '连接正繁盛',
  },
};

const BAND_TIERS = ['thin', 'mid', 'thick', 'full'];

// ============================================================
// 纯函数（可单测）
// ============================================================

/**
 * 养分 → 档位（逐节点判定）。
 * @param {number} total - 该节点自身 total（0–33 / 34–66 / 67+ / ≥100）
 * @returns {'thin'|'mid'|'thick'|'full'}
 */
export function nurtureTier(total) {
  const n = Number(total) || 0;
  if (n >= 100) return 'full';
  if (n >= 67) return 'thick';
  if (n >= 34) return 'mid';
  return 'thin';
}

/**
 * 生成一条轻微下垂的二次贝塞尔路径（Q）。
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {string}
 */
export function bandPath(a, b) {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + Math.abs(b.x - a.x) * 0.12; // 下垂量随水平跨度增长
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/**
 * 依据档位生成根脉分叉路径段（纯函数，可单测）。
 *
 * 从主干二次贝塞尔的控制点推算分叉起点，保证几何连续（分叉从主干中段长出）。
 * 分叉不由 CSS 生成（CSS 无法在 `d` 属性上做条件分支），由 JS 在 WRITE 阶段决定。
 * @param {string} mainD - 主干 path 的 d 属性（形如 'M x0 y0 Q cx cy x1 y1'）
 * @param {'thin'|'mid'|'thick'|'full'} tier - 档位
 * @returns {string[]} 分叉路径段数组（thin 返回空数组；mid 2 条；thick/full 3 条）
 */
export function rootVeinPaths(mainD, tier) {
  // 解析主干 'M x0 y0 Q cx cy x1 y1'
  const m = String(mainD ?? '').match(
    /M\s*([\d.-]+)\s+([\d.-]+)\s+Q\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/
  );
  if (!m) return [];
  const x0 = Number(m[1]);
  const y0 = Number(m[2]);
  const cx = Number(m[3]);
  const cy = Number(m[4]);
  const x1 = Number(m[5]);
  const y1 = Number(m[6]);

  if (tier === 'thin') return [];

  // 二次贝塞尔取点：B(t) = (1-t)^2 * P0 + 2(1-t)t * C + t^2 * P1
  const pointAt = (t) => {
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    };
  };

  const branchAt = (t, len, spread) => {
    const p = pointAt(t);
    // 沿主干方向（P1-P0）与法线方向偏移，生成一段小分叉
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.hypot(dx, dy) || 1;
    const nx = dx / n;
    const ny = dy / n;
    // 法线（垂直）
    const px = -ny;
    const py = nx;
    // 分叉终点：沿主干方向前进 len + 法线偏移 spread
    const ex = p.x + nx * len + px * spread;
    const ey = p.y + ny * len + py * spread;
    // 控制点：起点与终点中点再向外偏一点，形成自然弧度
    const qx = (p.x + ex) / 2 + px * spread * 0.5;
    const qy = (p.y + ey) / 2 + py * spread * 0.5;
    return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} Q ${qx.toFixed(2)} ${qy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  };

  if (tier === 'mid') {
    // 2 条小分叉（左右各一）
    return [branchAt(0.45, 6, 5), branchAt(0.7, 6, -5)];
  }
  // thick / full：3 条分叉（左右 + 端部）
  return [branchAt(0.4, 7, 6), branchAt(0.65, 7, -6), branchAt(0.85, 5, 3)];
}

/** 按月份映射季节索引（12–2 冬 / 3–5 春 / 6–8 夏 / 9–11 秋） */
export function getSeasonIndex() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 1;
  if (month >= 6 && month <= 8) return 2;
  if (month >= 9 && month <= 11) return 3;
  return 0;
}

/** 当前季节名称 */
export function getSeasonName() {
  return SEASONS[getSeasonIndex()] || '春 · 生长季';
}

/** 季节索引 → 场景 class 后缀 */
const SEASON_CLASS = ['season-winter', 'season-spring', 'season-summer', 'season-autumn'];

/**
 * 给 #garden-scene 施加季节 class，并按季节渲染专属装饰；
 * 同时施加 18 岁年龄门槛（未满 18 隐藏爱人小花 partner/eco-flower）。
 * 纯视觉，不读取任何 getBoundingClientRect()，不写账本。
 */
function applySceneClasses() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const idx = getSeasonIndex();
  scene.classList.remove(...SEASON_CLASS);
  scene.classList.add(SEASON_CLASS[idx]);
  renderSeasonDecor(scene, idx);

  // 18 岁门槛：未满 18 隐藏爱人小花（古树/动物/新芽不受限）
  const age = Number(localStorage.getItem('zhijian-age'));
  const restricted = Number.isFinite(age) && age > 0 && age < 18;
  scene.classList.toggle('age-restricted', restricted);
}

/**
 * 按季节生成专属装饰（冬雪 / 春鸟 / 秋叶+果；夏由 CSS 强化阳光，不生成 DOM）。
 * 装饰层 pointer-events:none，不阻挡交互。
 * @param {HTMLElement} scene
 * @param {number} idx - 季节索引 0–3
 */
function renderSeasonDecor(scene, idx) {
  let deco = scene.querySelector('.season-deco');
  if (!deco) {
    deco = document.createElement('div');
    deco.className = 'season-deco';
    scene.appendChild(deco);
  }
  deco.textContent = '';
  deco.className = 'season-deco';

  if (idx === 0) {
    // 冬 · 下雪
    for (let i = 0; i < 20; i += 1) {
      const s = document.createElement('span');
      s.className = 'snow';
      s.style.left = `${(i * 5 + Math.random() * 3).toFixed(1)}%`;
      s.style.animationDelay = `${(Math.random() * 6).toFixed(1)}s`;
      s.style.animationDuration = `${(4 + Math.random() * 4).toFixed(1)}s`;
      deco.appendChild(s);
    }
  } else if (idx === 1) {
    // 春 · 小鸟
    const b = document.createElement('span');
    b.className = 'bird';
    deco.appendChild(b);
  } else if (idx === 3) {
    // 秋 · 金黄落叶 + 成熟果实
    for (let i = 0; i < 14; i += 1) {
      const l = document.createElement('span');
      l.className = 'autumn-leaf';
      l.style.left = `${(i * 7 + Math.random() * 4).toFixed(1)}%`;
      l.style.animationDelay = `${(Math.random() * 6).toFixed(1)}s`;
      deco.appendChild(l);
    }
    const f = document.createElement('span');
    f.className = 'fruit';
    deco.appendChild(f);
  }
  // 夏（idx===2）：仅 CSS 强化阳光，无需额外 DOM
}

/**
 * 锚点换算：把 DOM 元素中心转成相对 garden-scene 的百分比（0-100）。
 * @param {HTMLElement} el
 * @param {DOMRect} sceneRect
 * @returns {{x:number,y:number}}
 */
export function anchorOf(el, sceneRect) {
  const r = el.getBoundingClientRect();
  return {
    x: ((r.left + r.width / 2 - sceneRect.left) / sceneRect.width) * 100,
    y: ((r.top + r.height / 2 - sceneRect.top) / sceneRect.height) * 100,
  };
}

// ============================================================
// 关系账本读取辅助（只读）
// ============================================================
/** 判断某关系节点是否存在记录（无记录 → 不画连接带） */
function isNodePresent(relations, node) {
  const bucket = relations[node];
  return Boolean(bucket && bucket.events && bucket.events.length > 0);
}

/** 取当前存在的角色节点（NAMED_NODE_IDS 中有记录者） */
function presentNodes(relations) {
  return NAMED_NODE_IDS.filter((node) => isNodePresent(relations, node));
}

// ============================================================
// 星图渲染
// ============================================================
/** 获取（或创建）星图 SVG 根节点 */
function ensureGraphSvg() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return null;
  let svg = scene.querySelector('.relation-graph');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'relation-graph');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    scene.appendChild(svg);
  }
  return svg;
}

/** 取某关系节点对应的 DOM 元素 id（未定义时返回 null）。派生自 core/nodes.js */
function nodeElId(node) {
  const entry = NODES.find((n) => n.id === node);
  return entry ? entry.elId : null;
}

/**
 * 按 present 角色生成/更新根脉（自我 → 各角色）。
 * 某节点无记录 → 不生根脉；none 节点永不生根脉（G4）。
 *
 * ⚠️ 布局抖动防护（读/写分离，T03 必须保留的两阶段结构）：
 *   `getBoundingClientRect()` 是强制同步布局。若「读一个 rect → 写一个属性 →
 *   再读下一个 rect」交替，浏览器会对每个节点反复重排（layout thrashing）。
 *   因此本函数分两阶段：
 *     ① READ  —— 一次性读完 sceneRect + self + 全部目标锚点
 *     ② WRITE —— 只操作 SVG，此后不再调用任何 getBoundingClientRect()
 *   N 次强制布局被压成 1 次。这是比 debounce 更根本的解法。
 *   五节点比三节点更严重，务必保持。
 */
export function renderRelationGraph() {
  // ① READ 阶段：先把所有测量一次性做完
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const sceneRect = scene.getBoundingClientRect(); // 全流程唯一一次 rect 读取的基准

  const relations = readRelations();
  const presents = presentNodes(relations);

  const selfEl = byId('eco-seedling');
  const selfAnchor = selfEl ? anchorOf(selfEl, sceneRect) : FALLBACK_ANCHORS.self;

  const anchors = presents.map((node) => {
    const elId = nodeElId(node);
    const el = elId ? byId(elId) : null;
    // FALLBACK_ANCHORS 缺键防呆：缺失时降级 self 并告警，绝不产出 undefined 坐标
    let pt = el ? anchorOf(el, sceneRect) : FALLBACK_ANCHORS[node];
    if (!pt) {
      console.warn(`[garden] FALLBACK_ANCHORS 缺键：${node}，降级为 self 锚点`);
      pt = FALLBACK_ANCHORS.self;
    }
    return { node, pt };
  });
  // —— 至此测量结束，下方进入纯写入阶段 ——

  // ② WRITE 阶段：不再读取任何 rect
  const svg = ensureGraphSvg();
  if (!svg) return;

  while (svg.firstChild) svg.removeChild(svg.firstChild); // 清空旧根脉
  if (anchors.length === 0) return;

  for (const { node, pt } of anchors) {
    const d = bandPath(selfAnchor, pt);

    // 主干（始终存在）
    const rootMain = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rootMain.setAttribute('class', 'root-main');
    rootMain.setAttribute('d', d);
    rootMain.setAttribute('fill', 'none');
    rootMain.setAttribute('vector-effect', 'non-scaling-stroke');

    // 光点层（与主干同 d；仅 thick/full 由 CSS 显示）
    const rootSpark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rootSpark.setAttribute('class', 'root-spark');
    rootSpark.setAttribute('d', d);
    rootSpark.setAttribute('fill', 'none');
    rootSpark.setAttribute('vector-effect', 'non-scaling-stroke');

    // 命中区（加宽透明路径，便于 hover/点击，≥44px 热区）
    const rootHit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rootHit.setAttribute('class', 'root-vein-hit');
    rootHit.setAttribute('d', d);
    rootHit.setAttribute('fill', 'none');
    rootHit.dataset.node = node;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'root-vein');
    g.dataset.node = node;
    g.appendChild(rootHit);
    g.appendChild(rootMain);
    g.appendChild(rootSpark);
    svg.appendChild(g);
  }

  updateRelationshipBands(); // 纯 class 操作，无 rect 读取；按档位追加分叉
}

/**
 * 逐节点判定档位并施加 class，同时按档位注入根脉分叉。
 * 档位依据 = 各节点自身 zhijian-relations.<node>.total（逐节点分量，非全局 zhijian-nurture）。
 * ⚠️ 本函数处于 WRITE 阶段，绝不读取任何 getBoundingClientRect()。
 */
export function updateRelationshipBands() {
  const relations = readRelations(); // zhijian-relations
  const svg = document.querySelector('.relation-graph');
  if (!svg) return;

  for (const node of presentNodes(relations)) {
    const total = relations[node] && relations[node].total;
    const tier = nurtureTier(total); // 逐节点判定
    const g = svg.querySelector(`.root-vein[data-node="${node}"]`);
    if (!g) continue;
    BAND_TIERS.forEach((t) => g.classList.remove(`root-vein--${t}`));
    g.classList.add(`root-vein--${tier}`);

    // 分叉注入（mid 2 条 / thick·full 3 条 / thin 无）—— 纯 SVG 操作，无 rect 读取
    const main = g.querySelector('.root-main');
    const mainD = main ? main.getAttribute('d') : '';
    const branches = rootVeinPaths(mainD, tier);
    // 清旧分叉
    g.querySelectorAll('.root-branch').forEach((el) => el.remove());
    for (const bd of branches) {
      const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      branch.setAttribute('class', 'root-branch');
      branch.setAttribute('d', bd);
      branch.setAttribute('fill', 'none');
      branch.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(branch);
    }
  }
}

// ============================================================
// none 兜底视觉（≤5 个，永不连线）
// ============================================================
export function renderNoneFallback() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  // 清掉旧的无名记录
  $$('.garden-leaf, .nameless-bloom', scene).forEach((el) => el.remove());

  const relations = readRelations();
  const count = Math.min(
    relations.none && relations.none.events ? relations.none.events.length : 0,
    5
  );
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('span');
    // 偶数叶、奇数花，交替点缀
    el.className = i % 2 === 0 ? 'garden-leaf' : 'nameless-bloom';
    el.style.left = `${12 + i * 17}%`;
    el.style.animationDelay = `${i * 0.8}s`;
    scene.appendChild(el);
  }
}

// ============================================================
// 顶部卡片总量（读 zhijian-nurture，不驱动连线）
// ============================================================
/** 读总量 @returns {number} */
export function getNurture() {
  const v = parseInt(localStorage.getItem('zhijian-nurture') || '0', 10);
  return Number.isNaN(v) ? 0 : v;
}

/** 加总量 + 刷新 UI + 刷新带 + 刷新形态/胶囊/空状态 */
export function addNurture(n) {
  localStorage.setItem('zhijian-nurture', String(getNurture() + n));
  updateNurtureUI();
  updateRelationshipBands();
  updateRegionShapes();
  renderRegionCapsules();
  renderEmptyState();
}

/** 更新顶部卡片数字 + 状态文案（档位 × 季节） + 季节按钮文案 */
export function updateNurtureUI() {
  const el = byId('nurture-total');
  if (el) el.textContent = String(getNurture());

  // 顶部季节文本按钮（PRD §7.4：可点击的文本按钮，无图标、无箭头堆叠）
  const seasonBtn = byId('season-toggle');
  if (seasonBtn) {
    seasonBtn.textContent = `${getSeasonName()} ▾`;
  }

  const status = byId('nurture-status');
  if (status) {
    const relations = readRelations();
    const presents = presentNodes(relations);
    if (presents.length === 0) {
      status.textContent = '先记录一段对话，让关系显现';
    } else {
      // 取所有 present 节点中最高的档位作为总览文案
      let topTier = 'thin';
      for (const node of presents) {
        const tier = nurtureTier(relations[node] ? relations[node].total : 0);
        if (BAND_TIERS.indexOf(tier) > BAND_TIERS.indexOf(topTier)) topTier = tier;
      }
      const season = getSeasonIndex();
      status.textContent = (STATUS_TEXT[topTier] || STATUS_TEXT.thin)[season] || '';
    }
  }
}

// ============================================================
// 角色形态三档联动（双线：连接带 + 角色形态）
// ============================================================
export function updateRoleForms() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const relations = readRelations();
  for (const node of NAMED_NODE_IDS) {
    // 多元素节点（家人/朋友）：形态由 renderMultiElements 按人施加，此处跳过
    if (RELATION_CAPS[node]) continue;
    const elId = nodeElId(node);
    const el = elId ? byId(elId) : null;
    if (!el) continue;
    const present = isNodePresent(relations, node);
    el.classList.remove('form--thin', 'form--mid', 'form--thick', 'form--full', 'form--absent');
    if (!present) {
      el.classList.add('form--absent');
      continue;
    }
    const tier = nurtureTier(relations[node].total);
    el.classList.add(`form--${tier}`);
  }
}

// ============================================================
// 区域形态三态 + 胶囊文案（T04，PRD §7.1.0 / §7.3）
// ============================================================
/**
 * 逐区域施加形态三态 class（state--calm / growing / bloom）。
 * 与根脉「同源同档」：同一个养分分量同时驱动根脉档位与区域形态，
 * 保证「根粗了 ↔ 那处也长丰富了」因果可读（PRD §7.1.0）。
 *
 * ⚠️ 三态是「变丰富」（新枝/花/鱼/树洞/鸟巢/新帐篷……），由 CSS 按 class
 *    显示/隐藏子元素实现，整株**不被等比放大**（宪法禁令：禁用乘法缩放）。
 * ⚠️ 本函数处于 WRITE 阶段，绝不读取任何 getBoundingClientRect()。
 */
export function updateRegionShapes() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const relations = readRelations();
  for (const node of NAMED_NODE_IDS) {
    // 多元素节点（家人/朋友）：区域三态沿用单元素逻辑无意义，交由 renderMultiElements
    if (RELATION_CAPS[node]) continue;
    const elId = nodeElId(node);
    const el = elId ? byId(elId) : null;
    if (!el) continue;
    el.classList.remove(...SHAPE_CLASSES);
    const present = isNodePresent(relations, node);
    if (!present) continue; // 无记录 → 不施加三态（保持缺席态，由 form--absent 控制）
    const tier = nurtureTier(relations[node].total);
    el.classList.add(`state--${tierToShapeKey(tier)}`);
  }
}

/**
 * 档位 → 三态键（thin→calm / mid→growing / thick·full→bloom）。
 * 与 core/copy.js 的 tierToShape 同口径，本处内联避免跨模块重复取整。
 * @param {'thin'|'mid'|'thick'|'full'} tier
 * @returns {'calm'|'growing'|'bloom'}
 */
export function tierToShapeKey(tier) {
  if (tier === 'thick' || tier === 'full') return 'bloom';
  if (tier === 'mid') return 'growing';
  return 'calm';
}

// ============================================================
// 多元素渲染（家人=古树 / 朋友=动物，按「人(who)」动态生成）
// 数据来源：readRelationsByPerson(node)（见 core/state.js）。
// ⚠️ 宪法纪律：本文件不得出现关系节点 id 字面量（家人/朋友/爱人/孩子/同事）。
//    - 多元素节点集合由 Object.keys(RELATION_CAPS) 派生（无字面量）。
//    - 形态分支用「元素 id（eco-tree / eco-stream，非节点字面量）」识别。
//    - 生成元素的 data-anchor 取变量 node，不写字面量。
// ============================================================

/**
 * 生成/更新全部「多元素关系」（家人古树 + 朋友动物）。
 * 由 initGarden / navigate 事件驱动；元素随 readRelationsByPerson 的 who 分布重建。
 */
export function renderMultiElements() {
  for (const node of Object.keys(RELATION_CAPS)) {
    renderPersonCluster(node);
  }
}

/** 构建动物精灵 innerHTML（纯函数，插值经 escapeHtml） */
function buildAnimalSpriteHTML(sprite) {
  return `<span class="animal-sprite ${escapeHtml(sprite)}-sprite" aria-hidden="true"></span>`;
}

/** 构建古树结构 innerHTML（纯函数，无插值） */
function buildTreeItemHTML() {
  return (
    '<div class="tree-roots"><span class="root"></span><span class="root"></span><span class="root"></span></div>' +
    '<div class="tree-trunk"><span class="trunk-ring"></span></div>' +
    '<div class="tree-crowns"><span class="tc tc1"></span><span class="tc tc2"></span><span class="tc tc3"></span></div>'
  );
}

/**
 * 为单个多元素关系节点渲染「按人分布」的元素。
 * @param {string} node - 关系节点 id（变量，非字面量）
 */
function renderPersonCluster(node) {
  const host = byId(nodeElId(node));
  if (!host) return;

  // 清旧动态元素（统一用 data-person-item 标记，便于全量重建）
  host.querySelectorAll('[data-person-item]').forEach((el) => el.remove());

  const elId = nodeElId(node);
  // 朋友动物挂在 .stream-animals 子容器；家人古树直接挂在 #eco-tree
  const animalsWrap = elId === 'eco-stream' ? host.querySelector('.stream-animals') : null;
  const target = animalsWrap || host;

  const persons = readRelationsByPerson(node);
  if (persons.length === 0) return;

  const isAnimal = elId === 'eco-stream';

  persons.forEach((p) => {
    const tier = nurtureTier(p.total);
    if (isAnimal) {
      const sprite = resolveAnimalSprite(p.who);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `animal form--${tier}`;
      btn.dataset.personItem = '';
      btn.dataset.animal = sprite;
      btn.dataset.anchor = node;
      btn.dataset.who = p.who;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `${p.who} 的小伙伴`);
      btn.innerHTML = buildAnimalSpriteHTML(sprite);
      const label = document.createElement('span');
      label.className = 'who-label';
      label.textContent = p.who;
      btn.appendChild(label);
      target.appendChild(btn);
    } else {
      const item = document.createElement('div');
      item.className = `eco-tree-item form--${tier}`;
      item.dataset.personItem = '';
      item.dataset.anchor = node; // 变量，非字面量；供浇灌/点击命中
      item.dataset.who = p.who;
      item.setAttribute('role', 'img');
      item.setAttribute('aria-label', `${p.who} 的古树`);
      item.innerHTML = buildTreeItemHTML();
      const label = document.createElement('span');
      label.className = 'who-label';
      label.textContent = p.who;
      item.appendChild(label);
      target.appendChild(item);
    }
  });
}

/**
 * 渲染/更新五区域「关系标签浮层胶囊」（PRD §7.3）。
 * 结构两行：① 关系名（无 emoji）② 由三态驱动的定性短语（≤12 字）。
 * 胶囊文案来自 core/copy.js::REGION_STATUS_TEXT，按区域各有措辞。
 * ⚠️ 无记录的区域不显示胶囊（不是灰占位）。
 */
export function renderRegionCapsules() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const relations = readRelations();
  for (const node of NAMED_NODE_IDS) {
    const elId = nodeElId(node);
    const host = elId ? byId(elId) : null;
    if (!host) continue;
    // 清除旧胶囊（本次重绘全量重建）
    host.querySelectorAll('.region-capsule').forEach((el) => el.remove());
    if (!isNodePresent(relations, node)) continue;

    const tier = nurtureTier(relations[node].total);
    const phrase = regionStatusOf(node, tier);
    if (!phrase) continue;

    const meta = NODES.find((n) => n.id === node);
    const name = meta ? meta.display : displayOf(node);

    const capsule = document.createElement('div');
    capsule.className = 'region-capsule';
    capsule.dataset.node = node;

    const line1 = document.createElement('span');
    line1.className = 'capsule-name';
    line1.textContent = name;

    const line2 = document.createElement('span');
    line2.className = 'capsule-phrase';
    line2.textContent = phrase;

    capsule.appendChild(line1);
    capsule.appendChild(line2);
    host.appendChild(capsule);
  }
}

// ============================================================
// 空状态（T04，PRD §7.5.1）
// ============================================================
/**
 * 空状态判定：关系账本是否「全空」（无任何具名节点有事件）。
 * @param {object} relations
 * @returns {boolean}
 */
export function isEmptyGarden(relations) {
  return NAMED_NODE_IDS.every((node) => !isNodePresent(relations, node));
}

/**
 * 渲染/移除空状态覆盖层（PRD §7.5.1）。
 * 全空 → 显示「这里还是一片空地。 / 说一段话，它会开始长。」
 *   且给 scene 施加 `garden-empty` 类（五区域全隐、仅留幼苗）。
 * 非空 → 移除覆盖层与类。
 */
export function renderEmptyState() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const relations = readRelations();
  const empty = isEmptyGarden(relations);

  scene.classList.toggle('garden-empty', empty);

  let overlay = scene.querySelector('.garden-empty-state');
  if (!empty) {
    if (overlay) overlay.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'garden-empty-state';
    const title = document.createElement('p');
    title.className = 'empty-title';
    title.textContent = EMPTY_STATE_TEXT.title;
    const sub = document.createElement('p');
    sub.className = 'empty-subtitle';
    sub.textContent = EMPTY_STATE_TEXT.subtitle;
    overlay.appendChild(title);
    overlay.appendChild(sub);
    scene.appendChild(overlay);
  } else {
    overlay.querySelector('.empty-title').textContent = EMPTY_STATE_TEXT.title;
    overlay.querySelector('.empty-subtitle').textContent = EMPTY_STATE_TEXT.subtitle;
  }
}

// ============================================================
// 花园季节轻浮层（T04，PRD §7.4）
// ============================================================
/**
 * 渲染季节浮层内容（四行：每行 = 定性描述一句 + 「当前」标记）。
 * 四季由「月份 + 关系生长状态」决定，**不可切换**（PRD §7.4）。
 * @param {HTMLElement} sheet - 浮层容器（.season-sheet-list）
 * @param {number} currentIdx - 当前季节索引 0–3
 */
export function renderSeasonSheet(sheet, currentIdx) {
  if (!sheet) return;
  sheet.textContent = '';
  for (let i = 0; i < SEASON_TEXT.length; i += 1) {
    const row = document.createElement('div');
    row.className = 'season-row';
    if (i === currentIdx) row.classList.add('season-row--current');

    const name = document.createElement('span');
    name.className = 'season-row-name';
    name.textContent = SEASONS[i] || '';

    const desc = document.createElement('span');
    desc.className = 'season-row-desc';
    desc.textContent = SEASON_DESC[i] || '';

    row.appendChild(name);
    row.appendChild(desc);

    if (i === currentIdx) {
      const tag = document.createElement('span');
      tag.className = 'season-row-tag';
      tag.textContent = '当前';
      row.appendChild(tag);
    }
    sheet.appendChild(row);
  }
}

/** 打开/关闭季节浮层（bottom sheet，约 40% 屏高） */
export function toggleSeasonSheet(force) {
  const sheet = byId('season-sheet');
  if (!sheet) return;
  const open = typeof force === 'boolean' ? force : !sheet.classList.contains('open');
  sheet.classList.toggle('open', open);
  sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    const list = sheet.querySelector('.season-sheet-list');
    renderSeasonSheet(list, getSeasonIndex());
  }
}

// ============================================================
// 浇灌反馈
// ============================================================
/**
 * 浇灌反馈动效（水珠 + 闪亮）。
 * @param {string|HTMLElement} creatureOrId - 元素 id 或元素本身（向后兼容）
 * @returns {void}
 */
export function waterCreature(creatureOrId) {
  const creature =
    typeof creatureOrId === 'string' ? byId(creatureOrId) : creatureOrId;
  if (!creature || !creature.getBoundingClientRect) return;

  const rect = creature.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.3;

  for (let i = 0; i < 3; i += 1) {
    setTimeout(() => {
      const drop = document.createElement('span');
      drop.className = 'water-drop';
      drop.style.left = `${cx + (Math.random() - 0.5) * 30}px`;
      drop.style.top = `${cy}px`;
      drop.style.animationDelay = '0s';
      document.body.appendChild(drop);
      setTimeout(() => {
        if (drop.parentNode) drop.remove();
      }, 1200);
    }, i * 150);
  }

  creature.classList.add('creature-flash');
  setTimeout(() => creature.classList.remove('creature-flash'), 900);
}

/** 浇灌花园（+1 养分） */
export function waterGarden() {
  addNurture(1);
  const relations = readRelations();
  const presents = presentNodes(relations);
  const targetId = presents.length > 0 ? nodeElId(presents[0]) : 'eco-tree';
  waterCreature(targetId || 'eco-tree');
  showToast('+1 关系养分');
}

// ============================================================
// Canvas 光斑
// ============================================================
export function initGardenCanvas() {
  const gc = byId('gardenCanvas');
  if (!gc || gc.dataset.init) return;
  gc.dataset.init = '1';

  const ctx = gc.getContext('2d');
  const host = gc.parentElement || gc;
  let W = 0;
  let H = 0;
  function sizeCanvas() {
    const r = host.getBoundingClientRect();
    W = r.width || window.innerWidth;
    H = r.height || window.innerHeight;
    gc.width = W;
    gc.height = H;
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  const dapples = [];
  for (let i = 0; i < 25; i += 1) {
    dapples.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.7,
      r: Math.random() * 3 + 1.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1 - 0.05,
      o: Math.random() * 0.5 + 0.15,
      phase: Math.random() * 6.28,
      pulse: Math.random() * 2 + 1.5,
    });
  }

  function drawGarden() {
    const gs = byId('garden-screen');
    if (!gs || !gs.classList.contains('active')) {
      requestAnimationFrame(drawGarden);
      return;
    }
    ctx.clearRect(0, 0, W, H);

    const ms = Date.now() * 0.001;
    dapples.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -20) d.x = W + 20;
      if (d.x > W + 20) d.x = -20;
      if (d.y < -20) d.y = H + 20;
      if (d.y > H * 0.8) d.y = -20;

      const a = d.o + Math.sin(ms * d.pulse + d.phase) * 0.12;
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3);
      g.addColorStop(0, `rgba(255,248,235,${Math.max(0, a)})`);
      g.addColorStop(0.5, `rgba(243,227,193,${Math.max(0, a * 0.5)})`);
      g.addColorStop(1, 'rgba(243,227,193,0)');
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 3, 0, 6.28);
      ctx.fillStyle = g;
      ctx.fill();
    });

    requestAnimationFrame(drawGarden);
  }
  drawGarden();
}

// ============================================================
// 事件绑定
// ============================================================
function bindGardenEvents() {
  // 顶部「+ 倾诉」
  byId('garden-top-analyze')?.addEventListener('click', () => goTo('input-screen'));

  // 底部导航：统一由 core/router.js 的 [data-nav] 委托处理（含高亮同步），
  // 此处不再重复绑定，避免同一 goTo 被触发两次。

  // 顶部季节文本按钮 -> 打开/关闭季节轻浮层（不可切换季节，仅查看）
  byId('season-toggle')?.addEventListener('click', () => toggleSeasonSheet());

  // 季节浮层关闭按钮 + 遮罩点击关闭
  byId('season-sheet-close')?.addEventListener('click', () => toggleSeasonSheet(false));
  byId('season-sheet-backdrop')?.addEventListener('click', () => toggleSeasonSheet(false));

  // 关系养分显示
  updateNurtureUI();
  updateRelationshipBands();
  updateRoleForms();
  updateRegionShapes();
  renderRegionCapsules();
  renderEmptyState();
  byId('nurture-practice-btn')?.addEventListener('click', () => {
    showToast('模拟对话 · 即将上线');
  });

  // 恢复动物选中态（读 zhijian-friend-animal，键名不变）
  syncChosenAnimal();

  // ⚠️ 事件委托统一挂在 #garden-scene（不在每个 .animal / 每个生物上绑）——
  //    避免重绘后失效，且天然满足「零内联 onclick、零 window 挂载」。
  //    两类委托用不同 closest 判定，互不误伤：
  //      · 动物 -> closest('.animal')
  //      · 根脉 -> closest('.root-vein-hit')
  //      · 生物浇灌 -> closest('[data-anchor]')（eco-tree/eco-flower/eco-seedling 等）
  //    键盘 Enter/Space 由原生 <button> 自动派发为 click，无需手写 keydown。
  const scene = byId('garden-scene') || $('.garden-scene');
  if (scene) {
    scene.addEventListener('click', handleSceneClick);
    // 长按 [data-person-item] → 弹出改名输入框（合并别名 / 修正标签）
    scene.addEventListener('pointerdown', startLongPressTimer);
    scene.addEventListener('pointerup', cancelLongPressTimer);
    scene.addEventListener('pointerleave', cancelLongPressTimer);
    scene.addEventListener('pointercancel', cancelLongPressTimer);
  }
}

// ============================================================
// 长按改名（data-person-item 上长按 500ms → 弹输入框 → 重命名/合并）
// ============================================================

let _longPressTimer = null;
let _longPressTarget = null;
const LONG_PRESS_MS = 500;

function startLongPressTimer(e) {
  const item = e.target.closest('[data-person-item]');
  if (!item) return;
  _longPressTarget = item;
  _longPressTimer = setTimeout(() => {
    const who = item.dataset.who || '';
    const anchor = item.dataset.anchor || '';
    if (who) showRenameModal(who, anchor);
    _longPressTimer = null;
  }, LONG_PRESS_MS);
}

function cancelLongPressTimer() {
  if (_longPressTimer) {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  }
  _longPressTarget = null;
}

/** 构建改名浮层 innerHTML（纯函数，插值经 escapeHtml） */
function buildRenameModalHTML(oldWho) {
  return (
    '<div class="rename-card">' +
    '<p class="rename-title">修改标签</p>' +
    '<p class="rename-hint">改名后，同一人的养分会合并到新标签下。</p>' +
    `<input type="text" class="rename-input" value="${escapeHtml(oldWho)}" maxlength="12" placeholder="输入名字">` +
    '<div class="rename-actions">' +
    '<button type="button" class="rename-cancel">取消</button>' +
    '<button type="button" class="rename-confirm">确定</button>' +
    '</div></div>'
  );
}

/**
 * 弹出改名浮层。用户输入新标签后：
 * - 新标签与旧标签一致 → 不操作
 * - 新标签已存在于同关系桶 → 合并（旧标签事件全部改为新标签）
 * - 新标签不存在 → 仅改名
 */
function showRenameModal(oldWho, node) {
  // 移除已有浮层
  document.querySelector('.rename-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'rename-modal';
  modal.innerHTML = buildRenameModalHTML(oldWho);
  document.body.appendChild(modal);

  const input = modal.querySelector('.rename-input');
  input?.focus();
  input?.select();

  const close = () => modal.remove();
  modal.querySelector('.rename-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  const confirm = () => {
    const val = (input?.value || '').trim();
    if (!val) { close(); return; }
    if (val === oldWho) { close(); return; }
    const updated = renameWhoInRelation(node, oldWho, val);
    close();
    if (updated > 0) {
      showToast(`已将 ${updated} 条记录合并到「${val}」`);
      renderMultiElements();
      renderRegionCapsules();
      updateRoleForms();
      updateRegionShapes();
      renderEmptyState();
      updateNurtureUI();
    } else {
      showToast('没有需要改名的记录');
    }
  };
  modal.querySelector('.rename-confirm')?.addEventListener('click', confirm);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
}

/** 应用动物选中态（视觉 + 无障碍 aria-pressed + 提示文案） */
function applyAnimalChosen(btn) {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  scene.querySelectorAll('.animal').forEach((a) => {
    const on = a === btn;
    a.classList.toggle('chosen', on);
    a.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const hint = byId('animal-hint');
  if (hint) {
    hint.textContent = '你的小伙伴';
    hint.style.animation = 'none';
  }
}

/** 进入花园页时恢复已选动物（键 zhijian-friend-animal 不变） */
function syncChosenAnimal() {
  const chosen = localStorage.getItem('zhijian-friend-animal') || '';
  if (!chosen) return;
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  scene.querySelectorAll('.animal').forEach((a) => {
    const on = a.dataset.animal === chosen;
    a.classList.toggle('chosen', on);
    a.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (chosen) {
    const hint = byId('animal-hint');
    if (hint) hint.textContent = '你的小伙伴';
  }
}

/**
 * #garden-scene 上的统一事件委托（click 唯一类型）。
 * @param {MouseEvent} e
 */
function handleSceneClick(e) {
  // ① 溪边动物选择（button.animal）—— 不加养分，只落盘 + 动效
  const animalBtn = e.target.closest('.animal');
  if (animalBtn) {
    applyAnimalChosen(animalBtn);
    localStorage.setItem('zhijian-friend-animal', animalBtn.dataset.animal);
    waterCreature(animalBtn); // 动效作用于被点动物自身
    return;
  }

  // ② 根脉点击（占位跳转）
  const rootHit = e.target.closest('.root-vein-hit');
  if (rootHit) {
    const node = rootHit.dataset.node;
    showToast(`查看与「${displayOf(node)}」的关系回顾 · 即将上线`);
    return;
  }

  // ③ 生物点击 -> 浇灌反馈 + 养分（eco-tree / eco-flower / eco-seedling / 动态 eco-tree-item）
  const creature = e.target.closest('[data-anchor]');
  if (
    creature &&
    (creature.classList.contains('eco-tree') ||
      creature.classList.contains('eco-tree-item') ||
      creature.classList.contains('eco-flower') ||
      creature.classList.contains('eco-seedling'))
  ) {
    waterCreature(creature);
    addNurture(1);
  }
}

// ============================================================
// 入口
// ============================================================
/** 视口变化重算锚点：
 *  移动端地址栏收放 / 软键盘弹起会在滚动或输入过程中连续触发 resize，
 *  若不做短路，每次都会走一遍全量重绘。故先比较 garden-scene 尺寸，
 *  尺寸未变则直接返回（无变化短路）。
 *  rAF 合并为可选增强：真机若仍见抖动，可再包一层 requestAnimationFrame，
 *  此处不引入，保持实现最简。 */
let lastSceneSize = { w: 0, h: 0 };

/** resize 处理器（无变化短路） */
function handleResize() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return;
  const r = scene.getBoundingClientRect();
  if (!r) return;
  if (r.width === lastSceneSize.w && r.height === lastSceneSize.h) return; // 短路
  lastSceneSize = { w: r.width, h: r.height };
  renderRelationGraph();
}

/** 进入花园页时重置尺寸缓存，确保首帧一定重算一次 */
function resetSceneSizeCache() {
  lastSceneSize = { w: 0, h: 0 };
}

/** 花园入口（含星图 init）。只读账本，不写。 */
export function initGarden() {
  const scene = byId('garden-scene') || $('.garden-scene');
  if (!scene) return; // 空值容错

  renderRelationGraph();
  renderMultiElements(); // 多元素（家人古树 / 朋友动物）按人动态生成，须在形态/胶囊前
  applySceneClasses();
  renderNoneFallback();
  updateNurtureUI();
  updateRoleForms();
  updateRegionShapes();
  renderRegionCapsules();
  renderEmptyState();
  bindGardenEvents();

  // 自订阅：数据变化后重绘，不让 state 反向通知 garden。
  document.addEventListener('navigate', (e) => {
    if (e.detail && e.detail.screenId === 'garden-screen') {
      initGardenCanvas();
      resetSceneSizeCache(); // 首次进入/重新进入，确保重算
      applySceneClasses();
      renderRelationGraph();
      renderMultiElements(); // 重新进入时按最新账本重建多元素
      renderNoneFallback();
      updateRegionShapes();
      renderRegionCapsules();
      renderEmptyState();
      updateNurtureUI();
    }
  });

  // 视口变化重算锚点（含无变化短路）
  window.addEventListener('resize', handleResize);
}
