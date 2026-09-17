// tests/relations.test.js —— core/relations.js 纯函数单测
// 覆盖：normalizeConversation 字符边界 / countSceneHits / pickMainAxis 并列优先级 /
//       resolveRelationTarget P1–P5 全路径
import { describe, it, expect } from 'vitest';
import {
  normalizeConversation,
  countSceneHits,
  pickMainAxis,
  resolveRelationTarget,
  SCENE_KEYWORDS,
} from '../src/core/relations.js';

describe('normalizeConversation', () => {
  it('剥离隐形空白（零宽 / BOM / 不换行空格 / 全角空格）', () => {
    const src = '我\u200B跟\u200C你\u200D说\uFEFF，\u00A0妈\u3000妈';
    const out = normalizeConversation(src);
    // 隐形空白（含全角空格 \u3000）被整体剥离，不保留占位
    const expected = '我' + '跟' + '你' + '说' + '，' + '妈' + '妈';
    expect(out).toBe(expected);
    expect(out).not.toMatch(/[\u200B-\u200D\uFEFF\u00A0\u3000]/);
    expect(out.length).toBe(7);
  });

  it('保留 \\n 与 \\t（P4 依赖前 3 行说话人标签）', () => {
    const src = '我：你好\n\nTA：\t你好吗';
    const out = normalizeConversation(src);
    expect(out).toContain('\n');
    expect(out).toContain('\t');
  });

  it('压缩连续空格为单空格（不含换行/制表符）', () => {
    expect(normalizeConversation('我    想说  话')).toBe('我 想说 话');
  });

  it('空输入 / null / undefined 返回空串', () => {
    expect(normalizeConversation('')).toBe('');
    expect(normalizeConversation(null)).toBe('');
    expect(normalizeConversation(undefined)).toBe('');
  });

  it('trim 首尾空白', () => {
    expect(normalizeConversation('   妈 妈   ')).toBe('妈 妈');
  });
});

describe('countSceneHits', () => {
  it('统计 family 关键词命中次数（同一词多次出现）', () => {
    const hits = countSceneHits('妈妈让我回家，妈妈很担心');
    expect(hits.family).toBeGreaterThanOrEqual(2);
  });

  it('统计 partner 关键词', () => {
    const hits = countSceneHits('老公说老婆别生气了');
    expect(hits.partner).toBe(2);
  });

  it('统计 friend 关键词', () => {
    const hits = countSceneHits('闺蜜和发小都劝我');
    expect(hits.friend).toBe(2);
  });

  it('无命中时全为 0', () => {
    expect(countSceneHits('今天天气不错')).toMatchObject({ family: 0, partner: 0, friend: 0 });
  });

  it('空输入返回全 0 结构', () => {
    expect(countSceneHits('')).toMatchObject({ family: 0, partner: 0, friend: 0 });
    expect(countSceneHits(null)).toMatchObject({ family: 0, partner: 0, friend: 0 });
  });

  it('V2：child / colleague 词典可命中', () => {
    expect(countSceneHits('辅导儿子写作业').child).toBeGreaterThan(0);
    expect(countSceneHits('开会时领导批评我').colleague).toBeGreaterThan(0);
  });

  it('V2 无双计：child 词不再计入 family（已从 family 移除）', () => {
    const hits = countSceneHits('辅导儿子写作业');
    expect(hits.child).toBeGreaterThan(0);
    expect(hits.family).toBe(0); // '儿子'/'作业' 已迁出 family
  });

  it('词典只含中性称呼词（宪法红线快照）', () => {
    const banned = ['妈宝', '扶弟魔', '凤凰男', '原生家庭', '创伤', '控制狂'];
    const all = [].concat(
      SCENE_KEYWORDS.family,
      SCENE_KEYWORDS.partner,
      SCENE_KEYWORDS.friend,
      SCENE_KEYWORDS.child,
      SCENE_KEYWORDS.colleague
    );
    for (const word of banned) {
      expect(all).not.toContain(word);
    }
  });
});

