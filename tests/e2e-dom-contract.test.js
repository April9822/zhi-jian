// tests/e2e-dom-contract.test.js —— 「真实 DOM 契约」结构验收（L2：读真实产物文件断言）
//
// 为什么不用 jsdom：jsdom 不做 layout，getBoundingClientRect() 恒返回 0、offsetParent 恒 null，
// 用它测 320px 布局/点击/键盘只会得到「假绿」，比不测更危险。
// 本文件只做「真实产物文件（index.html / style.css / router.js）的结构与契约断言」——
// 这是确定性、零依赖、可在 CI 稳定跑的 L2 层。
// 「真实浏览器行为」（布局 / 点击 / 键盘 / scrollWidth）属 L3，见 tests/e2e-browser.*.md 的说明与
// scripts/check-e2e.mjs（需真实浏览器，本沙箱不可用，见方案 §2）。
//
// 覆盖来源：架构文档 §A.3（五区域）/ §A.6（溪边动物契约）/ §A.6.7（320px 降级）/
//           §C.3（必守防护）/ PRD 宪法（术语 / emoji）。
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let html = '';
let css = '';
let router = '';

beforeAll(() => {
  html = read('index.html');
  css = read('src/style.css');
  router = read('src/core/router.js');
});

// ============================================================
// ① 五生态区域 DOM 齐备（§A.3 / nodes.js elId 契约）
// ============================================================
describe('E2E · 五生态区域 DOM 齐备（§A.3）', () => {
  // id 来源 = core/nodes.js 的 elId（单一派生源）。此处是「契约镜像」，
  // 故意写死字面量以在 nodes.js 改动时立刻报警（测试文件豁免 check-nodes 字面量禁令）。
  const REGION_IDS = ['eco-tree', 'eco-flower', 'eco-stream', 'eco-nursery', 'eco-camp'];

  it('五个 eco-* 区域 id 全部存在于 index.html', () => {
    for (const id of REGION_IDS) {
      expect(html, `缺少区域 #${id}`).toContain(`id="${id}"`);
    }
  });

  it('每个区域带 data-anchor（锚点契约）', () => {
    for (const anchor of ['family', 'partner', 'friend', 'child', 'colleague', 'self']) {
      expect(html, `缺少 data-anchor="${anchor}"`).toContain(`data-anchor="${anchor}"`);
    }
  });

  it('#garden-scene 容器存在（渲染基准 + 事件委托目标）', () => {
    expect(html).toContain('id="garden-scene"');
  });
});

