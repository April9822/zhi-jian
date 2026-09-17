// src/core/nodes.js —— 关系节点的唯一权威定义（Single Source of Truth）
//
// 宪法级约定（lint 强制，见 scripts/check-nodes.mjs）：
//   本文件是【全项目唯一允许出现节点 id 字面量 'family'/'partner'/'friend'/'child'/'colleague'/'none' 的地方】。
//   其它任何 .js 文件不得出现这些字面量（测试文件、本文件、注释除外）。
//   要新增节点 -> 只改这里一处。

/**
 * 节点主定义表。顺序 = 展示顺序；用于一切派生。
 * @type {ReadonlyArray<{id:string, display:string, region:string, elId:string, anchorKey:string}>}
 */
export const NODES = Object.freeze([
  { id: 'family', display: '家人', region: '家人 · 根系森林', elId: 'eco-tree', anchorKey: 'family' },
  { id: 'partner', display: '爱人', region: '爱人 · 共生花园', elId: 'eco-flower', anchorKey: 'partner' },
  { id: 'friend', display: '朋友', region: '朋友 · 流动溪谷', elId: 'eco-stream', anchorKey: 'friend' },
  { id: 'child', display: '孩子', region: '孩子 · 新生苗圃', elId: 'eco-nursery', anchorKey: 'child' },
  { id: 'colleague', display: '同事', region: '同事 · 林间营地', elId: 'eco-camp', anchorKey: 'colleague' },
]);

/** 兜底节点（无名记录）：有数据桶、永不连根脉、无生态区域 */
export const NONE_ID = 'none';

/** 全部节点 id（含 none）——数据层遍历用 */
export const ALL_NODE_IDS = Object.freeze([...NODES.map((n) => n.id), NONE_ID]);

/** 具名关系节点 id（不含 none）——视图层遍历用 */
export const NAMED_NODE_IDS = Object.freeze(NODES.map((n) => n.id));

/** 生态区域节点 id（有可视化主体的节点 = 全部具名节点；V2 五区域全有主体） */
export const PRESENT_NODES = Object.freeze(NODES.map((n) => n.id)); // 语义别名，便于阅读

/** 判定优先级链（6 节点全序，来自 PRD §9.2(a)：partner > child > family > colleague > friend > none） */
export const PRIORITY = Object.freeze(['partner', 'child', 'family', 'colleague', 'friend', NONE_ID]);

/** 判定执行顺序（PRD §9.9-C 第 4 步：colleague -> child -> partner -> family -> friend） */
export const JUDGE_ORDER = Object.freeze(['colleague', 'child', 'partner', 'family', 'friend']);

/** id -> NODES 条目（O(1) 查询） */
export const NODE_BY_ID = Object.freeze(Object.fromEntries(NODES.map((n) => [n.id, n])));

/**
 * 由 id 取显示名（含 none 兜底）。
 * @param {string} id - 节点 id
 * @returns {string} 显示名；未知 id 回落为「这段关系」
 */
export function displayOf(id) {
  if (id === NONE_ID) return '无名记录';
  return NODE_BY_ID[id]?.display ?? '这段关系';
}