describe('pickMainAxis', () => {
  it('取命中最多者', () => {
    expect(pickMainAxis({ family: 1, partner: 3, friend: 2 })).toBe('partner');
  });

  it('并列时 伴侣 > 家人 > 朋友', () => {
    expect(pickMainAxis({ family: 2, partner: 2, friend: 2 })).toBe('partner');
    expect(pickMainAxis({ family: 2, partner: 0, friend: 2 })).toBe('family');
    expect(pickMainAxis({ family: 0, partner: 0, friend: 2 })).toBe('friend');
  });

  it('全为 0 返回 null', () => {
    expect(pickMainAxis({ family: 0, partner: 0, friend: 0 })).toBeNull();
  });

  it('空 / null 入参返回 null', () => {
    expect(pickMainAxis(null)).toBeNull();
    expect(pickMainAxis({})).toBeNull();
  });

  it('并列 家人 vs 朋友 → 家人优先', () => {
    expect(pickMainAxis({ family: 5, partner: 0, friend: 5 })).toBe('family');
  });
});

describe('resolveRelationTarget', () => {
  it('P1 用户显式选择 → 直接返回（即使 analysis 更倾向别的轴）', () => {
    const analysis = { scene: 'family' };
    expect(resolveRelationTarget(analysis, { explicitScene: 'friend' })).toBe('friend');
  });

  it('P1 非法值忽略，继续走后续优先级', () => {
    const analysis = { scene: 'partner' };
    expect(resolveRelationTarget(analysis, { explicitScene: 'bogus' })).toBe('partner');
  });

  it('P2 analysis.scene 合法枚举 → 采纳', () => {
    expect(resolveRelationTarget({ scene: 'partner' })).toBe('partner');
  });

  it('P2 analysis.parties[].relation → 采纳（并列取高优先级）', () => {
    const analysis = {
      parties: [{ relation: 'friend' }, { relation: 'family' }],
    };
    expect(resolveRelationTarget(analysis)).toBe('family');
  });

  it('P3 parties[].label / nickname 关键词命中', () => {
    const analysis = { parties: [{ label: '我老公' }, { label: '朋友' }] };
    expect(resolveRelationTarget(analysis)).toBe('partner');
  });

  it('P3 coreInsight 字段关键词命中（title/summary/perParty）', () => {
    const analysis = {
      coreInsight: {
        title: '和闺蜜的误会',
        summary: '',
        perParty: [],
      },
    };
    expect(resolveRelationTarget(analysis)).toBe('friend');
  });

  it('P3 coreInsight.perParty 子项也能命中', () => {
    const analysis = {
      coreInsight: {
        title: '无关标题',
        summary: '无关摘要',
        perParty: [{ title: '关于妈妈', summary: '妈妈的期待' }],
      },
    };
    expect(resolveRelationTarget(analysis)).toBe('family');
  });

  it('P4 前 3 行说话人标签命中（第 4 行不参与）—— V2：子女标签 → child', () => {
    const conversation = '儿子：\n女儿：\n我：\n老公：';
    // 前 3 行 = 儿子/女儿/我 -> 直接参与方为孩子 -> child（V2 起子女独立为 child 节点）
    expect(resolveRelationTarget({}, { conversation })).toBe('child');
  });

  it('P4 仅取前 3 行——第 4 行标签被忽略', () => {
    const conversation = '我：\nTA：\nTA：\n闺蜜：';
    // 前 3 行无关系关键词（「我」「TA」不在词典）→ none
    expect(resolveRelationTarget({}, { conversation })).toBe('none');
  });

  it('P5 全路径无命中 → none', () => {
    expect(resolveRelationTarget({}, {})).toBe('none');
    expect(resolveRelationTarget(null)).toBe('none');
    expect(resolveRelationTarget({})).toBe('none');
  });

  it('优先级顺序：P2 胜过 P3', () => {
    const analysis = {
      parties: [{ relation: 'partner', label: '我妈妈' }],
    };
    expect(resolveRelationTarget(analysis)).toBe('partner');
  });

  it('优先级顺序：P3 胜过 P4', () => {
    const analysis = { parties: [{ label: '我老公' }] };
    const conversation = '妈妈：\n妈妈：\n妈妈：';
    expect(resolveRelationTarget(analysis, { conversation })).toBe('partner');
  });
});