// ============================================================
// ② 溪边动物交互契约（§A.6.2 / §A.6.3）
// ============================================================
describe('E2E · 溪边动物契约（§A.6）', () => {
  it('4 只动物为 <button type="button">（天然键盘可达）', () => {
    // 每只 animal 都应是 button，且 data-animal 值域正确
    for (const a of ['fox', 'rabbit', 'squirrel', 'deer']) {
      const re = new RegExp(`<button[^>]*class="animal"[^>]*data-animal="${a}"`);
      expect(html, `动物 ${a} 不是 <button class="animal" data-animal=...>`).toMatch(re);
    }
  });

  it('每只动物带 aria-pressed 初始态', () => {
    const pressed = html.match(/data-animal="(fox|rabbit|squirrel|deer)"[^>]*aria-pressed="false"/g) || [];
    expect(pressed.length).toBe(4);
  });

  it('.stream-animals 子组存在（迁移后的容器）', () => {
    expect(html).toContain('stream-animals');
  });

  it('历史名词 animal-zone 已彻底清除（迁移完成）', () => {
    expect(html).not.toContain('animal-zone');
  });

  it('sprite 为装饰（aria-hidden），名字可读', () => {
    expect(html).toContain('class="animal-sprite fox-sprite" aria-hidden="true"');
    expect(html).toContain('class="animal-name"');
  });

  it('零内联 onclick（宪法：事件委托）', () => {
    // 排除 HTML 注释里的示例
    const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
    expect(stripped).not.toMatch(/\son[a-z]+\s*=\s*["']/i);
  });
});

// ============================================================
// ③ 底部导航（4 项，data-nav 值域）
// ============================================================
describe('E2E · 底部导航（4 项）', () => {
  it('存在 4 个 .nav-item 且 data-nav 值域 = garden/talk/record/me', () => {
    for (const nav of ['garden', 'talk', 'record', 'me']) {
      expect(html, `缺少 data-nav="${nav}"`).toContain(`data-nav="${nav}"`);
    }
    const items = html.match(/class="nav-item[^"]*"/g) || [];
    expect(items.length).toBe(4);
  });

  it('初始态「花园」高亮（.nav-item.active）', () => {
    expect(html).toMatch(/class="nav-item active"[^>]*data-nav="garden"/);
  });
});

// ============================================================
// ④ 底部导航高亮跟随（B5 已修复 → 正向断言，防回归）
// ============================================================
describe('E2E · 底部导航高亮跟随（B5 回归防护）', () => {
  it('goTo() 切换 .screen active 与 body[data-screen]', () => {
    expect(router).toContain("classList.toggle('active', id === screenId)");
    expect(router).toContain('document.body.dataset.screen = screenId');
  });

  it('goTo() 内部调用导航高亮同步（B5 已修复，防回退）', () => {
    // B5 曾为真 bug（goTo 只切 .screen.active，不更新 .nav-item.active），
    // 工程师已加 syncNavActive()。此断言锁死「切屏必同步导航高亮」，防回退。
    expect(router).toContain('syncNavActive(screenId)');
    expect(router).toContain('garden-bottomnav .nav-item');
    expect(router).toContain("classList.toggle('active'");
  });

  it('NAV_BY_SCREEN 映射正确（garden-screen→garden, input-screen→talk）', () => {
    expect(router).toMatch(/'garden-screen':\s*'garden'/);
    expect(router).toMatch(/'input-screen':\s*'talk'/);
  });

  it('占位导航（record/me）不映射到真实屏幕（走 data-toast）', () => {
    // 若未来把 record/me 映射成屏幕，此断言会提示需补对应 screen
    expect(router).not.toMatch(/'(record|me)':\s*'/);
  });
});

// ============================================================
// ⑤ 根脉 SVG 三件套与关键 CSS（§C.3 必守防护）
// ============================================================
describe('E2E · 根脉 CSS 契约（§A.2.4 / §C.3）', () => {
  it('.root-vein / .root-main / .root-spark / .root-vein-hit / .root-branch 均有样式', () => {
    for (const cls of ['.root-vein', '.root-main', '.root-spark', '.root-vein-hit', '.root-branch']) {
      expect(css, `CSS 缺少 ${cls}`).toContain(cls);
    }
  });

  it('四档 root-vein 修饰类齐全', () => {
    for (const t of ['thin', 'mid', 'thick', 'full']) {
      expect(css, `CSS 缺少 .root-vein--${t}`).toContain(`.root-vein--${t}`);
    }
  });

  it('零 !important（§C.3 #6，prefers-reduced-motion 例外）', () => {
    const stripped = css.replace(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g,
      ''
    );
    expect(stripped).not.toContain('!important');
  });
});

// ============================================================
// ⑥ 宪法「运行时/动态文案」维度（与 scripts/check-constitution.mjs 明确分工，不重叠）
// ============================================================
// 分工声明（架构师 check-constitution.mjs 头部已定义边界）：
//   · scripts/check-constitution.mjs = 静态源码文本（index.html 文本/属性、JS 字符串字面量、CSS content）
//   · 本文件 = 【模块导出的文案常量表】与【动态生成的模板字符串】，即静态扫描够不到的一层。
// 因此这里【不】重复扫描 index.html，只锁定源码常量表 + 动态文案生成函数。
describe('E2E · 宪法文案纪律（运行时/动态层）', () => {
  // 真 emoji 区段（不含 → ↓ ★ 等排版字形）
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/u;
  const BANNED = [
    '关系能量',
    '关系分数',
    '数据看板',
    '裁决书',
    '改进计划',
    '渣男',
    '妈宝',
    '扶弟魔',
    '巨婴',
    '控制狂',
    '凤凰男',
  ];

  it('garden.js 导出的 STATUS_TEXT 表：无 emoji / 无禁用术语', async () => {
    const { STATUS_TEXT } = await import('../src/modules/garden.js');
    const all = Object.values(STATUS_TEXT)
      .flatMap((bySeason) => Object.values(bySeason))
      .join(' ');
    expect(all).not.toMatch(EMOJI);
    for (const w of BANNED) expect(all, `STATUS_TEXT 含「${w}」`).not.toContain(w);
  });

  it('garden.js 导出的 SEASONS 表：无 emoji / 无禁用术语', async () => {
    const { SEASONS } = await import('../src/modules/garden.js');
    const all = SEASONS.join(' ');
    expect(all).not.toMatch(EMOJI);
    for (const w of BANNED) expect(all, `SEASONS 含「${w}」`).not.toContain(w);
  });

  it('report.js 动态生成的总览文案（buildTotalReportHTML 路径）：无百分比分数外显', async () => {
    // calcNurtureScore 是 report.js 的导出纯函数；其 energyLabel 文案不得外显「分数」
    const src = read('src/modules/report.js');
    // 动态文案里不得出现「分」作为分数单位（如「85 分」）
    expect(src).not.toMatch(/\d+\s*分['"`]/);
    expect(src).not.toContain('得分');
  });

  it('toast 动态文案不含 emoji（扫描 showToast(/document 派发）', () => {
    // 静态层已扫字符串字面量；此处额外锁「模板字符串插值」路径不含 emoji 字面量
    const files = ['src/modules/input.js', 'src/modules/garden.js', 'src/modules/report.js', 'src/core/router.js'];
    for (const f of files) {
      const src = read(f);
      const m = src.match(EMOJI);
      expect(m, `${f} 含 emoji: ${m && m[0]}`).toBeNull();
    }
  });
});

// ============================================================
// ⑦ 320px 降级契约（§A.6.7）—— 仅断言「CSS 规则存在」（布局真值属 L3）
// ============================================================
describe('E2E · 320px 降级契约存在性（§A.6.7，布局真值属 L3）', () => {
  it('存在 ≤320px 媒体查询', () => {
    expect(css).toMatch(/@media[^{]*max-width:\s*320px/);
  });

  it('320px 下 .animal-name 隐藏（省空间，交互由 aria-label 保可访问）', () => {
    const mq = css.match(/@media[^{]*max-width:\s*320px[^{]*\{[\s\S]*?\n\}/);
    expect(mq, '未找到 320px 媒体查询块').not.toBeNull();
    expect(mq[0]).toContain('.animal-name');
  });
});
