# 代码基线勘察报告（供架构设计输入）

> 勘察人：齐活林（交付总监）
> 勘察时间：2026-09-15
> 勘察方式：逐文件精读 + 全局模式扫描（只读，未修改任何文件）
> 项目根目录：`D:\AI\WorkBuddy\zhi-jian`

本报告是**架构设计的输入基线**，所有数据均为实测，非文档自述。架构师可直接引用，无需重复勘察。

---

## 一、文件清单（项目自有资产）

```
D:\AI\WorkBuddy\zhi-jian\
├── index.html                    410 行 · 8 个全屏 .screen
├── package.json                   14 行 · 唯一依赖 vite ^6.0.0
├── vite.config.js                 92 行 · 本地 Serverless 模拟插件
├── vercel.json                     8 行 · 部署配置
├── .gitignore                      8 行 · 配置正确
├── .github/workflows/deploy.yml   24 行 · push master 自动部署
├── src/
│   ├── main.js                  1743 行 · 约 70KB（单文件，零拆分）
│   └── style.css                 654 行
├── api/
│   ├── _core.js                  201 行 · AI 分析核心（单一来源）
│   └── analyze.js                 49 行 · Vercel HTTP 处理器
├── public/                       26 文件 · 17 个 icon-*.png + 3 PDF + 6 设计参考 PNG
├── docs/                         本次新建
└── .claude/
    ├── CLAUDE.md                 155 行 · 项目主入口
    ├── settings.json              73 行 · 权限 + 3 类 hooks + 规则引用
    ├── agents/                   8 个智能体定义
    ├── rules/
    │   ├── product-principles.md   205 行 · 产品宪法
    │   ├── design-system-guard.md  113 行 · 设计系统
    │   ├── ai-analysis-pipeline.md 145 行 · AI 管线规范
    │   ├── code-quality.md         173 行 · 代码规范
    │   └── iteration-workflow.md    63 行 · 小步迭代约定
    ├── memory/                   10 文件（9 个为临时污染）
    ├── previews/                 16 HTML 原型 + 23 PNG + 23 JPG
    ├── backups/2026-07-23-v9/     3 文件（旧版本整包）
    ├── workflows/                 2 个 JS
    ├── read_pdf.py
    └── analyze_ref.py
```

---

## 二、index.html 结构（410 行）

### 八个全屏 screen 及行号

| 行号 | id | class | 说明 |
|:---:|---|---|---|
| 12 | `intro-screen` | `screen active intro-screen` | Welcome，含 2 个 canvas |
| 111 | `space-screen` | `screen` | 知间空间（账号导航） |
| 183 | `account-screen` | `screen` | 注册 |
| 205 | `login-screen` | `screen` | 登录 |
| 229 | `garden-screen` | `screen` | **关系花园（本次重构目标）** |
| 334 | `input-screen` | `screen` | 输入页 |
| 378 | `loading-screen` | `screen` | 加载动画（**注意是 `<div>` 不是 `<main>`**） |
| 390 | `report-screen` | `screen` | 报告页（10 个 section） |

脚本引入：第 407 行 `<script type="module" src="/src/main.js"></script>`
样式引入：第 7 行 `<link rel="stylesheet" href="/src/style.css" />`

### 🔴 缺陷 1：login-screen 标签未闭合（205-226 行）

```html
205: <main id="login-screen" class="screen">
206:   <div class="account-container">
207:     <div class="account-hero">...</div>
211:     <div class="account-form">          ← 开标签，从未被正确闭合
212:       <div class="form-field">...</div>
217:       <div class="form-field">...</div>
221:       <div class="form-field form-row">
222:         <input type="text" placeholder="验证码" style="flex:1">
223:         <button class="btn-code">获取验证码</button>
224:       </div>                             ← 闭合 .form-field.form-row
225:     </div>                               ← 这里闭合的其实是 .account-form
226: </main>                                  ← main 提前结束，.account-container 悬空
```

**开合标签栈错位**：`.account-container`(206) 与 `.account-form`(211) 只有一个 `</div>`(225) 闭合。
浏览器容错渲染不会崩，但 DOM 树是错的，后续布局调整必踩坑。

### 🔴 缺陷 2：6 处内联 onclick（违反 code-quality.md 第三节）

