// tests/state.test.js —— core/state.js 账本写入单测
// 覆盖唯一写入口 applyAnalysisToGarden：去重命中 / 未命中 / 超 24h / 异常被吞 / none 兜底
import { describe, it, expect, vi } from 'vitest';
import {
  applyAnalysisToGarden,
  readRelations,
  computeDedupeKey,
} from '../src/core/state.js';

const RELATIONS_KEY = 'zhijian-relations';
const NURTURE_KEY = 'zhijian-nurture';

/** 造一个 P2 可判定为 family 的最小 analysis */
function familyAnalysis() {
  return { scene: 'family' };
}

describe('readRelations · 脏数据结构守卫（含数组漏判修正）', () => {
  it('账本为数组 → 回落空账本（6 桶全 0），不崩溃', () => {
    localStorage.setItem(RELATIONS_KEY, JSON.stringify([]));
    const store = readRelations();
    // 逐键断言（V2 扩到 6 桶，不用 toEqual 全结构以免扩容即爆红）
    expect(store.family).toMatchObject({ total: 0, events: [] });
    expect(store.partner).toMatchObject({ total: 0, events: [] });
    expect(store.friend).toMatchObject({ total: 0, events: [] });
    expect(store.child).toMatchObject({ total: 0, events: [] });
    expect(store.colleague).toMatchObject({ total: 0, events: [] });
    expect(store.none).toMatchObject({ total: 0, events: [] });
  });

  it('某节点为数组 → 该节点回落默认 0 条，其它节点正常解析', () => {
    localStorage.setItem(
      RELATIONS_KEY,
      JSON.stringify({
        family: [], // 数组：应被守卫拒绝，回落默认
        partner: { total: 42, events: [{ id: 'e', at: 1 }] },
      })
    );
    const store = readRelations();
    expect(store.family.total).toBe(0);
    expect(store.family.events).toHaveLength(0);
    expect(store.partner.total).toBe(42);
    expect(store.partner.events).toHaveLength(1);
  });

  it('账本为字符串 / 数字 → 回落空账本', () => {
    localStorage.setItem(RELATIONS_KEY, JSON.stringify('not-an-object'));
    expect(readRelations().family.total).toBe(0);
    localStorage.setItem(RELATIONS_KEY, JSON.stringify(123));
    expect(readRelations().family.total).toBe(0);
  });

  it('前向兼容：旧 4 桶数据读入 → child/colleague 补 0，旧数据零丢失（V2 核心）', () => {
    // 模拟 V1 用户账本（仅 family/partner/friend/none）
    localStorage.setItem(
      RELATIONS_KEY,
      JSON.stringify({
        family: { total: 26, events: [{ id: 'e1', at: 1, scene: 'family' }] },
        partner: { total: 41, events: [{ id: 'e2', at: 2, scene: 'partner' }] },
        friend: { total: 8, events: [] },
        none: { total: 3, events: [{ id: 'e3', at: 3, scene: 'none' }] },
      })
    );
    const store = readRelations();
    // 旧四桶数据零丢失
    expect(store.family.total).toBe(26);
    expect(store.family.events).toHaveLength(1);
    expect(store.partner.total).toBe(41);
    expect(store.friend.total).toBe(8);
    expect(store.none.total).toBe(3);
    // 新桶自动补 0（无需 version / 迁移脚本）
    expect(store.child.total).toBe(0);
    expect(store.child.events).toHaveLength(0);
    expect(store.colleague.total).toBe(0);
    expect(store.colleague.events).toHaveLength(0);
  });
});