describe('resolveRelationTarget · V2 六节点可达性（V2-P0-8）', () => {
  it('family：父母场景 → family', () => {
    const analysis = { parties: [{ label: '我妈妈' }], coreInsight: { title: '妈妈的担心' } };
    expect(resolveRelationTarget(analysis)).toBe('family');
  });

  it('partner：配偶场景 → partner', () => {
    const analysis = { parties: [{ label: '老婆' }], coreInsight: { title: '老婆说我不关心她' } };
    expect(resolveRelationTarget(analysis)).toBe('partner');
  });

  it('friend：好友场景 → friend', () => {
    const analysis = { parties: [{ label: '闺蜜' }], coreInsight: { title: '和闺蜜的误会' } };
    expect(resolveRelationTarget(analysis)).toBe('friend');
  });

  it('child：子女场景 → child（G3 先判 child）', () => {
    const analysis = { parties: [{ label: '儿子' }], coreInsight: { title: '辅导儿子作业' } };
    expect(resolveRelationTarget(analysis)).toBe('child');
  });

  it('colleague：职场场景 → colleague（G2 短路）', () => {
    const analysis = { parties: [{ label: '领导' }], coreInsight: { title: '开会时领导批评我' } };
    expect(resolveRelationTarget(analysis)).toBe('colleague');
  });

  it('none：陌生人 / 无长期关系 → none（P5 兜底）', () => {
    const analysis = { parties: [{ label: '快递员' }], coreInsight: { title: '取快递' } };
    expect(resolveRelationTarget(analysis)).toBe('none');
  });
});

describe('resolveRelationTarget · V2 截胡防线（G1–G4）', () => {
  it('H1：「辅导儿子作业，我妈又插嘴」→ child（未被 family 抢走）', () => {
    // 直接参与方 = 儿子（child）；「妈」仅背景提及
    const analysis = {
      parties: [{ label: '儿子' }],
      coreInsight: { title: '辅导作业', summary: '我妈又插嘴' },
    };
    expect(resolveRelationTarget(analysis)).toBe('child');
  });

  it('H3：「我老婆嫌我加班太多」→ partner（不因「加班」误吞给 colleague）', () => {
    // 直接参与方 = 老婆（partner）；「加班」只是话题，G2 前置条件不满足
    const analysis = {
      parties: [{ label: '老婆' }],
      coreInsight: { title: '老婆嫌我加班太多' },
    };
    expect(resolveRelationTarget(analysis)).toBe('partner');
  });

  it('H4：「项目上出了事，我爸一直说我」→ family（不因「项目」误吞给 colleague）', () => {
    const analysis = {
      parties: [{ label: '我爸' }],
      coreInsight: { title: '项目上出了事', summary: '我爸一直说我' },
    };
    expect(resolveRelationTarget(analysis)).toBe('family');
  });

  it('G1「我妈总干涉我怎么管孩子」→ family（参与方是妈，孩子是议题）', () => {
    const analysis = {
      parties: [{ label: '我妈' }],
      coreInsight: { title: '我妈总干涉我怎么管孩子' },
    };
    expect(resolveRelationTarget(analysis)).toBe('family');
  });

  it('G4：P3/P4 全部未命中 → 仅 P5 产 none', () => {
    const analysis = { parties: [{ label: '路人' }], coreInsight: { title: '今天天气' } };
    expect(resolveRelationTarget(analysis)).toBe('none');
  });
});

describe('resolveRelationTarget · V2 词频退化分支（参与方空集）', () => {
  it('参与方为空集 → 退化为词频最多者（无说话人标签是常态）', () => {
    // 无 parties / 无 conversation 标签 -> parties 为空 -> 词频决定
    const analysis = { coreInsight: { title: '老公和我吵架了' } };
    expect(resolveRelationTarget(analysis)).toBe('partner');
  });

  it('参与方为空集且词频全 0 → none', () => {
    expect(resolveRelationTarget({ coreInsight: { title: '什么都没说' } })).toBe('none');
  });

  it('参与方非空 → 词频完全退出竞争（边界写死）', () => {
    // 参与方 = 同事（colleague），但文本大量出现「老公」
    // 因 parties 非空，词频不得复活 -> colleague（4a 命中专属词 + 参与方为职场）
    const analysis = {
      parties: [{ label: '同事' }],
      coreInsight: { title: '老公的老公的老公' },
    };
    expect(resolveRelationTarget(analysis)).toBe('colleague');
  });
});