| 行号 | 元素 | onclick 内容 |
|:---:|---|---|
| 105 | `.intro-btn.primary` | `window.goToInput(event)` |
| 106 | `.intro-btn.secondary` | `window.goToSpace(event)` |
| 174 | `.btn-signup` | `document.getElementById('space-screen').classList.remove('active');document.getElementById('account-screen').classList.add('active')` |
| 175 | `.signup-link a` | `document.getElementById('space-screen').classList.remove('active');document.getElementById('login-screen').classList.add('active')` |
| 198 | `.btn-signup` | `document.getElementById('account-screen').classList.remove('active');document.getElementById('garden-screen').classList.add('active');document.body.style.overflow='auto'` |
| 199 | `.signup-link a` | `document.getElementById('account-screen').classList.remove('active');document.getElementById('login-screen').classList.add('active')` |

**关键观察**：174/175/198/199 这四处走的是「直接操作 classList」的野路子；而 `main.js` 的 `bindGardenEvents()` IIFE（1663-1742）走的是「addEventListener + 统一函数」的正路。
**同一项目存在两套页面切换范式**，这是最大的认知负担来源。

### 🟠 缺陷 3：内联 style 属性约 30 处

主要集中在 intro-screen 的动画延迟与字号（18-57 行），例如：

```html
18: <div class="scene s1" style="animation-delay:0s">
19:   <p class="sl" style="animation-delay:0.2s"><span style="font-size:36px;font-weight:500;opacity:1">你来了……</span></p>
```

另在 input-screen（371 行 `.privacy-note` 的 `margin-bottom:16px`）、report-screen（401 行按钮的 `margin-bottom:8px`）有零散内联样式。

### 花园页 DOM 结构（229-331 行，本次重构目标）

```
#garden-screen.screen
├── header.garden-topbar                    [231-234]
│   ├── span.garden-logo「知间」
│   └── button#garden-top-analyze「+ 倾诉」
├── div.garden-scroll                        [237-322]
│   ├── section.nurture-card                 [239-247] 关系养分总览卡
│   │   ├── span.nurture-icon 🌱
│   │   ├── span.nurture-label「关系养分」
│   │   ├── span#nurture-total「0」
│   │   ├── p#nurture-status「你的关系正在慢慢生长」
│   │   └── button#nurture-practice-btn「🌿 重新模拟对话」
│   └── div.garden-scene                     [250-321] 花园场景（5 层叠加）
│       ├── canvas#gardenCanvas              [251]
│       ├── div.garden-bg                    [254-261]
│       │   ├── div.garden-sun
│       │   ├── div.ink-mountain.mtn-far
│       │   ├── div.ink-mountain.mtn-near
│       │   └── div.distant-woods > span.dw.d1~d4
│       ├── div.garden-midlayer              [264-276]
│       │   ├── div#eco-tree.eco-tree
│       │   │   ├── div.tree-roots > span.root ×3
│       │   │   ├── div.tree-trunk > span.trunk-ring
│       │   │   ├── div.tree-crowns > span.tc.tc1~tc3
│       │   │   ├── div.tree-ribbon 🎐
│       │   │   └── span.glabel「家人 · 古树」
│       │   └── div.stone-lantern > span.lantern-light
│       ├── div.garden-fore                  [279-317]
│       │   ├── div#eco-flower.eco-flower
│       │   │   ├── div.flower-stem
│       │   │   ├── div.flower-head > span.fh-petal ×5 + span.fh-core
│       │   │   └── span.glabel「伴侣 · 花」
│       │   ├── div#animal-zone.animal-zone
│       │   │   ├── p#animal-hint「选一位小伙伴吧」
│       │   │   └── div.animal.fox|.rabbit|.squirrel|.deer ×4
│       │   │       ├── span.animal-sprite.{name}-sprite
│       │   │       └── span.animal-name
│       │   └── div#eco-seedling.eco-seedling
│       │       ├── div.seedling-mound
│       │       ├── span.sprout
│       │       └── span.glabel「自我 · 新芽」
│       └── div.garden-floor                 [320]
└── nav.garden-bottomnav                     [325-330]
    ├── button.nav-item.active[data-nav=garden]  🏡 花园
    ├── button.nav-item#nav-talk[data-nav=talk]  💬 倾诉
    ├── button.nav-item#nav-record[data-nav=record] 📋 记录
    └── button.nav-item#nav-me[data-nav=me]      👤 我的
```

---

## 三、src/main.js 结构（1743 行，拆分目标）

### 按行号切片的职责分布