describe('computeDedupeKey', () => {
  it('相同对话（含隐形空白差异）得到相同 key', async () => {
    const a = await computeDedupeKey('妈：你好\n我：嗯');
    const b = await computeDedupeKey('妈：你好\u200B\n我：嗯\uFEFF');
    expect(a).toBe(b);
  });

  it('不同对话得到不同 key', async () => {
    const a = await computeDedupeKey('妈：你好\n我：嗯');
    const b = await computeDedupeKey('爸：你好\n我：哦');
    expect(a).not.toBe(b);
  });

  it('返回 16 位十六进制字符串', async () => {
    const key = await computeDedupeKey('测试对话');
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('crypto.subtle 不可用时降级 FNV-1a 且仍稳定', async () => {
    // crypto 是只读全局 getter，须用 stubGlobal 覆盖
    vi.stubGlobal('crypto', {});
    const a = await computeDedupeKey('降级路径');
    const b = await computeDedupeKey('降级路径');
    vi.unstubAllGlobals();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('applyAnalysisToGarden · 未命中（首次记账）', () => {
  it('family 轴 total += gain，events 追加一条', async () => {
    const res = await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：你什么时候回来\n我：不知道\n妈：家里等你',
      gain: 10,
    });
    expect(res).toEqual({ scored: true, node: 'family' });

    const store = readRelations();
    expect(store.family.total).toBe(10);
    expect(store.family.events).toHaveLength(1);
    expect(store.family.events[0].source).toBe('analysis');
    expect(store.family.events[0].scene).toBe('family');
    expect(store.family.events[0].dedupeKey).toMatch(/^[0-9a-f]{16}$/);
  });

  it('不触碰其它节点（family 写入不增 partner/friend）', async () => {
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：回来吃饭\n我：好\n妈：等你',
      gain: 10,
    });
    const store = readRelations();
    expect(store.partner.total).toBe(0);
    expect(store.friend.total).toBe(0);
    expect(store.none.total).toBe(0);
  });

  it('gain 缺省为 10', async () => {
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：a\n我：b\n妈：c',
    });
    expect(readRelations().family.total).toBe(10);
  });

  it('自定义 gain 生效', async () => {
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：a\n我：b\n妈：c',
      gain: 25,
    });
    expect(readRelations().family.total).toBe(25);
  });

  it('同步累加 zhijian-nurture 总量', async () => {
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：a\n我：b\n妈：c',
      gain: 10,
    });
    expect(localStorage.getItem(NURTURE_KEY)).toBe('10');
  });

  it('二次不同对话 → 累加而非覆盖', async () => {
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：a\n我：b\n妈：c',
      gain: 10,
    });
    await applyAnalysisToGarden(familyAnalysis(), {
      conversation: '妈：完全不同\n我：另一段\n妈：对话内容',
      gain: 15,
    });
    const store = readRelations();
    expect(store.family.total).toBe(25);
    expect(store.family.events).toHaveLength(2);
  });
});

describe('applyAnalysisToGarden · 24h 内去重命中', () => {
  it('相同对话再次调用 → 不加分，仅刷新 at', async () => {
    const conversation = '妈：a\n我：b\n妈：c';
    await applyAnalysisToGarden(familyAnalysis(), { conversation, gain: 10 });
    const firstAt = readRelations().family.events[0].at;

    // 短暂等待确保 Date.now() 前进
    await new Promise((r) => setTimeout(r, 5));

    const res = await applyAnalysisToGarden(familyAnalysis(), { conversation, gain: 10 });
    expect(res).toEqual({ scored: false, node: 'family' });

    const store = readRelations();
    expect(store.family.total).toBe(10); // 未加
    expect(store.family.events).toHaveLength(1); // 未新增
    expect(store.family.events[0].at).toBeGreaterThanOrEqual(firstAt);
  });

  it('去重命中不重复累加 zhijian-nurture', async () => {
    const conversation = '妈：a\n我：b\n妈：c';
    await applyAnalysisToGarden(familyAnalysis(), { conversation, gain: 10 });
    await applyAnalysisToGarden(familyAnalysis(), { conversation, gain: 10 });
    expect(localStorage.getItem(NURTURE_KEY)).toBe('10');
  });
});

