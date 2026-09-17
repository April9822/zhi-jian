// src/core/copy.js —— 花园定性文案表（集中一处，便于审校）
//
// 宪法纪律（PRD §10.3）：
//   1. 零 emoji、零分数、零百分比、零等级。
//   2. 不得出现诊断/审判/侮辱性词汇。
//   3. 术语纪律：关系养分 / 关系花园 / 情境回顾 / 成长建议（禁：关系能量/分数/看板/裁决书/改进计划）。
// 本表为「纯数据 + 纯函数」，零 DOM 依赖，可单独审校/快照。

/**
 * 关系标签浮层胶囊文案表（PRD §7.3）：按「区域 × 三态」驱动。
 * 三态键与 nurtureTier() 的四档映射见 tierToShape()（thin→calm / mid→growing / thick·full→bloom）。
 * @type {Record<string, {calm:string, growing:string, bloom:string}>}
 */
export const REGION_STATUS_TEXT = {
  family: {
    calm: '根系还在土里，慢慢来',
    growing: '根扎得深了，有了支撑',
    bloom: '根系深厚，也给了你荫蔽',
  },
  partner: {
    calm: '两株还在试着靠近',
    growing: '藤蔓已经绕到了一起',
    bloom: '彼此托着，开成了一处花',
  },
  friend: {
    calm: '溪水很细，但一直在流',
    growing: '有些近了，有些还在路上',
    bloom: '溪水能坐得下人了',
  },
  child: {
    calm: '刚破土，安静地长',
    growing: '抽了新叶，围栏合上了',
    bloom: '自己会站稳一点了',
  },
  colleague: {
    calm: '帐篷先收着，也挺好',
    growing: '有了火，也有了坐的地方',
    bloom: '在那儿，也有人的温度',
  },
};

/**
 * 季节文案（PRD §7.4，与 STATUS_TEXT 的季节句一致）。
 * 索引 0-3 = 冬春夏秋。
 * @type {string[]}
 */
export const SEASON_TEXT = [
  '关系在安静地沉淀',
  '你的关系正在慢慢生长',
  '关系正值繁盛',
  '你收获了一些理解',
];

/**
 * 季节浮层每行的定性描述（PRD §7.4：每行 = 一句定性描述 + 「当前」标记，不可切换）。
 * @type {string[]}
 */
export const SEASON_DESC = [
  '土地在休息，根在往下走',
  '土地醒了，叶子开始探出头',
  '光最足，能坐得下人了',
  '风把该收的都收回来了',
];

/** 空状态文案（PRD §7.5.1） */
export const EMPTY_STATE_TEXT = {
  title: '这里还是一片空地。',
  subtitle: '说一段话，它会开始长。',
};

/**
 * 养分档位 → 形态三态键。
 * thin → calm（沉淀期）/ mid → growing（生长中）/ thick·full → bloom（繁盛期）。
 * @param {'thin'|'mid'|'thick'|'full'} tier
 * @returns {'calm'|'growing'|'bloom'}
 */
export function tierToShape(tier) {
  if (tier === 'thick' || tier === 'full') return 'bloom';
  if (tier === 'mid') return 'growing';
  return 'calm';
}

/**
 * 取某区域在某档位的胶囊定性短语。
 * @param {string} node - 节点 id
 * @param {'thin'|'mid'|'thick'|'full'} tier
 * @returns {string} 定性短语（未知节点回落为空串）
 */
export function regionStatusOf(node, tier) {
  const byShape = REGION_STATUS_TEXT[node];
  if (!byShape) return '';
  return byShape[tierToShape(tier)] || '';
}