| 行号区间 | 职责 | 规划归属 |
|---|---|---|
| 9-10 | `var lastClickX/lastClickY` 涟漪点击位置 | `modules/welcome.js` |
| 12-39 | 按钮涟漪效果（document click 委托） | `modules/welcome.js` |
| 44-108 | `window.goToInput` 消融转场 | `modules/welcome.js` |
| 113-116 | `const state`（conversation / inputMode） | `core/state.js` |
| 121-138 | `$` `$$` `dom` 引用（**模块顶层立即执行 querySelector**） | `core/dom.js` |
| 143-162 | Tab 切换 | `modules/input.js` |
| 167-202 | 图片上传（uploadBtn / imageInput / handleImageFile） | `modules/input.js` |
| 193-202 | `handleImageFile` | `modules/input.js` |
| 222-247 | `updateAnalyzeButton` | `modules/input.js` |
| 254-301 | `startAnalysis()` API 调用 + 跳转 loading | `modules/input.js` |
| 306-370 | `renderReport()` 总编排（分层揭示） | `modules/report.js` |
| 374-385 | `buildPartyLabelMap` / `partyName` | `modules/report.js` |
| 387-398 | `renderCoreInsight` | `modules/report.js` |
| 403-427 | `renderResponsibilityRatio` | `modules/report.js` |
| 432-482 | `renderDualColumns` | `modules/report.js` |
| 487-508 | `renderReplay` | `modules/report.js` |
| 513-537 | `renderWhatIf` | `modules/report.js` |
| 542-578 | `renderEmotionAnalysis` | `modules/report.js` |
| 583-603 | `renderEmotionRelief` | `modules/report.js` |
| 605-679 | `renderIcebreakers` | `modules/report.js` |
| 684-711 | `calcEnergyScore` | `modules/report.js` |
| 713-760 | `renderTotalReport` | `modules/report.js` |
| 762-763 | `var shareAnalysisRef` / `var shareBound` | `modules/report.js` |
| 765-799 | `setupShare` | `modules/report.js` |
| 825-834 | `showToast` | `core/utils.js` |
| 836-838 | `escapeHtml` | `core/utils.js` |
| 843-854 | `handleSharedLink` | `modules/report.js` |
| 856-903 | `renderSharedView` | `modules/report.js` |
| 913-915 | `var loadingTimer/loadingWarmTimer/loadingStopped` | `modules/report.js` |
| 917-965 | `startLoadingMessages` | `modules/report.js` |
| 967-973 | `stopLoadingMessages` | `modules/report.js` |
| 978-1034 | `window.goToSpace` 消融转场 | `modules/space.js` |
| 1055 | `var currentViewParty` | `modules/report.js` |
| 1057-1121 | `showRolePicker` 视角选择器 | `modules/report.js` |
| 1123-1262 | 视角切换逻辑 | `modules/report.js` |
| 1268-1278 | `var GARDEN_DATA` | `modules/garden.js` |
| 1279-1280 | `var SEASONS` / `var SEASON_ICONS` | `modules/garden.js` |
| 1282-1287 | `getSeasonIndex` / `getSeasonName` | `modules/garden.js` |
| 1289-1321 | `initGarden` | `modules/garden.js` |
| 1323-1345 | `window.waterGarden` | `modules/garden.js` |
| 1347-1352 | `var gardenObserver`（MutationObserver） | `modules/garden.js` |
| 1354-1439 | 花园渲染逻辑 | `modules/garden.js` |
| 1441-1540 | 花园交互逻辑 | `modules/garden.js` |
| 1545-1606 | `initGardenCanvas` 粒子动画 | `modules/garden.js` |
| 1611-1637 | `window.waterCreature` | `modules/garden.js` |
| 1642-1658 | `getNurture` / `addNurture` / `updateNurtureUI` | `modules/garden.js` |
| 1663-1742 | `bindGardenEvents` IIFE（花园事件绑定） | `modules/garden.js` |

### 违规统计（实测）

| 违规项 | 数量 | 行号 |
|:---:|:---:|---|
| `var` 声明 | **13** | 9, 10, 762, 763, 913, 914, 915, 1055, 1268, 1279, 1280, 1347, 1350 |
| `window.*` 全局挂载 | **4** | 44 (`goToInput`), 978 (`goToSpace`), 1323 (`waterGarden`), 1611 (`waterCreature`) |
| `innerHTML =` | **18** | 389, 425, 474, 476, 507, 527, 577, 598, 664, 721, 860, 868, 895, 1094, 1301 (及 3 处渲染函数内) |
| 模块顶层立即 DOM 查询 | **2 组** | 121-138（`dom` 对象）、1663（IIFE） |

