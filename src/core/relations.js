// src/core/relations.js —— 场景 → 角色映射（纯函数，零 DOM 依赖）
//
// ⚠️ 词典纪律（宪法红线，PRD §9.1 / §9.2）：
//   1. 只收「中性称呼词」。
//   2. 【禁止收录】妈宝 / 扶弟魔 / 凤凰男 / 原生家庭 / 创伤 / 控制狂 等
//      诊断性、审判性、侮辱性词汇。
//   3. 用户原文若出现此类词：只做文本匹配计数、绝不回显、绝不进入任何 UI 文案。
//   4. 【新增词条需经产品评审】——未经评审不得向下方词典追加词条。
//
// 节点集合的唯一定义源 = ./nodes.js（本文件的词典键与判定顺序均从那里派生）。
import { PRIORITY, JUDGE_ORDER, NAMED_NODE_IDS, NONE_ID } from './nodes.js';

/**
 * 场景 → 角色映射词典（PRD §9.1；只收中性称呼词）。
 *
 * ⚠️ 唯一的节点字面量白名单例外区（scripts/check-nodes.mjs 放行本文件的词典声明块）。
 * ⚠️ V2 关键：'孩子'/'儿子'/'女儿'/'宝宝'/'上学'/'作业' 已从 family 移除 → 迁往 child。
 *    否则同一句「辅导儿子作业」会双轴命中 family + child，污染 family 的背景计数。
 * @type {{family: string[], partner: string[], friend: string[], child: string[], colleague: string[]}}
 */
export const SCENE_KEYWORDS = {
  family: [
    '妈', '爸', '婆婆', '公公', '岳父', '岳母', '爷爷', '奶奶', '外公', '外婆',
    '家里', '养老',
    '哥', '姐', '弟', '妹', '姑姑', '叔叔', '表哥', '亲戚',
    // V2 移除（迁往 child）：'孩子','儿子','女儿','宝宝','上学','功课'
  ],
  partner: ['老公', '老婆', '男朋友', '女朋友', '对象', '亲爱的', '咱俩', '结婚', '伴侣', '爱人'],
  friend: ['兄弟', '姐妹', '闺蜜', '发小', '老同学', '朋友', '好友'],
  child: ['孩子', '儿子', '女儿', '宝宝', '上学', '作业'], // '叛逆' 禁用（PRD §9.1 标注）
  colleague: ['领导', '老板', '同事', '项目', '开会', '绩效', '客户', '加班', '汇报', '上司', '下属'],
};

/** 全零命中结构（派生自 NAMED_NODE_IDS，节点无关） */
function zeroHits() {
  return Object.fromEntries(NAMED_NODE_IDS.map((id) => [id, 0]));
}

/**
 * 归一化：压缩空白 + 剥离隐形空白；保留 \n 与 \t（对话结构信息，P4 依赖）。
 * 剥离：\u200B-\u200D \uFEFF \u00A0 \u3000
 * 压缩连续空白用 [^\S\n\t]+ 而非 \s+，以保住换行与制表符。
 * @param {string} text
 * @returns {string}
 */