describe('applyAnalysisToGarden · 超过 24h 窗口', () => {
  it('同 dedupeKey 但 at 早于 24h → 视为未命中，正常加分', async () => {
    const conversation = '妈：超时\n我：测试\n妈：用例';
    const dedupeKey = await computeDedupeKey(conversation);
    const oldAt = Date.now() - 25 * 60 * 60 * 1000; // 25 小时前

    // 预置一条过期事件
    localStorage.setItem(
      RELATIONS_KEY,
      JSON.stringify({
        family: {
          total: 10,
          events: [{ id: 'evt_old', at: oldAt, scene: 'family', gain: 10, source: 'analysis', dedupeKey, hint: '家人' }],
        },
        partner: { total: 0, events: [] },
        friend: { total: 0, events: [] },
        none: { total: 0, events: [] },
      })
    );

    const res = await applyAnalysisToGarden(familyAnalysis(), { conversation, gain: 10 });
    expect(res).toEqual({ scored: true, node: 'family' });

    const store = readRelations();
    expect(store.family.total).toBe(20); // 过期不拦截，正常累加
    expect(store.family.events).toHaveLength(2);
  });
});

describe('applyAnalysisToGarden · none 兜底（D.5）', () => {
  it('无法判定 → node none，只增 none.total，不增任何具名节点', async () => {
    const res = await applyAnalysisToGarden({}, {
      conversation: '今天天气不错\n适合散步\n然后回家了',
      gain: 10,
    });
    expect(res).toEqual({ scored: true, node: 'none' });

    const store = readRelations();
    expect(store.none.total).toBe(10);
    expect(store.family.total).toBe(0);
    expect(store.partner.total).toBe(0);
    expect(store.friend.total).toBe(0);
    expect(store.none.events).toHaveLength(1);
  });

  it('none 兜底仍累加 zhijian-nurture 总量', async () => {
    await applyAnalysisToGarden({}, {
      conversation: '无关系线索\n第一行\n第二行\n第三行',
      gain: 10,
    });
    expect(localStorage.getItem(NURTURE_KEY)).toBe('10');
  });
});

describe('applyAnalysisToGarden · 异常被吞（fire-and-forget）', () => {
  it('analysis 非对象 → 静默返回 scored:false，不抛错', async () => {
    await expect(applyAnalysisToGarden(null)).resolves.toEqual({ scored: false, node: 'none' });
    await expect(applyAnalysisToGarden(undefined)).resolves.toEqual({ scored: false, node: 'none' });
    await expect(applyAnalysisToGarden('字符串')).resolves.toEqual({ scored: false, node: 'none' });
  });

  it('analysis 为数组 → 被守卫拦下，不写账（QA 回归 #2）', async () => {
    // typeof [] === 'object'，若只判 typeof 会放行空数组并误写一笔 none 账
    await expect(applyAnalysisToGarden([])).resolves.toEqual({ scored: false, node: 'none' });
    await expect(applyAnalysisToGarden([{ scene: 'family' }])).resolves.toEqual({
      scored: false,
      node: 'none',
    });
    // 断言账本完全未被触碰
    const store = readRelations();
    expect(store.none.total).toBe(0);
    expect(store.none.events).toHaveLength(0);
    expect(localStorage.getItem('zhijian-nurture')).toBeNull();
  });

  it('opts 为数组 / null 时回落默认值，不抛错（守卫同类修正）', async () => {
    await expect(applyAnalysisToGarden(familyAnalysis(), [])).resolves.toEqual({
      scored: true,
      node: 'family',
    });
    expect(readRelations().family.total).toBe(10); // gain 回落到默认 10

    localStorage.clear();

    await expect(applyAnalysisToGarden(familyAnalysis(), null)).resolves.toEqual({
      scored: true,
      node: 'family',
    });
    expect(readRelations().family.total).toBe(10);
  });

  it('localStorage.setItem 抛错时被吞掉，函数仍 resolve', async () => {
    const spy = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      applyAnalysisToGarden(familyAnalysis(), { conversation: '妈：a\n我：b\n妈：c', gain: 10 })
    ).resolves.toEqual({ scored: false, node: 'none' });

    spy.mockRestore();
    warn.mockRestore();
  });

  it('极端：localStorage.getItem 抛错也不外泄异常（readRelations 已容错）', async () => {
    const spy = vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // readRelations 内部 try/catch 会回退空账本，因此写入照常成功，但绝不允许抛错外泄
    await expect(
      applyAnalysisToGarden(familyAnalysis(), { conversation: '妈：a\n我：b\n妈：c', gain: 10 })
    ).resolves.toEqual({ scored: true, node: 'family' });

    spy.mockRestore();
    warn.mockRestore();
  });
});