### 🟠 关键脆弱点：依赖 `<script type="module">` 的 defer 语义

`main.js` 第 124-138 行与 1663 行的 IIFE 都在**模块顶层直接执行 `document.querySelector`**：

```js
// 124-138 行：模块顶层立即查询 DOM
const dom = {
  inputScreen: $('#input-screen'),
  // ...
};
```

```js
// 1663 行：模块顶层立即执行 IIFE
(function bindGardenEvents() {
  var garden = document.getElementById('garden-screen');
  // ...
})();
```

这**能工作仅仅因为** `index.html` 第 407 行用的是 `<script type="module">`（ES module 自带 defer 语义）。
一旦有人把脚本移到 `<head>`、或改成非 module 的 `<script>`，**整个应用静默崩溃**。
这是「靠执行顺序的巧合」的脆弱设计，必须改为惰性查询。

---

## 四、src/style.css 结构（654 行）

### 分段概览

| 行号 | 段落 | 备注 |
|:---:|---|---|
| 1-18 | 文件头注释 + `:root` 变量 + 全局重置 + `body` | `:root` 含 `--warm-card:#fff`（**自身违规**） |
| 20-118 | Welcome（intro-screen / scene / 星空 / 按钮涟漪） | 大量内联式单行压缩写法 |
| 120-158 | 输入页（input-screen / input-card / tab / textarea / identity-btn / btn-primary） | |
| 160-277 | 报告页（report-container / 各 section / 卡片 / 图表 / toast） | |
| 279-296 | 加载页（warmCanvas / loading-screen / loading 动画） | |
| 298-361 | 空间页（space-screen / account / login） | |
| 362-380 | 账号页背景 | |
| 381-512 | 报告页补充样式 + 各 zi-* 装饰符 | |
| 514-653 | **关系花园（本次重构目标）** | 见下 |
| 648-653 | 响应式 `@media(max-width:480px)` | |

### 花园页 CSS 详情（514-653 行，140 行）

```css
/* 主容器 */
#garden-screen{position:relative;height:100vh;height:100dvh;overflow:hidden;
  background:linear-gradient(180deg,#FDF5E8 0%,#F9EAD0 25%,#F3E3C1 55%,#E8D7B5 100%)}
#garden-screen.active{display:flex!important;flex-direction:column;align-items:stretch}

/* 顶部栏 height:56px，底部栏 height:64px */
/* 中间 .garden-scroll flex:1 overflow-y:auto padding:16px 16px 20px */

/* 关系养分卡 */
.nurture-card{background:rgba(255,250,242,.82);border-radius:18px;padding:18px 20px;...}
.nurture-value{font-size:32px;font-weight:600;...}   /* ⚠️ 字重 600 偏重 */
.nurture-cta{width:100%;min-height:48px;...}

/* 花园场景 —— 5 层叠加 */
.garden-scene{position:relative;flex:1 0 auto;min-height:440px;border-radius:18px;overflow:hidden;...}
#gardenCanvas{position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none}

.garden-bg{position:absolute;top:0;left:0;width:100%;height:65%;z-index:0;pointer-events:none}
  .garden-sun{top:8%;right:22%;width:70px;height:70px}  /* 呼吸动画 sunWarm 4s */
  .mtn-far{left:5%;width:55%;height:45%;bottom:0}
  .mtn-near{right:0;width:65%;height:35%;bottom:0}
  .distant-woods{bottom:15%;left:0;width:100%}  /* .dw 宽度 16px，高度 50/38/55/42px */

.garden-midlayer{position:absolute;bottom:28%;left:0;width:100%;height:50%;z-index:3;pointer-events:none}
  .eco-tree{bottom:0;left:6%}                          /* ⚠️ 窄屏改 left:2% */
    .tree-trunk{width:18px;height:85px}
    .tree-crowns{top:-75px;left:50%;transform:translateX(-50%);width:100px;height:90px}  /* 🔴 越界 */
      .tc1{width:95px;height:85px}
    .tree-ribbon{top:-20px;right:-10px}  /* 🎐 emoji */
  .stone-lantern{bottom:15%;right:8%;width:30px;height:55px}  /* 🟠 无语义纯装饰 */

.garden-fore{position:absolute;bottom:10%;left:0;width:100%;height:42%;z-index:4;pointer-events:none}
  .eco-flower{bottom:8%;left:38%}              /* ⚠️ 窄屏改 left:32% */
    .flower-stem{height:65px}                  /* ⚠️ 窄屏改 50px */
    .flower-head{top:-30px;width:48px;height:48px}   /* 花总高约 95px */
  .animal-zone{bottom:5%;left:50%;transform:translateX(-50%);gap:14px;padding:10px 18px}
    /* 4 个动物 × 32px + 3 个 gap × 14px + padding 36px ≈ 206px → 横向覆盖约 35%~65% */
    /* 🔴 与 .eco-flower(left:38%) 视觉重叠 */
  .eco-seedling{bottom:2%;left:12%}
    .sprout{height:32px}  /* 幼苗总高约 42px */

.garden-floor{bottom:0;height:12%;z-index:5}

/* 响应式 */
@media(max-width:480px){
  .eco-tree{left:2%} .tree-trunk{height:65px} .tc1{width:75px;height:65px;top:5px}
  .eco-flower{left:32%} .flower-stem{height:50px}
  .animal-zone{gap:8px;padding:8px 12px} .animal-sprite{width:26px;height:22px}
  .eco-seedling{left:6%}
}
```

