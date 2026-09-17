// tests/garden.test.js —— modules/garden.js 纯函数单测
// 覆盖：nurtureTier 四档边界（逐节点驱动）/ bandPath / 季节映射
// 注意：本文件只 import 纯函数，不触碰 DOM（garden.js 顶层无 DOM 副作用）。
import { describe, it, expect } from 'vitest';
import { nurtureTier, bandPath, rootVeinPaths, getSeasonIndex, getSeasonName, SEASONS, FALLBACK_ANCHORS, STATUS_TEXT } from '../src/modules/garden.js';

describe('nurtureTier · 四档边界（附录 D.4）', () => {
  it('0–33 → thin', () => {
    expect(nurtureTier(0)).toBe('thin');
    expect(nurtureTier(1)).toBe('thin');
    expect(nurtureTier(33)).toBe('thin');
  });

  it('34–66 → mid', () => {
    expect(nurtureTier(34)).toBe('mid');
    expect(nurtureTier(50)).toBe('mid');
    expect(nurtureTier(66)).toBe('mid');
  });

  it('67–99 → thick', () => {
    expect(nurtureTier(67)).toBe('thick');
    expect(nurtureTier(80)).toBe('thick');
    expect(nurtureTier(99)).toBe('thick');
  });

  it('≥100 → full', () => {
    expect(nurtureTier(100)).toBe('full');
    expect(nurtureTier(250)).toBe('full');
  });

  it('非数值 / 负值 / undefined 一律回落到 thin（健壮性）', () => {
    expect(nurtureTier(undefined)).toBe('thin');
    expect(nurtureTier(null)).toBe('thin');
    expect(nurtureTier('abc')).toBe('thin');
    expect(nurtureTier(-5)).toBe('thin');
    expect(nurtureTier(NaN)).toBe('thin');
  });

  it('数字字符串能正确比较（Number 转换）', () => {
    expect(nurtureTier('34')).toBe('mid');
    expect(nurtureTier('100')).toBe('full');
  });
});

describe('bandPath · 二次贝塞尔路径', () => {
  it('返回合法 SVG path（M ... Q ...）', () => {
    const d = bandPath({ x: 20, y: 68 }, { x: 52, y: 62 });
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+ Q [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+$/);
  });

  it('起点/终点坐标与入参一致', () => {
    const d = bandPath({ x: 10, y: 20 }, { x: 60, y: 80 });
    expect(d).toContain('M 10 20');
    expect(d.endsWith('60 80')).toBe(true);
  });

  it('控制点 y 因下垂量大于两端中点的 y（下垂量随水平跨度增长）', () => {
    const d = bandPath({ x: 0, y: 50 }, { x: 100, y: 50 });
    const m = d.match(/Q ([\d.-]+) ([\d.-]+)/);
    const cy = Number(m[2]);
    expect(cy).toBeGreaterThan(50); // 中点 50 + 下垂
  });

  it('水平跨度越大，下垂量越大', () => {
    const small = bandPath({ x: 0, y: 50 }, { x: 10, y: 50 });
    const large = bandPath({ x: 0, y: 50 }, { x: 100, y: 50 });
    const cySmall = Number(small.match(/Q [\d.-]+ ([\d.-]+)/)[1]);
    const cyLarge = Number(large.match(/Q [\d.-]+ ([\d.-]+)/)[1]);
    expect(cyLarge).toBeGreaterThan(cySmall);
  });
});

describe('季节映射', () => {
  it('getSeasonIndex 落在 0–3 区间', () => {
    const idx = getSeasonIndex();
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(3);
  });

  it('getSeasonName 返回 SEASONS 之一', () => {
    expect(SEASONS).toContain(getSeasonName());
  });

  it('SEASONS 恰好 4 项（冬春夏秋）', () => {
    expect(SEASONS).toHaveLength(4);
  });
});

