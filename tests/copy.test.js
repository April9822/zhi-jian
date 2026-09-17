// tests/copy.test.js —— core/copy.js 文案表 + 纯函数单测（T04）
// 覆盖：三态映射 / 胶囊短语 / 空状态 / 季节文案 / 宪法红线（零 emoji、零分数、零诊断词）
import { describe, it, expect } from 'vitest';
import {
  REGION_STATUS_TEXT,
  SEASON_TEXT,
  SEASON_DESC,
  EMPTY_STATE_TEXT,
  tierToShape,
  regionStatusOf,
} from '../src/core/copy.js';
import { NAMED_NODE_IDS } from '../src/core/nodes.js';

describe('tierToShape · 四档 → 三态键', () => {
  it('thin → calm', () => {
    expect(tierToShape('thin')).toBe('calm');
  });

  it('mid → growing', () => {
    expect(tierToShape('mid')).toBe('growing');
  });

  it('thick / full → bloom（厚档合并入繁盛期）', () => {
    expect(tierToShape('thick')).toBe('bloom');
    expect(tierToShape('full')).toBe('bloom');
  });

  it('未知档位回落到 calm（健壮性）', () => {
    expect(tierToShape(undefined)).toBe('calm');
    expect(tierToShape('weird')).toBe('calm');
  });
});

describe('REGION_STATUS_TEXT · 五区域 × 三态（PRD §7.3 全表对齐）', () => {
  it('五个具名节点均有 calm / growing / bloom 三态', () => {
    for (const node of NAMED_NODE_IDS) {
      expect(REGION_STATUS_TEXT[node]).toBeDefined();
      for (const shape of ['calm', 'growing', 'bloom']) {
        expect(typeof REGION_STATUS_TEXT[node][shape]).toBe('string');
        expect(REGION_STATUS_TEXT[node][shape].length).toBeGreaterThan(0);
      }
    }
  });

  it('每个短语 ≤12 字（PRD §7.3 结构约束）', () => {
    for (const node of NAMED_NODE_IDS) {
      for (const shape of ['calm', 'growing', 'bloom']) {
        expect(REGION_STATUS_TEXT[node][shape].length).toBeLessThanOrEqual(12);
      }
    }
  });

  it('五区各态措辞互不相同（避免五区同句）', () => {
    for (const shape of ['calm', 'growing', 'bloom']) {
      const phrases = NAMED_NODE_IDS.map((n) => REGION_STATUS_TEXT[n][shape]);
      expect(new Set(phrases).size).toBe(phrases.length);
    }
  });

  it('文案不含诊断/审判类词汇（宪法红线）', () => {
    const banned = ['妈宝', '扶弟魔', '凤凰男', '原生家庭', '创伤', '控制狂', '渣', '巨婴', '应该', '必须'];
    const all = Object.values(REGION_STATUS_TEXT)
      .flatMap((byShape) => Object.values(byShape))
      .join(' ');
    for (const word of banned) {
      expect(all).not.toContain(word);
    }
  });
});

describe('regionStatusOf · 取胶囊短语', () => {
  it('family + thin → 沉淀期措辞', () => {
    expect(regionStatusOf('family', 'thin')).toBe('根系还在土里，慢慢来');
  });

  it('colleague + full → 繁盛期措辞（thick/full 合并）', () => {
    expect(regionStatusOf('colleague', 'thick')).toBe('在那儿，也有人的温度');
    expect(regionStatusOf('colleague', 'full')).toBe('在那儿，也有人的温度');
  });

  it('未知节点 → 空串（不抛异常）', () => {
    expect(regionStatusOf('none', 'thin')).toBe('');
    expect(regionStatusOf('unknown', 'full')).toBe('');
  });
});

describe('SEASON_TEXT / SEASON_DESC · 四季（PRD §7.4）', () => {
  it('各恰好 4 项且非空', () => {
    expect(SEASON_TEXT).toHaveLength(4);
    expect(SEASON_DESC).toHaveLength(4);
    for (const s of [...SEASON_TEXT, ...SEASON_DESC]) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('季节文案对齐 PRD §7.4 定稿', () => {
    expect(SEASON_TEXT).toEqual([
      '关系在安静地沉淀',
      '你的关系正在慢慢生长',
      '关系正值繁盛',
      '你收获了一些理解',
    ]);
  });
});

describe('EMPTY_STATE_TEXT · 空状态（PRD §7.5.1）', () => {
  it('主句/副句对齐定稿', () => {
    expect(EMPTY_STATE_TEXT.title).toBe('这里还是一片空地。');
    expect(EMPTY_STATE_TEXT.subtitle).toBe('说一段话，它会开始长。');
  });

  it('不含「0/5 已完成」「进度」类文案（宪法禁止）', () => {
    const all = `${EMPTY_STATE_TEXT.title} ${EMPTY_STATE_TEXT.subtitle}`;
    expect(all).not.toContain('已完成');
    expect(all).not.toContain('进度');
  });
});

describe('copy.js 全表宪法守卫 · 零 emoji / 零分数', () => {
  it('全部文案不含 emoji / 数字 / 百分号', () => {
    const all = [
      ...Object.values(REGION_STATUS_TEXT).flatMap((b) => Object.values(b)),
      ...SEASON_TEXT,
      ...SEASON_DESC,
      EMPTY_STATE_TEXT.title,
      EMPTY_STATE_TEXT.subtitle,
    ].join(' ');
    // 无阿拉伯数字 / 百分号
    expect(/[0-9]/.test(all)).toBe(false);
    expect(all).not.toContain('%');
    // 无 emoji（扩展 pictographic 区段）
    expect(/\p{Extended_Pictographic}/u.test(all)).toBe(false);
  });
});