### 违规统计（实测，全文件）

| 违规项 | 数量 | 行号 |
|:---:|:---:|---|
| `!important` | **8** | 113, 137, 269, 270, 271, 272, 503, 519 |
| ID 选择器做样式 | **14** | 120, 160, 279, 280, 290, 298, 362, 381, 382, 478, 481, 518, 519, 542 |
| 禁用色值 `#000`/`#fff`/`#FFFFFF` | **21 处** | 含 `:root` 内 `--warm-card:#fff`(7)、`body{background:#000}`(16)、`.intro-screen{background:#000}`(23) 等 |
| `font-weight: 600` | **3** | `.garden-logo`(523)、`.nurture-value`(535)、`.btn-primary`(147) |

### 🔴 重复定义（语义冲突）

```css
/* 第一处 #garden-screen */
382: #garden-screen{height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
      background:linear-gradient(180deg,#FDF0E0 0%,#F2D5B0 50%,#E8BD90 100%)}

/* 第二处 #garden-screen —— 覆盖前者的 height/overflow/background */
518: #garden-screen{position:relative;height:100vh;height:100dvh;overflow:hidden;
      background:linear-gradient(180deg,#FDF5E8 0%,#F9EAD0 25%,#F3E3C1 55%,#E8D7B5 100%)}
```

```css
/* #gardenCanvas 同样两次 */
381: #gardenCanvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}
542: #gardenCanvas{position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none}
```

**后果**：382 行的 `overflow-y:auto` + `#F2D5B0` 背景被 518 行覆盖；381 行的 `position:fixed` + `z-index:0` 被 542 行覆盖。
这是**迭代式追加、从未重构**的典型腐化。另有 `.force-refresh{}` 空规则、`/* 移除旧 halo */ .halo{display:none}` 残骸。

---

## 五、api/ 与 vite.config.js

### api/_core.js（201 行）

**导出**：`SYSTEM_PROMPT`、`BALANCE_CHECK_PROMPT`、`buildUserPrompt(conversation, userRole)`、`runAnalysis(conversation, userRole, apiKey)`

**这是全项目做得最好的一处**：文件名 `_` 前缀让 Vercel 不将其部署为独立 Function，同时被 `api/analyze.js` 与 `vite.config.js` 共同 import，消除了生产/开发逻辑分叉。

**🔴 缺陷 1：buildUserPrompt 与 SYSTEM_PROMPT 自相矛盾**

```js
// SYSTEM_PROMPT 第 18 条（第 18 行）
// "每个参与者的 label 优先提取对话中出现的真实称呼…禁止用"A/B/C"或"参与方1"这类代号。"

// 但同一文件第 114 行：
export function buildUserPrompt(conversation, userRole) {
  const roleLabel = userRole === 'A' ? 'A' : userRole === 'B' ? 'B' : '未标注（AI 自动判断）';
  return `用户标注自己的身份为：${roleLabel}。...`;
}
```

**同一文件，System Prompt 禁止 A/B，User Prompt 却在用 A/B。** 模型收到冲突信号，行为不可预测。