describe('FALLBACK_ANCHORS · 兜底锚点表（V2 6 键全覆盖）', () => {
  it('包含 self + 5 具名节点共 6 键且坐标在 0–100 内', () => {
    for (const key of ['self', 'family', 'partner', 'friend', 'child', 'colleague']) {
      const a = FALLBACK_ANCHORS[key];
      expect(a).toBeDefined();
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(100);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(100);
    }
  });

  it('恰好多于等于 6 键（无缺键 → 不会产出 undefined 坐标）', () => {
    expect(Object.keys(FALLBACK_ANCHORS).length).toBeGreaterThanOrEqual(6);
  });

  it('对齐架构 §A.3.2 锚点坐标', () => {
    expect(FALLBACK_ANCHORS.self).toEqual({ x: 50, y: 72 });
    expect(FALLBACK_ANCHORS.family).toEqual({ x: 24, y: 40 });
    expect(FALLBACK_ANCHORS.partner).toEqual({ x: 56, y: 42 });
    expect(FALLBACK_ANCHORS.child).toEqual({ x: 36, y: 64 });
    expect(FALLBACK_ANCHORS.friend).toEqual({ x: 78, y: 62 });
    expect(FALLBACK_ANCHORS.colleague).toEqual({ x: 81, y: 30 });
  });
});

describe('rootVeinPaths · 档位 → 分叉（纯函数）', () => {
  const mainD = bandPath({ x: 50, y: 72 }, { x: 24, y: 40 });

  it('thin → 无分叉（空数组）', () => {
    expect(rootVeinPaths(mainD, 'thin')).toEqual([]);
  });

  it('mid → 2 条分叉', () => {
    expect(rootVeinPaths(mainD, 'mid')).toHaveLength(2);
  });

  it('thick → 3 条分叉', () => {
    expect(rootVeinPaths(mainD, 'thick')).toHaveLength(3);
  });

  it('full → 3 条分叉', () => {
    expect(rootVeinPaths(mainD, 'full')).toHaveLength(3);
  });

  it('每条分叉均为合法 SVG path（M ... Q ...）', () => {
    for (const seg of rootVeinPaths(mainD, 'thick')) {
      expect(seg).toMatch(/^M [\d.-]+ [\d.-]+ Q [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+$/);
    }
  });

  it('非法主干 d 输入 → 返回空数组（健壮性）', () => {
    expect(rootVeinPaths('', 'mid')).toEqual([]);
    expect(rootVeinPaths(null, 'thick')).toEqual([]);
    expect(rootVeinPaths('garbage', 'full')).toEqual([]);
  });

  it('分叉起点落在主干两点包围盒的合理邻域内（几何连续）', () => {
    const segs = rootVeinPaths(mainD, 'thick');
    for (const seg of segs) {
      const m = seg.match(/^M ([\d.-]+) ([\d.-]+)/);
      const x = Number(m[1]);
      const y = Number(m[2]);
      // 主干 x∈[24,50] y∈[40,72]，分叉起点允许小幅外扩
      expect(x).toBeGreaterThan(10);
      expect(x).toBeLessThan(65);
      expect(y).toBeGreaterThan(28);
      expect(y).toBeLessThan(85);
    }
  });
});

describe('STATUS_TEXT · 档位 × 季节文案表', () => {
  it('四个档位均有 0–3 共 4 条文案，且非空', () => {
    for (const tier of ['thin', 'mid', 'thick', 'full']) {
      expect(STATUS_TEXT[tier]).toBeDefined();
      for (const season of [0, 1, 2, 3]) {
        expect(typeof STATUS_TEXT[tier][season]).toBe('string');
        expect(STATUS_TEXT[tier][season].length).toBeGreaterThan(0);
      }
    }
  });

  it('文案不含诊断/审判类词汇（宪法红线）', () => {
    const banned = ['妈宝', '扶弟魔', '凤凰男', '原生家庭', '创伤', '控制狂', '渣', '巨婴'];
    const all = Object.values(STATUS_TEXT)
      .flatMap((bySeason) => Object.values(bySeason))
      .join(' ');
    for (const word of banned) {
      expect(all).not.toContain(word);
    }
  });
});