export function normalizeConversation(text) {
  return String(text ?? '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u3000]/g, '') // 剥离隐形空白
    .replace(/[^\S\n\t]+/g, ' ') // 连续非换行空白 → 单空格（保留 \n \t）
    .trim();
}

/**
 * 对文本中命中的关键词做计数。
 * @param {string} text - 待匹配文本
 * @returns {Record<string, number>} 键集合 = NAMED_NODE_IDS（不含 none）
 */
export function countSceneHits(text) {
  const src = String(text ?? '');
  const result = zeroHits();
  for (const node of NAMED_NODE_IDS) {
    let count = 0;
    for (const kw of SCENE_KEYWORDS[node]) {
      let idx = src.indexOf(kw);
      while (idx !== -1) {
        count += 1;
        idx = src.indexOf(kw, idx + kw.length);
      }
    }
    result[node] = count;
  }
  return result;
}

/**
 * 合并多个计数字典（逐节点求和）。
 * @param {...Record<string, number>} dicts
 * @returns {Record<string, number>}
 */
function mergeHits(...dicts) {
  const out = zeroHits();
  for (const dict of dicts) {
    if (!dict) continue;
    for (const node of NAMED_NODE_IDS) out[node] += dict[node] || 0;
  }
  return out;
}

/**
 * 从文本中取「命中词」对应的节点集合（用于判定直接参与方）。
 * @param {string} text
 * @returns {Set<string>} 文本中命中专属词的节点 id 集合（可能为空）
 */
function hitsToNodeSet(text) {
  const hits = countSceneHits(text);
  const set = new Set();
  for (const node of NAMED_NODE_IDS) {
    if (hits[node] > 0) set.add(node);
  }
  return set;
}

/**
 * 从一段文本中提取前 N 行的「说话人标签」。
 * P4 用：对话结构形如「我：xxx\nTA：yyy」，仅取行内冒号/全角冒号之前的部分。
 * @param {string} conversation
 * @param {number} [maxLines=3]
 * @returns {string}
 */
function extractSpeakerLabels(conversation, maxLines = 3) {
  const raw = String(conversation ?? '');
  const lines = raw.split(/\r?\n/).slice(0, maxLines);
  const labels = [];
  for (const line of lines) {
    const match = line.match(/^\s*([^：:]{1,12})\s*[：:]/);
    if (match) labels.push(match[1]);
  }
  return labels.join(' ');
}

/**
 * 提取「直接参与方」的类型集合（谁在场）。
 * 来源优先级：analysis.parties[].label → conversation 前 3 行说话人标签。
 *
 * ⚠️ 语义约定（关键，易误用）：
 *   - 返回【空集】表示「**无法确定在场者**」，**不是**「确定没有人在场」。
 *   - 因此空集 → 走 A.5.4 的词频退化分支，而**不是**直接判 none（NONE_ID）。
 *   - 只有「非空集但 4a-4e 全未命中」时，才由第 5 步判 none（NONE_ID）。
 *   把空集理解为「没人在场」会导致花园几乎不生长（见架构 A.5.4 裁定理由）。
 * @param {object} analysis
 * @param {object} [opts]
 * @param {string} [opts.conversation] - 原始对话
 * @returns {Set<string>} 参与方命中的节点 id 集合（可能为空）
 */
export function extractDirectParties(analysis, opts = {}) {
  const a = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : {};
  const set = new Set();

  // 来源一：analysis.parties[].label / nickname
  if (Array.isArray(a.parties)) {
    for (const p of a.parties) {
      if (!p || typeof p !== 'object') continue;
      const label = typeof p.label === 'string' ? p.label : '';
      const nickname = typeof p.nickname === 'string' ? p.nickname : '';
      const text = `${label} ${nickname}`.trim();
      if (!text) continue;
      for (const node of hitsToNodeSet(text)) set.add(node);
    }
  }

  // 来源二：conversation 前 3 行说话人标签
  if (opts && typeof opts.conversation === 'string' && opts.conversation) {
    const labels = extractSpeakerLabels(opts.conversation, 3);
    if (labels) {
      for (const node of hitsToNodeSet(labels)) set.add(node);
    }
  }

  return set;
}

/**
 * 收集 P3 文本（AI 输出文本：parties[].label/nickname + coreInsight.*）。
 * @param {object} a
 * @returns {string}
 */
function collectP3Text(a) {
  const parts = [];
  if (Array.isArray(a.parties)) {
    for (const p of a.parties) {
      if (p && p.label) parts.push(String(p.label));
      if (p && p.nickname) parts.push(String(p.nickname));
    }
  }
  if (a.coreInsight && typeof a.coreInsight === 'object') {
    for (const key of ['title', 'summary', 'conflictType', 'realTopic']) {
      if (typeof a.coreInsight[key] === 'string') parts.push(a.coreInsight[key]);
    }
    if (Array.isArray(a.coreInsight.perParty)) {
      for (const p of a.coreInsight.perParty) {
        if (p && typeof p.title === 'string') parts.push(p.title);
        if (p && typeof p.summary === 'string') parts.push(p.summary);
      }
    }
  }
  return parts.join(' ');
}

/**
 * 从计数字典中取唯一主轴（命中最多者；并列按 PRIORITY 全序消解）。
 * @param {Record<string, number>} hits
 * @returns {string|null} 全为 0 时返回 null
 */
export function pickMainAxis(hits) {
  if (!hits) return null;
  let best = null;
  let bestCount = 0;
  for (const node of PRIORITY) {
    if (node === NONE_ID) continue; // none 无词典，不参与主轴竞争
    const count = hits[node] || 0;
    if (count > bestCount) {
      best = node;
      bestCount = count;
    }
  }
  return best;
}

/**
 * 解析一次分析结果 → 主轴关系节点（PRD §9.9-C 五步结构，照抄，不重排）。
 *
 * 第 1 步 确定「直接参与方」（谁在场）—— 见 extractDirectParties()
 * 第 2 步 P1 用户显式选择 → 命中即返回
 * 第 3 步 P2 AI 结构化字段（relation / scene）→ 命中即返回（当前为死路径，见下）
 * 第 4 步 P3/P4 关键词，按 JUDGE_ORDER 固定顺序短路（4a-4e）
 * 第 5 步 P5 兜底 → none（仅当 4a-4e 全部未命中）
 *
 * ⚠️ P2 死路径说明（架构 A.5 / D.1#6，勿删该步骤）：
 *   当前 api/_core.js 的 parties 只有 {id,label,quote}，**没有 relation 字段**，
 *   也没有顶层 scene 字段。因此第 3 步在现实中**永远不命中**。保留该步骤作为
 *   预留路径——V1.2 将在 api/_core.js 的 SYSTEM_PROMPT 增结构化字段后生效。
 *   （api/_core.js 为禁改文件，归 V1.2 backlog。）
 *
 * @param {object} analysis - runAnalysis() 返回的合法分析对象
 * @param {object} [opts]
 * @param {'family'|'partner'|'friend'|'child'|'colleague'} [opts.explicitScene] - P1：用户显式选择（本轮不传）
 * @param {string} [opts.conversation] - P4：原始对话（仅取前 3 行说话人标签）
 * @returns {'family'|'partner'|'friend'|'child'|'colleague'|'none'} 无法判定时返回 'none'
 */
export function resolveRelationTarget(analysis, opts = {}) {
  const a = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : {};

  // 第 1 步：谁在场
  const parties = extractDirectParties(a, opts);

  // 第 2 步：P1 用户显式选择
  if (opts.explicitScene && NAMED_NODE_IDS.includes(opts.explicitScene)) {
    return opts.explicitScene;
  }

  // 第 3 步：P2 AI 结构化字段（当前为死路径，字段不存在则跳过；保留不删）
  const structuredScene = a.scene;
  if (typeof structuredScene === 'string' && NAMED_NODE_IDS.includes(structuredScene)) {
    return structuredScene;
  }
  if (Array.isArray(a.parties)) {
    const structuredRelations = a.parties
      .map((p) => (p && typeof p.relation === 'string' ? p.relation : null))
      .filter((r) => NAMED_NODE_IDS.includes(r));
    if (structuredRelations.length > 0) {
      // 结构化字段已是枚举，取最高优先级者（PRIORITY 全序）
      for (const node of PRIORITY) {
        if (structuredRelations.includes(node)) return node;
      }
    }
  }

  // 第 4 步：P3/P4 关键词，按固定顺序（JUDGE_ORDER）短路
  const hitsP3 = countSceneHits(collectP3Text(a));
  const hitsP4 =
    opts.conversation && typeof opts.conversation === 'string'
      ? countSceneHits(extractSpeakerLabels(opts.conversation, 3))
      : zeroHits();
  const hits = mergeHits(hitsP3, hitsP4);

  // 按 JUDGE_ORDER 短路判定。注意：顺序硬约束，不得重排。
  //   4a colleague 最先，但必须「命中专属词」∧「直接参与方为职场」——缺一不可，
  //      否则「我老婆嫌我加班多」会因含「加班」被误判给 colleague（H3）。
  //   4b child 必须早于 4d family（G3）——否则 family 永远先手，child 成死区（H1）。
  //   4c partner、4d family、4e friend。
  // 「直接参与方」判据优先于「词频」；词频仅用于同节点内置信度。
  const guarded = new Set(JUDGE_ORDER);
  for (const node of JUDGE_ORDER) {
    if (!guarded.has(node)) continue; // 冗余保护
    if (hits[node] <= 0) continue; // 未命中专属词
    // 4a/4b/4c 需参与方佐证；4d family / 4e friend 不要求（见 §9.9-C 注释）
    if (node === 'family' || node === 'friend') return node;
    if (parties.has(node)) return node;
  }

  // ★ 退化分支（team-lead 已裁定保留，边界写死）：
  //   仅当「直接参与方为空集」时启用词频。一旦 parties 非空 -> 词频【完全退出竞争】，
  //   一律由 4a-4e 的参与方判定决出。
  //   禁止未来任何人把词频重新引入「参与方已知」的场景。
  //   理由：无说话人标签是常态（用户直接粘贴没标注谁说的话）。若空集一律落 none，
  //   则绝大多数真实对话不给任何关系节点养分，花园几乎不生长——产品级灾难。
  if (parties.size === 0) {
    const axis = pickMainAxis(hits);
    if (axis) return axis;
  }

  // 第 5 步：P5 兜底 → none（仅此处可产生 none，G4）
  return NONE_ID;
}