**🟠 缺陷 2：单 Prompt 一次性产出全部七维 JSON**

`runAnalysis` 的两次调用：
- 第 1 次：`SYSTEM_PROMPT` + `userPrompt` → 一次性产出 `parties`/`coreInsight`/`responsibilityRatio`/`dualAnalysis`/`replay`/`whatIf`/`emotionAnalysis`/`emotionRelief`/`icebreakers`/`behavioralNotes` 全部字段
- 第 2 次：追加 `BALANCE_CHECK_PROMPT` 做全局平衡复查（失败不阻断）

**与 `.claude/rules/ai-analysis-pipeline.md` 严重冲突**：
- 规范要求「6 步强制流程，**禁止用一个 Prompt 一次性生成所有内容**」→ 实现正是单 Prompt
- 规范要求「每个步骤的 Prompt 至少包含 **2 个 Few-shot 示例**」→ `SYSTEM_PROMPT` 中**零 Few-shot**
- 规范要求「**每个分析步骤**末尾追加平衡检查」→ 实现只有一次全局检查
- 规范要求「禁止给维度打分」→ schema 含 `anxiety:65, anger:30, sadness:55, hurt:40, exhaustion:45, helplessness:60` 六个 0-100 数值

**🟠 缺陷 3：两次串行调用，无超时控制**

两次调用各 `max_tokens: 4000`，`api/analyze.js` 配 `maxDuration: 60`。
`QA-LOG.md` 记录实测「响应 26s」→ **余量仅 34s**，高峰期极易 504。
且两次 `fetch` 均**无 `AbortController` 超时**。

**🟠 缺陷 4：术语违规**

`main.js` 第 684 行 `calcEnergyScore(analysis)` —— 函数名用了「Energy」，
而 `product-principles.md` 第 180 行明令「关系能量 ❌ → 关系养分 ✅」。

### api/analyze.js（49 行）

**🔴 缺陷：三处校验口径不一致**

```js
// api/analyze.js:27
if (!conversation || conversation.trim().length < 20) { ... }   // 字符数 ≥20

// vite.config.js:52
if (!conversation || conversation.trim().length < 20) { ... }   // 同样是字符数 ≥20

// 但 QA-LOG.md:58 声称：
// "验证逻辑：从 char length 改为 line count（至少 3 条有意义对话）"
```

**三处不一致，且 QA-LOG 声称的改动从未落地。**

**🟠 其他缺陷：**
- `res.setHeader('Access-Control-Allow-Origin', '*')`（第 13 行）—— 一个 DeepSeek 计费 API 允许任意站点调用，等于替别人买单
- 错误不分级（第 40-43 行所有异常统一 500 + 同一句话）
- 校验逻辑与 `vite.config.js` 重复

### vite.config.js（92 行）

**亮点**：自定义 `apiProxyPlugin()` 在本地 dev 模拟 Vercel Serverless，且 import 同一份 `runAnalysis`。

**🟠 缺陷：**
- `loadEnvLocal()`（7-18 行）手写 `.env.local` 解析：`line.split('=')` 不处理 `# 注释`、`export KEY=`、引号包裹值、空行。Vite 自带 `loadEnv` 可直接用
- `JSON.parse(body)`（50 行）**无 try/catch** → 畸形 JSON 会抛异常且无外层捕获，**本地 dev server 崩溃**
- 校验与方法检查逻辑与 `api/analyze.js` 重复（CORS、method、length 各一份）

---

## 六、其他配置

### package.json（14 行）

```json
{
  "name": "zhi-jian", "version": "1.0.0",
  "description": "知间 InBetween — 理解人与人之间",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "vite": "^6.0.0" }
}
```

**缺陷**：
- `vite` 在 `dependencies`（应 `devDependencies`）
- 无 `engines`（未声明 Node 版本，`for await (const chunk of req)` 需 Node 18+）
- 无 `private: true`
- 无 `lint` / `format` / `test` / `check` 脚本
- `version: 1.0.0` 与实际「可用原型迭代」阶段不符（建议 `0.1.0`）

### vercel.json（8 行）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/dist/$1" }
  ]
}
```

**缺陷**：使用已过时的 `routes`（应 `rewrites`）；根路径 `/` 映射到 `/dist/` 目录语义可疑；无 `headers`（安全头/缓存策略）；无 SPA fallback。

### .github/workflows/deploy.yml

GitHub Actions 在 push `master` 时用 `amondnet/vercel-action@v25` 部署，secrets 走 `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `DEEPSEEK_API_KEY`。

