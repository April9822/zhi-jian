# 知间 V2 · E2E 测试方案（QA / 严过关）· 待批注

> 状态：**方案待确认，未写任何测试代码、未改任何被测文件**
> 作者：software-qa-engineer（Edward）
> 版本：v1（2026-xx-xx）
> 输入：`index.html`、`src/main.js`、`src/core/*`、`src/modules/*`、`tests/*`、
> `docs/design/garden-v2-architecture.md`（A.3/A.6/A.6.7/B.4/B.5/C.3）、`docs/prd/garden-relationship-graph-prd.md`

---

## 0. 一句话结论（请 team-lead + 架构师先看这条）

**当前仓库的 DOM 层仍是 T02 交付态，T03/T04 尚未落地。** 因此本方案把 E2E 分两批：
**「今天就能跑、且能立刻抓到真 bug 的一批」** 与 **「等 T03/T04 落地后才能写的一批」**。
**不建议现在就照架构文档里 §A.6 的 DOM 契约写测试** —— 那些 `#eco-stream` / `.stream-animals` /
`.stream-animals` 锚点在 `index.html` 里根本不存在，写了就是 100% 假红，会污染信噪比。

### 0.1 硬证据（本轮实测，非推测）

| 事实 | 命令/来源 | 结果 |
|---|---|---|
| 现有单测基线 | `vitest run`（JSON reporter） | **104 passed / 0 failed / 31 suites**（lead 说的 91+ 偏保守） |
| lint 三件套 | `check-html / check-css / check-nodes` | 全绿；check-nodes 输出「**animal-zone 迁移窗口未关闭**」 |
| `index.html` 是否含 `eco-stream` | 字符串包含检测 | **False** |
| `index.html` 是否含 `eco-nursery` / `eco-camp` | 字符串包含检测 | **False / False** |
| `index.html` 是否含 `animal-zone` | 字符串包含检测 | **True**（仍是 `<div class="animal-zone" id="animal-zone">`） |
| `src/core/nodes.js` 的 `friend.elId` | 源码 L15 | `'eco-stream'` ← **已指向尚不存在的 DOM** |
| `src/style.css` 是否含 `.root-vein*` | grep | **0 处**（`garden.js` 渲染的 `.root-main/.root-spark/.root-vein-hit` 目前**无任何样式**） |
| `src/style.css` 是否含 `@media(max-width:320px)` | grep | **无 320px 断点**（只有 640/480） |
| 任务系统状态 | TaskList / TaskGet | **T03 (#2) = in_progress；T04 (#3) = pending**；本任务 #9 = **blocked by #8** |
| git 状态 | `git status` | `src/core`、`src/modules`、`tests`、`scripts`、`docs` **全部 untracked**，V2 完全是未提交的工作树中间态 |
| 已有视觉 QA 物证 | 目录 | `qa-screenshots/01-intro.png`、`qa-screenshots/02-garden.png`（说明项目**已有截图 QA 的先例**，可复用该模式） |

> **推论**：`nodes.js` 已按 V2 派生（5 节点 `elId` 指向 `eco-*`），但 DOM 还没跟上。
> 这意味着 **`renderRelationGraph()` 现在处于「锚点全部落到 FALLBACK_ANCHORS」的半失效态**：
> `byId('eco-stream')` 返回 `null` → 走 `FALLBACK_ANCHORS[node]` 兜底（不炸，但也不是真锚点）。
> 这类「静默降级」正是 E2E 该抓、而当前 104 条纯逻辑单测抓不到的东西。

### 0.2 我看到的疑似真 bug（来自 `qa-screenshots/02-garden.png`，需 DOM 断言确认）

> ⚠️ 这是**截图目视**，不是断言结论，仅作为「E2E 应优先覆盖哪里」的线索：

1. **动物区与花丛（partner）在桌面宽屏即已视觉拥挤/叠压**：暖褐 pill（动物区）盖在花与
   「选一位小伙伴吧」提示文字上，hint 文字与动物名出现重叠糊字。
2. **区域标签（`家人 · 古树` / `自我 · 新芽`）对比度极低**，接近不可读。
3. **根脉在截图里看不出干净的「主脉」**（可能与 `.root-vein*` 无 CSS 有关，也可能被树根 span 盖住）——需断言 `path` 的 `d` 不含 `undefined` + 计算样式 stroke 非 none。
4. **`关系养分 0` + 状态文案「先记录一段对话，让关系显现」**：与 `updateNurtureUI()` 的空态分支一致，属**预期**，不是 bug（记录以免误判）。

---

## 1. DOM 可测挂钩清单（**实际存在于当前 `index.html`/`garden.js` 的 id/class，非文档臆测**）

### 1.1 导航 / 路由层（✅ 现在就能测）

| 挂钩 | 类型 | 位置 | 说明 |
|---|---|---|---|
| `body[data-screen]` | 属性 | `index.html:9`（初始 `intro-screen`） | `goTo()` 写 `document.body.dataset.screen` |
| `.screen` | class | 8 个 `<main class="screen">` | 切换靠 `.active` 类 |
| `#intro-screen / #space-screen / #account-screen / #login-screen / #garden-screen / #input-screen / #loading-screen / #report-screen` | id | `router.js SCREEN_IDS` | **合法 screen 全集 = 8** |
| `.nav-item` | class | `garden-bottomnav` 下 4 个 `<button>` | 花园/倾诉/记录/我的 |
| `[data-nav]` | 属性 | `garden / talk / record / me` | 当前 `garden.js` 只绑了 `#nav-talk`；`record`/`me` 走 `[data-toast]` 委托 |
| `#nav-talk / #nav-record / #nav-me` | id | 3 个 | `#nav-record`/`#nav-me` 带 `data-toast` |
| `[data-goto]` | 属性 | 如 `账号页/登录页/输入页` 的按钮 | 全局委托（`router.js initRouter`） |
| `[data-toast]` | 属性 | `#nav-record`、`#nav-me` 等 | 全局委托 → `showToast` |
| `#toast` | id | `index.html:403` | toast 容器，class `hidden`/`show` |
| `.nav-item.active` | class | 底部导航高亮 | **注意**：`goTo()` 目前**不更新** `.nav-item.active`（只切 `.screen.active`）——**待确认是否为缺陷** |

### 1.2 花园场景层（✅ 部分可测 / ⚠️ 部分为 T03 待建）

| 挂钩 | 状态 | 说明 |
|---|---|---|
| `#garden-scene` / `.garden-scene` | ✅ 存在 | 根脉父容器、`getBoundingClientRect` 基准、事件委托目标 |
| `#nurture-total` | ✅ 存在 | `updateNurtureUI()` 写 `textContent` |
| `#nurture-status` | ✅ 存在 | 状态文案 |
| `#nurture-practice-btn` | ✅ 存在 | 点击 → toast「模拟对话 · 即将上线」 |
| `#garden-top-analyze` | ✅ 存在 | 点击 → `goTo('input-screen')` |
| `#eco-tree` `[data-anchor="family"]` | ✅ 存在 | 家人 |
| `#eco-seedling` `[data-anchor="self"]` | ✅ 存在 | 自我 |
| `#eco-flower` `[data-anchor="partner"]` | ✅ 存在 | 爱人（**注意 display 名是「爱人」不是「伴侣」**） |
| `#animal-zone` `[data-anchor="friend"]` `.animal-zone` | ⚠️ 存在但**待迁移** | **T03 将改名 `#eco-stream`** |
| `.animal.fox/.rabbit/.squirrel/.deer` + `[data-animal]` | ⚠️ 存在，当前是 `<div>` | **T03 将改 `<button>`**；`fox/rabbit/squirrel/deer` |
| `.animal.chosen` | ✅ CSS 存在（`style.css:644`） | 选中态（V1 两段式；V2 要升三段式 + `aria-pressed`） |
| `#animal-hint` | ✅ 存在 | 「选一位小伙伴吧」→「你的小伙伴」 |
| `.glabel` | ✅ 存在 | `家人·古树` / `自我·新芽` / `伴侣·花`（**注意 HTML 里 flower 写的是「伴侣·花」，与 nodes.js 的「爱人」不一致 → 疑似术语不一致 bug，见 §5**） |
| `#eco-nursery`（child） | ❌ **不存在** | T03 待建（`nodes.js` 已引用） |
| `#eco-camp`（colleague） | ❌ **不存在** | T03 待建 |
| `#eco-stream`（friend，迁移后） | ❌ **不存在** | T03 待建 |
| `.stream-animals` / `.stream-bed` / `.stream-stone` | ❌ **不存在** | T03/T04 待建 |
| `.relation-graph`（SVG） | ✅ **由 JS 动态创建**（`ensureGraphSvg`） | 不在静态 HTML 里，需运行后查询 |
| `.root-vein` / `.root-vein-hit` / `.root-main` / `.root-spark` / `.root-branch` | ✅ **由 JS 动态创建** | `data-node` 属性在 `.root-vein` 与 `.root-vein-hit` 上 |
| `.root-vein--thin|--mid|--thick|--full` | ✅ JS 会 add（**但 CSS 无对应规则**） | 档位 class |
| `.form--absent|--thin|--mid|--thick|--full` | ✅ CSS + JS 均有 | 形态三态（`updateRoleForms`） |
| `.garden-leaf` / `.nameless-bloom` | ✅ JS 动态创建（`renderNoneFallback`），CSS 有 | none 兜底，≤5 个 |
| `#gardenCanvas` | ✅ 存在 | 光斑 canvas（`initGardenCanvas`，`data-init` 幂等标记） |

### 1.3 输入 / 报告 / 分享层（✅ 可测，端到端主链路）

| 挂钩 | 说明 |
|---|---|
| `#text-input` | textarea；`input` 事件写 `state.conversation` 并刷 `#analyze-btn` |
| `#analyze-btn` / `#input-hint` | 按钮 disabled 态 + 提示文案（≥5 条可分析） |
| `.tab` + `[data-tab]` | `paste/image/audio`；`#tab-paste/#tab-image/#tab-audio` |
| `#image-input` / `#upload-btn` / `#drop-zone` | 上传（V1 只提示切回粘贴） |
| `#loading-screen` + `#lm1..#lm4` + `.warm` | 加载动画 |
| `#role-picker`（动态创建）+ `.picker-btn[data-party]` + `#picker-both-btn` | 角色选择浮层 |
| `#core-insight / #dual-columns / #replay-container / #what-if-container / #emotion-container / #icebreaker-container / #total-container` | 报告各区容器 |
| `#switch-view-btn` / `#new-analysis-btn` / `#share-btn` / `#register-teaser-link` | 报告交互 |
| `?share=` URL 参数 | `handleSharedLink()` → 分享接收视图 |

### 1.4 localStorage 键（E2E 可断言落盘）

`zhijian-relations`（账本，仅 `applyAnalysisToGarden` 可写）、`zhijian-nurture`（总量）、
`zhijian-friend-animal`（动物选择，**键值不变**）、`zhijian-garden-first-growth`（T04 新增，首次生长幂等）。

---

## 2. 技术选型：三候选取舍与推荐

### 2.1 候选对比

| 维度 | (a) jsdom | (b) 纯 Node + 真实浏览器 + 自研断言脚本 | (c) 轻量自研 DOM 桩 |
|---|---|---|---|
| 能测 DOM 渲染（SVG path 进了没） | ✅ | ✅ | ⚠️ 只能测「桩认为进了」 |
| 能测真实布局（`getBoundingClientRect`/`offsetParent`/`scrollWidth`） | ❌ **jsdom 不做 layout**，rect 全返回 0 | ✅ **唯一能测 §A.6.7 的 320px 验收** | ❌ 桩给不出真值 |
| 能测真实点击/键盘 | ✅（合成事件） | ✅（真实事件） | ⚠️ 桩模拟 |
| 能否测 CSS 生效（`.root-vein--mid` 实际 stroke 宽度） | ❌ 不算样式层叠 | ✅ 可读 `getComputedStyle` | ❌ |
| 与「零运行时依赖」宪法冲突 | devDep 才需要，**不动 `dependencies`** | **零新增依赖**（复用现有 `scripts/check-*.mjs` 模式） | **零新增依赖** |
| 实现成本 / 维护成本 | 低 / 低 | 中（要起 server + 浏览器驱动）/ 中 | **高 / 高（桩本身是 bug 源）** |
| 结果可信度 | 中高（DOM 结构真） | **最高**（真环境真布局） | 低（**假绿风险**） |
| 与项目既有模式一致性 | 低（项目刻意避开 jsdom，见 `vitest.config.js` 注释） | **高**（项目已有 3 个零依赖校验脚本 + `qa-screenshots/` 截图先例） | 中（`tests/setup.js` 已有 localStorage 桩先例，但那是**逻辑桩**非 DOM 桩） |

### 2.2 我的推荐：**分层混用 —— 主体走 (b)，纯逻辑与结构断言走现有 vitest（不改环境），暂不引入 jsdom**

**推荐理由（关键权衡）：**

1. **§A.6.7 的 320px 验收项（`scrollWidth ≤ 320`、矩形不相交、`offsetParent !== null`）本质上需要真实布局引擎。**
   jsdom **明确不实现 layout**（`getBoundingClientRect()` 恒返回 `{0,0,0,0}`），且 `offsetParent` 恒 `null`。
   用它写这些断言**只会得到假绿或假红**——恰好是最危险的。这直接排除了 (a) 作为 320px 验收的手段。
2. **(c) 自研 DOM 桩是反模式**：本项目 `tests/setup.js` 的注释已经写明「刻意不用 jsdom，被测单元只依赖 localStorage + crypto.subtle」——
   即**只在逻辑层打桩，不在渲染层打桩**。给 `getBoundingClientRect` 造一个返回假值的桩，
   等于「我们自己实现一个浏览器布局」，桩的 bug 会伪装成产品 bug 或掩盖产品 bug，**违者本项目「防假绿」的整个 QA 哲学**。
3. **(b) 与项目基因最贴合**：`scripts/check-html.mjs` / `check-css.mjs` / `check-nodes.mjs` 已经是
   「Node 内置模块 + 退出码驱动 CI」的模式，`qa-screenshots/` 说明**截图 QA 已有先例**。
   在 (b) 上扩展 `scripts/check-e2e.mjs` 是**复用既有范式**，而非引入新范式。
4. **jsdom 不是「破线」，但也不是「首选」**：见 §2.3 的独立裁定——它**技术上不违反宪法**，
   但**在能力上不满足本项目最关键的验收项（布局）**，且**与既有测试哲学相左**，所以**不推荐**。

### 2.3 关于「jsdom 到底算不算破线」的裁定与依据

**我的裁定：jsdom 加进 `devDependencies` 在规则文本上「不算破线」，但在本项目「精神上不划算」，故不推荐引入。**

依据（逐条溯源，非臆断）：

| 依据来源 | 原文要点 | 对 jsdom 的推导 |
|---|---|---|
| `package.json` | `"dependencies": {}`，devDeps 有 eslint/prettier/vite/vitest | **宪法约束的是 `dependencies`（运行时依赖）**。`vitest` 本身就在 devDeps，是测试工具。jsdom 同性质，**规则文本上不违反**。 |
| 架构文档 `C.3 #8` | 「**零运行时依赖** — `package.json` `dependencies:{}` — 铁律」 | 明确定语是「**运行时**」，是「`dependencies:{}`」。**未约束 devDeps**。 |
| `vitest.config.js` 注释 | 「刻意不引入 jsdom / happy-dom（保持零运行时依赖哲学）…被测单元只需 localStorage/crypto.subtle」 | 说明**现状**是刻意避开；但它给出的**理由是「被测单元不需要」**——而不是「禁止」。这是**能力判断**，不是**宪法禁令**。 |
| `.claude/rules/code-quality.md` | 禁止前端框架/CSS框架/JS绘图库/追踪脚本 | 全部是**运行时/产物**层面的禁令；测试工具不在射程内。 |
| 架构文档 `A.6.5.1` / `B.4` | 已有「迁移感知守卫」「测试文件豁免节点字面量禁令」等**务实的例外设计** | 项目文化是**基于理由的例外**，而非教条。若 jsdom 真能解决问题，本可论证引入——**问题是它解决不了布局**。 |

**结论表述**：**技术上不破线（约束的是 `dependencies`），但能力上不达标（无 layout），精神上非首选（与 `setup.js` 的轻量桩哲学相左）。因此本方案不引入 jsdom。**

---

## 3. 分层建议：什么进 vitest / 什么进「起 dev server + 真断言」脚本 / 什么只能人工

| 层 | 载体 | 特征 | 覆盖内容 |
|---|---|---|---|
| **L1 纯逻辑** | **vitest（现状不变，`environment:'node'`）** | 快（<1s）、零 DOM、确定性 | `nurtureTier`/`bandPath`/`rootVeinPaths`/`getSeasonIndex`/`STATUS_TEXT` 宪法词、`relations.js` 五步判定/6 节点可达/截胡 H1-H4、`state.js` 前向兼容/守卫/dedupe、`nodes.js` 派生一致性冻结性、`check-nodes` 判定函数 |
| **L2 结构/静态扫描** | **vitest（读文件断言，不执行浏览器）** | 快、零浏览器 | `index.html` 的 DOM 契约存在性（`#garden-scene` 等 id/class 齐备）、`[data-animal]` 四值齐备、**宪法正则扫描**（无 emoji / 无禁用术语 / 无 `%` 分数 / 无 `transform:scale()` 整株）、源码 review 断言（WRITE 阶段零 `getBoundingClientRect`） |
| **L3 真环境行为** | **`scripts/check-e2e.mjs`（Node + 真实浏览器，起 vite dev server）** | 慢（数秒~数十秒）、真布局 | SVG 根脉真的进了 DOM 且 `d` 无 `undefined`、`.root-vein--<tier>` class 真生效 + `getComputedStyle` 的 stroke-width/opacity、动物点击→选中态+落盘、键盘 Enter 触发、导航 `body[data-screen]` 切换、**320px `scrollWidth ≤ 320` + 矩形不相交 + 4 动物 `offsetParent!==null`**、端到端主链路（粘贴→分析→落盘→花园生长） |
| **L4 只能人工** | **`qa-screenshots/` 截图 + 人眼** | — | **美学/调性判断**（暖金是否「荧光」、区域标签对比度是否够、动画是否「有呼吸感」）、**中文字体渲染/断行**、**首次生长动效的观感**、**分享链接在真机微信里打开的体验** |

> **原则**：**能在 L1/L2 用纯文本断言的，绝不升级到 L3**（保持 CI 快、稳定）。
> **L3 只放「非真实布局不可」的断言**。**L4 只放「机器判不了的美学」**。

---

## 4. 优先级：6 类缺口，先补哪几个

> 排序逻辑：**（抓到真 bug 的概率 × 不依赖 T03/T04 的可执行性）÷ 成本**。

| 优先级 | 缺口 | 归属层 | **现在能写吗** | 理由 |
|:--:|---|---|:--:|---|
| **P0-1** | **⑥ 宪法扫描**（emoji/禁用术语/分数/人格诊断） | L2（vitest 静态扫描） | ✅ **现在就能写** | **零依赖、纯文本、抓真 bug 概率高**（截图已见「伴侣 vs 爱人」术语不一致；`report.js` 有「关系养分」「心声明读」；`input.js` 有 `'📸'` emoji 在 toast 文案里 → **疑似违规**）。对应 T05 的 `check-constitution.mjs`，可**提前**在 vitest 里落一份「文案快照扫描」。 |
| **P0-2** | **③ 导航真的能切吗** | L3 + L2 | ✅（L2 静态契约）/**⚠️ L3 需起 server** | 主链路骨架，且**可能的真 bug**：`goTo()` 不更新 `.nav-item.active`（底部高亮不跟随）——需 L3 断言确认。**不依赖 T03/T04**。 |
| **P0-3** | **① DOM 渲染真的画出来了吗（含 `M undefined undefined` 防线）** | L2（`d` 不含 undefined）+ L3（真存在） | **⚠️ 部分现在、部分等 T03** | 「`M undefined undefined`」正是架构 D.1 风险 #3 的头号地雷，**必须在 T03 落地时立刻有断言兜住**。当前可先写**兜底锚点单测**（已有）+ 断言 `renderRelationGraph` 不产出含 `undefined` 的 `d`（L2 静态可扫 `bandPath` 输出）。 |
| **P0-4** | **⑤ 端到端主链路** | L3 | **⚠️ 依赖 API**（`/api/analyze` 需 DeepSeek key） | 价值最高但**最贵**：需要 stub 掉 `/api/analyze`（可用 vite 的 dev 中间件或 `page.route` 拦截）。建议**用固定 fixture JSON mock API**，跑「粘贴→analysis-ready→落盘→花园生长」。**可在 T03 后做**。 |
| **P1-5** | **② 交互真的通吗（动物选中/键盘/落盘）** | L3 | **❌ 等 T03**（要 `<button>` + `aria-pressed` + 事件委托） | 契约在 §A.6 已定得极细（`aria-pressed`、委托在 `#garden-scene`），**照契约写即可**，是 T03 的验收白盒。**T03 落地当天就该有**。 |
| **P1-6** | **④ 布局真的没炸吗（320px）** | L3 | **❌ 等 T04**（要 `.stream-*` + 320px 断点） | §A.6.7 的 4 条验证项是 T04 的硬验收。**非真实布局不可**，正是选 (b) 的核心战场。 |

**建议执行顺序**：**P0-1（宪法扫描）→ P0-2（导航）→ 等 T03 → P1-5（动物交互）→ P0-3（根脉 DOM）→ 等 T04 → P1-6（320px）→ P0-4（端到端）**。

---

## 5. 本轮已发现的「疑似真 bug / 需确认项」（交给 team-lead 与工程师确认，**不是测试代码问题**）

> 这些是**读代码 + 看截图**得到的线索，**待 E2E/单测断言证实**后应路由给工程师。

| # | 严重度 | 现象 | 证据 | 归属 |
|:--:|---|---|---|---|
| B1 | 🟠 高 | **`nodes.js` 的 `elId` 与 DOM 失配**：`friend→eco-stream`、`child→eco-nursery`、`colleague→eco-camp` 在 `index.html` **均不存在** → `renderRelationGraph` 全走 `FALLBACK_ANCHORS` 兜底（静默降级，根脉终点非真实锚点） | 字符串检测 False；`nodes.js:13-17` | **T03 未完成**（预期内，但要确认是「故意中间态」还是「遗漏」） |
| B2 | 🟠 高 | **`.root-vein*` 无 CSS**：`garden.js` 渲染的根脉 path 无任何 stroke 样式 → 理论上**不可见**（截图也确实看不出清晰根脉） | grep `.root-vein` in `style.css` = 0 | T03（`.band-*`→`.root-vein*` 迁移未做） |
| B3 | 🟡 中 | **术语不一致**：`index.html:292` 花丛标签写「**伴侣** · 花」，但 `nodes.js` 与架构 `C.4` 明确「**爱人**（注意「爱人」非「伴侣」）」 | `index.html:292` vs `nodes.js:14` / 架构 L685 | 疑似真 bug → 工程师 |
| B4 | 🟡 中 | **疑似 emoji 违规**：`input.js:46` toast 文案含 `'📸'`（宪法「禁用 emoji」） | `src/modules/input.js:46` | 疑似真 bug → 工程师 |
| B5 | 🟡 中 | **`goTo()` 不更新 `.nav-item.active`**：切页后底部导航高亮不跟随（`router.js` 只切 `.screen.active`） | `router.js:22-28` | 需 L3 断言确认 → 可能真 bug |
| B6 | 🟢 低 | **`#animal-zone` 迁移窗口未关闭**：check-nodes 仍输出「迁移窗口未关闭」= `animalZoneMigrated === false` | check-nodes 输出 | T03 收尾仪式（架构 L889 要求 T03 重跑确认） |

---

## 6. 明确「**不该自动化**」的部分及理由

| 不自动化项 | 理由 |
|---|---|
| **视觉调性 / 美学**（暖金是否「荧光」、留白是否「空境」、动画是否「有呼吸」） | 主观判断，机器无 ground truth；且 `getComputedStyle` 只能验数值不能验「好看」。**归 `qa-screenshots/` + 人眼**（项目已有此模式）。 |
| **中文字体渲染、断行、真机软键盘顶起布局** | 依赖字体文件/OS/IME，沙箱与真机不一致；自动化收益低、假红高。**人工真机确认**。 |
| **Canvas 光斑动画的视觉正确性**（`initGardenCanvas` 的 25 个 dapple） | 逐帧比对成本极高且脆弱；**只自动断言「canvas 存在 + `data-init==='1'`（幂等）+ 尺寸已设置」**，视觉交人工。 |
| **DeepSeek 真实分析质量**（洞察是否到位、文案是否共情） | LLM 输出非确定性，且**质量是产品/伦理判断**；自动化只做「**schema 完整性 + 宪法词扫描**」，**不判内容好坏**。 |
| **`prefers-reduced-motion` 的观感** | 可断言「CSS 里存在该媒体查询」，但「动画真的降级到舒适」需人眼。 |
| **首次生长动效「惊喜感」** | 一次性的情绪体验，截图/时长断言抓不到；人工看一次即可。 |
| **`report` 页滚动顺序/信息层级的「阅读节奏」** | 与 PRD 体验目标强相关，属体感；人工 + 评审。 |

---

## 7. 待 team-lead / 架构师确认的问题（阻塞我落地）

1. **T03/T04 的完成时间**：E2E 的 P1-5/P1-6 必须等 DOM 落地。请确认是**等 T03/T04 完成后再让我写全套**，还是**先让我落地 P0-1/P0-2（今天可跑）+ 给出 P1-5/P1-6 的「待激活测试骨架」**？
2. **技术选型拍板 + 驱动方案**：是否接受 **不引入 jsdom、走 `scripts/check-e2e.mjs`（真实浏览器）**？
   落地前需确认**浏览器驱动怎么来**（三选一）：
   - **(2a) 用系统已装 Chrome + CDP**：实测本机**存在** `C:\Users\April\AppData\Local\Google\Chrome\Application\chrome.exe`。
     可用极小自研 CDP 客户端（`--headless --remote-debugging-port` + 原生 `WebSocket`）**零 npm 新依赖**驱动。**推荐**。
   - **(2b) `devDependencies` 加 `puppeteer-core`**（或 playwright）：能力最强、代码最少，但**新增 devDep**（需按 §2.3 口径拍板）。
   - **(2c) 降级：只起 dev server + `fetch` HTML 做静态断言**：零浏览器、零新依赖，**但测不了布局（320px 全套废掉）**——不推荐，仅作兜底。
   > ⚠️ **更正**：我最初在 `node_modules` 里看到 `@puppeteer/.browsers-*` / `.puppeteer-core-*` 这类目录名，
   > **实测确认它们不是可用包**（`require.resolve` 级检测：`puppeteer`/`puppeteer-core`/`@puppeteer/browsers`/`playwright`/`jsdom` **全部 = False**）。
   > 因此**不能假设环境已有 puppeteer**，驱动方案需明确拍板。
3. **B1–B6 的定性**：哪些是「预期中间态」，哪些要开 bug 单路由给工程师？（尤其 **B3 术语「伴侣 vs 爱人」** 和 **B4 emoji** —— 这两个**现在就能修**，且属宪法级。）
4. **`.nav-item.active` 是否应该跟随**（B5）：是产品缺陷还是有意为之（记录/我的为占位页）？

---

## 8. 附：本方案「不做」的承诺

- **不写任何测试代码**（等确认）。
- **不改任何被测文件**（`src/**`、`index.html`、`scripts/**`）。
- **不为了绿而改生产代码**（架构 `B.4` 明令：禁止为了让旧断言通过而在生产代码回退为 3 键）。
- 仅新增本方案文档 `docs/design/qa-e2e-plan.md`（可批注、可删）。

---

> **请批注**：直接在本文档对应小节旁写「同意 / 改为 X / 补充 Y」即可。
> 确认后我按 §4 的顺序逐个落地，每轮跑完给「Test Report + 路由决策」。