**亮点**：有 CI 自动部署。
**缺陷**：**无任何质量门禁**——没有 lint、没有 test、没有 build 校验步骤，直接部署。

### .claude/settings.json（73 行）

**🟠 缺陷 1：路径前缀错误**。targets 写 `zhi-jian/src/**`、permissions 写 `Write(zhi-jian/src/**)`，但**项目根目录本身就是 `zhi-jian`**（现已迁至 `D:\AI\WorkBuddy\zhi-jian`），应为 `src/**`。

**🟠 缺陷 2：OnSessionStart 信息严重过期**：

```json
"prompt": "...(3) 当前状态：产品架构设计阶段，代码尚未编写；(4) 遵循小步迭代工作约定。"
```

而 `.claude/CLAUDE.md` 与 `README.md` 均证实「V1.0 核心流程已跑通，前端 8 屏 + AI 分析 API 已实现」。

---

## 七、测试覆盖现状

**自动化测试覆盖率为 0。**

- 无 test 框架（package.json 无 vitest/jest/playwright）
- 无 test script
- 无 `*.test.js` / `*.spec.js` / `tests/` / `__tests__/`
- CI 无测试步骤

唯一质量证据是 `QA-LOG.md`（60 行）的三轮**人工/AI 手工测试**记录。但其中**至少两项「已修复」与当前代码状态不符**：

| QA-LOG 声称 | 当前代码实际 |
|---|---|
| 「验证逻辑：从 char length 改为 line count（至少 3 条有意义对话）」 | 仍是 `length < 20` 字符数，`analyze.js:27` 与 `vite.config.js:52` **两处** |
| 「CSS 中 BROKEN BROKEN 残留字符→已清理」 | 仍有 `.force-refresh{}` 空规则、`.halo` 残骸 |

**结论：QA-LOG 的「已修复」清单不可信。**

---

## 八、可测的纯函数清单（QA 测试标的）

以下函数输入输出确定、无 DOM 依赖，是单元测试的最佳标的：

| 函数 | 位置 | 测试要点 |
|---|---|---|
| `validateConversation`（待新建） | `api/_core.js` | 空输入、<3 行、≥3 行 |
| `buildUserPrompt` | `api/_core.js:113` | 未标注身份时不得出现「身份为：A/B」 |
| `escapeHtml` | `main.js:836` | `< > " ' &` 转义 |
| `calcEnergyScore` | `main.js:684` | 空数组、单元素、全零 |
| `buildPartyLabelMap` | `main.js:374` | 2-5 人多参与者 |
| `partyName` | `main.js:383` | 标签映射 |
| `getSeasonIndex` | `main.js:1282` | 索引映射 |
| `getSeasonName` | `main.js:1285` | 名称映射 |

---

## 九、规范与实现的冲突总表

| 规范要求 | 出处 | 实现实况 |
|---|---|---|
| 禁止 `var` | `code-quality.md` 第五节 | **13 处现役** |
| 禁止全局变量 | `code-quality.md` 第五节 | **4 个 window 挂载** |
| 禁止内联 `onclick` | `code-quality.md` 第三节 | **6 处现役** |
| 禁止内联样式 | `code-quality.md` 第四节 | **约 30 处** |
| 禁止 `!important` | `code-quality.md` 第四节 | **8 处** |
| 禁止 ID 选择器 | `code-quality.md` 第四节 | **14 处** |
| 禁止 `#FFFFFF`/`#000000` | `code-quality.md` 第十节 + `design-system-guard.md` 第三节 | **21 处**，含 `:root` 内 `--warm-card:#fff` |
| 禁止 700+ 字重 | `design-system-guard.md` 第四节 | 无 700+，但有 3 处 600（边界，建议降为 500） |
| 期望 `src/` 拆 5 文件 | `code-quality.md` 第二节 | **仅 main.js 单文件** |
| 6 步分析流程 + Few-shot | `ai-analysis-pipeline.md` 第二节 | **单 Prompt，零 Few-shot** |
| 禁止「关系能量」 | `product-principles.md` 第八节 | `calcEnergyScore` 函数名违规 |
| 安全审查一票否决 | `CLAUDE.md` 工作约定第 4 条 | CI 无任何门禁 |

---

**报告完** · 所有数据均经实测，可逐行核对。
