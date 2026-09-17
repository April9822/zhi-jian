# 关系花园 V2 改造基线勘察报告

> 勘察人：高见远（架构师）
> 勘察时间：V2 立项期
> 勘察方式：逐文件精读 + 全局模式扫描（**只读，未修改任何源码或已有文档**）
> 项目根目录：`D:\AI\WorkBuddy\zhi-jian`
> 用途：本报告是 **V2 架构设计的输入基线**，标注「可复用 / 必须重写 / 地雷」三类判定，供架构设计直接引用。

> ⚠️ **重要更正**：仓库内已存在的 `docs/design/code-baseline-for-architect.md` 描述的是**远古单文件时代**（`main.js` 1743 行、测试覆盖率为 0）。该项目**已经完成 V1 分层重构**（`src/core` + `src/modules`，74 测试全绿），那份报告已失效，请勿再引用。本报告反映**当前真实代码状态**。

---

## §1 现状 DOM 与 CSS 全貌

### 1.1 花园页 DOM 结构（`index.html` 229–331 行）

顶层三段式：`header.garden-topbar`(56px) → `div.garden-scroll`(flex:1) → `nav.garden-bottomnav`(64px)。

| 层级 | 行号 | 元素 | id / class | 定位方式 |
|:---:|:---:|---|---|---|
| 容器 | 230 | `<main>` | `#garden-screen.screen.garden-screen` | `height:100dvh` + `.active{display:flex;flex-direction:column}` |
| 顶栏 | 232–235 | `<header>` | `.garden-topbar` | `flex:0 0 auto; height:56px; z-index:40` |
| ↳ logo | 233 | `<span>` | `.garden-logo` | 文本「知间」，`font-weight:600` |
| ↳ 按钮 | 234 | `<button>` | `#garden-top-analyze` | 点击 → `goTo('input-screen')` |
| 滚动区 | 238 | `<div>` | `.garden-scroll` | `flex:1; overflow-y:auto; padding:16px 16px 20px; gap:16px` |
| 养分卡 | 240–248 | `<section>` | `.nurture-card` | `flex:0 0 auto`，玻璃拟态，`border-radius:18px` |
| ↳ 图标 | 242 | `<span>` | `.nurture-icon` | **空 span**（emoji 清除后遗留空位，靠 CSS 兜，当前无内容） |
| ↳ 总量 | 244 | `<span>` | `#nurture-total` | 文本「0」，JS 写入，`font-size:32px` |
| ↳ 状态 | 246 | `<p>` | `#nurture-status` | 文案随「档位×季节」变化 |
| ↳ CTA | 247 | `<button>` | `#nurture-practice-btn` | 当前只弹 toast 占位 |
| **场景** | 251 | `<div>` | `#garden-scene.garden-scene` | `position:relative; flex:1 0 auto; min-height:440px; overflow:hidden` |
| ↳ canvas | 252 | `<canvas>` | `#gardenCanvas.garden-canvas` | `position:absolute; inset:0 0; z-index:2; pointer-events:none`（光斑层） |
| ↳ 背景层 | 255–262 | `<div>` | `.garden-bg` | `position:absolute; top:0;left:0; width:100%; height:58%; z-index:0` |
| ↳↳ 太阳 | 256 | `<div>` | `.garden-sun` | `absolute; top:6%; right:26%; 60×60px` |
| ↳↳ 远山 | 257–258 | `<div>` | `.ink-mountain.mtn-far` / `.mtn-near` | `absolute; bottom:0`，`mtn-far{left:5%;w55%;h45%}`、`mtn-near{right:0;w65%;h35%}` |
| ↳↳ 树影 | 259–261 | `<div>` | `.distant-woods > span.dw.d1~d4` | `absolute; bottom:15%; width:100%; flex` |
| **中景层** | 265 | `<div>` | `.garden-midlayer` | `absolute; bottom:30%; left:0; width:100%; height:46%; z-index:3` |
| ↳ 大树 | 266 | `<div>` | `#eco-tree.eco-tree[data-anchor=family]` | `absolute; bottom:0; left:6%`（窄屏 2%） |
| ↳↳ 根系 | 267 | `<div>` | `.tree-roots > span.root ×3` | flex 横排 |
| ↳↳ 树干 | 268 | `<div>` | `.tree-trunk > span.trunk-ring` | `18×85px`（窄屏 65px） |
| ↳↳ 树冠 | 269–271 | `<div>` | `.tree-crowns > span.tc.tc1~tc3` | `absolute; top:-58px; left:50%; translateX(-50%); 100×90px`（**越界风险点**） |
| ↳↳ 标签 | 272 | `<span>` | `.glabel` | 「家人 · 古树」 |
| **近景层** | 277 | `<div>` | `.garden-fore` | `absolute; bottom:12%; left:0; width:100%; height:40%; z-index:4` |
| ↳ 幼苗 | 279 | `<div>` | `#eco-seedling.eco-seedling[data-anchor=self]` | `absolute; bottom:6%; left:8%`（窄屏 6%/8%） |
| ↳ 花丛 | 286 | `<div>` | `#eco-flower.eco-flower[data-anchor=partner]` | `absolute; bottom:14%; left:46%`（窄屏 44%/16%） |
| ↳↳ 花头 | 288–291 | `<div>` | `.flower-head > span.fh-petal ×5 + span.fh-core` | 花头 `absolute; top:-30px; 48×48px`；花瓣 5 片各旋转 72° |
| ↳ 动物区 | 296 | `<div>` | `#animal-zone.animal-zone[data-anchor=friend]` | `absolute; bottom:5%; left:50%; translateX(-50%); flex; gap:14px` |
| ↳↳ 提示 | 297 | `<p>` | `#animal-hint` | `absolute; top:-28px`，浮动动画 |
| ↳↳ 动物 | 298–313 | `<div>` | `.animal.fox/.rabbit/.squirrel/.deer` | 每只含 `.animal-sprite` + `.animal-name` |
| 地面 | 318 | `<div>` | `.garden-floor` | `absolute; bottom:0; width:100%; height:12%; z-index:5` |
| 底栏 | 323–328 | `<nav>` | `.garden-bottomnav` | `flex:0 0 auto; height:64px; z-index:40` |
| ↳ 导航项 | 324–327 | `<button>` | `.nav-item[data-nav=garden/talk/record/me]` | 每项含 `.nav-icon.nav-icon-xxx` + 文本；`flex:1 1 0` |

**关键坐标汇总（百分比，相对 `#garden-scene`；V2 若要重排必须以此为准，或改为 `ROLE_NODES` 驱动）**：

| 节点 | 容器 | left / bottom | 尺寸 |
|---|---|---|---|
| `self`（幼苗） | `.garden-fore` | left:8%, bottom:6% | ~26×42px |
| `family`（大树） | `.garden-midlayer` | left:6%, bottom:0 | 冠 100×90px，全高≈175px |
| `partner`（花） | `.garden-fore` | left:46%, bottom:14% | 全高≈95px |
| `friend`（动物区） | `.garden-fore` | left:50%(居中), bottom:5% | ~206×~60px |

> ⚠️ 当前 `#animal-zone`（居中，横跨约 35%–65%）与 `#eco-flower`（left:46%）**存在水平重叠风险**——`anchorOf()` 取的是元素中心，二者中心可能过近，导致连接带视觉交叉。V2 五区域布局必须重新分配锚点。

### 1.2 花园页 CSS 规则清单（`src/style.css` 513–693 行）

**A. 容器定位**
| 行号 | 选择器 | 要点 |
|:---:|---|---|
| 526–527 | `.garden-screen` / `.active` | `100dvh` + flex 三段；**注意 `.active` 依赖 `.screen.active` 基类**（在文件前段定义） |
| 530 | `.garden-topbar` | 玻璃拟态 + `z-index:40` |
| 536 | `.garden-scroll` | 唯一可滚动区 |
| 539–546 | `.nurture-card` 系列 | 玻璃卡 |
| 549–550 | `.garden-scene` / `canvas.garden-canvas` | 场景容器 + canvas 层（`z-index:2`） |
| **553–571** | **`.relation-graph` / `.band*`** | **V1 星图规则（详见 C）** |
| 588–597 | `.garden-bottomnav` / `.nav-item` 系列 | 底栏 + 导航图标 CSS 几何（详见 D） |

**B. 角色元素样式（CSS 精灵）**
| 行号 | 选择器 | 要点 |
|:---:|---|---|
| 600–608 | `.garden-bg` 系列 | 天空/太阳/远山/树影 |
| 611–624 | `.garden-midlayer` / `.eco-tree` / `tree-roots/trunk/crowns` / `tc1~3` | 大树，含 3 组 keyframes `tcBreathe1/2/3` |
| 627–636 | `.garden-fore` / `.eco-flower` / `flower-*` / `fh-*` | 花丛，keyframe `flowerNod` |
| 638–645 | `.animal-zone` / `.animal-hint` / `.animal` 系列 | 动物选择区 |
| 648–665 | `.animal-sprite` + 4 种 `*-sprite` | **纯 CSS 精灵**（伪元素画耳朵/尾巴/鹿角） |
| 667–673 | `.eco-seedling` / `.seedling-mound` / `.sprout` | 幼苗，keyframe `sproutWiggle` |
| 676 | `.garden-floor` | 地面 |
| 679 | `.glabel` | 统一标签 |

**C. V1 新增「星图」规则（⚠️ V2 重写核心区，553–571 行）**
```css
.relation-graph{position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none}
.band-line{stroke:#D5A85A;stroke-width:1.5px;fill:none;opacity:.28;transition:...}
.band-spark{stroke:#FFF6E8;stroke-width:2px;stroke-dasharray:2 98;opacity:0;...}
.band-hit{stroke:transparent;stroke-width:9px;pointer-events:stroke;cursor:pointer}
.band--thin .band-line{stroke-width:1.5px;opacity:.28}
.band--mid  .band-line{stroke-width:3px;opacity:.55;filter:drop-shadow(...)}
.band--thick .band-line{stroke-width:5px;opacity:.85}
.band--thick .band-spark,.band--full .band-spark{opacity:1;animation:bandFlow 3s linear infinite}
.band--full .band-line{stroke-width:5px;opacity:.85;filter:drop-shadow(...)}
.band--full .band-hit{animation:endpointBreath 4s ease-in-out infinite}
@keyframes bandFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}
@keyframes endpointBreath{0%,100%{stroke-width:9px}50%{stroke-width:14px}}
@media (prefers-reduced-motion: reduce){.band-line,.band-spark,.band-hit{transition:none!important;animation:none!important}}
```
> ⚠️ SVG `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` 是**坐标系统一的关键**：JS 里 `anchorOf()` 产出 0–100 百分比坐标，靠这个 viewBox 拉伸到实际尺寸。**此机制 V2 必须保留**，否则坐标全错。`vector-effect="non-scaling-stroke"` 保证拉伸后描边宽度不失真——**同样必须保留**。

**D. 导航图标 CSS 几何实现（589–595 行，非 emoji、非 SVG，纯 border-radius 技巧）**
```css
.nav-item .nav-icon{width:20px;height:20px;position:relative;display:block;border:1.5px solid currentColor;border-radius:4px}
.nav-icon-garden{border-radius:50% 50% 30% 30%;border-bottom-width:3px}   /* 房子/圆顶 */
.nav-icon-talk  {border-radius:50% 50% 50% 4px}                           /* 气泡（右下尖角） */
.nav-icon-record{border-radius:3px;border-left-width:3px}                 /* 卡片/书 */
.nav-icon-me    {border-radius:50%;width:16px;height:16px}                /* 头像圆 */
.nav-icon-me::after{...width:18px;height:8px;border:1.5px solid currentColor;border-radius:50% 50% 0 0;border-bottom:none} /* 肩膀弧 */
```
**评估**：这套「单 border + 差异化 border-radius + `currentColor`」的做法**可复用性很高**——新增导航项只需 5–7 行 CSS，天然随 `.nav-item.active{color:#B57A45}` 变色，零图片、零 SVG 依赖。五生态区域若需要新图标（如「同事 · 竹」），**建议沿用同一技法或统一改为单色内联 SVG**（PRD Q3 建议 A 已倾向此方向）。

**E. 动画 keyframes 清单**
`sunWarm`(602) `tcBreathe1/2/3`(622–624) `flowerNod`(633) `hintFloat`(641) `animalIdle`(649) `sproutWiggle`(671) `bandFlow`(567) `endpointBreath`(568) `leafFall`(583) `bloomRise`(585) `dropFall`(683) `flashGlow`(685)

**F. 响应式断点（688–693 行）**
仅一个 `@media(max-width:480px)`：缩放大树/花/动物，`#eco-tree{left:2%}`、`#eco-flower{left:44%;bottom:16%}` 等。**V1 只有这一档断点**，五区域 V2 需评估是否新增 320px / 768px 档。

**G. `!important` 残留（⚠️ 仅 1 处，都在 V1 星图区内）**
| 行号 | 规则 | 判定 |
|:---:|---|---|
| 570 | `@media(prefers-reduced-motion){.band-line,.band-spark,.band-hit{...!important}}` | **合理保留**（无障碍降级的标准写法，非腐化残留） |

> ✅ 结论：V1 重构已把历史 `!important`（旧报告记录的 8 处）清理干净，现仅剩 1 处**语义正当**的 reduced-motion 覆盖。V2 CSS **不应新增任何 `!important`**。

**H. none 兜底元素样式（582–585 行）**：`.garden-leaf` / `.nameless-bloom`，`position:absolute; z-index:5; pointer-events:none`，由 JS 动态创建（`renderNoneFallback()`）。

---

## §2 可复用 / 需重写 / 需删除清单（`src/modules/garden.js` 528 行，逐导出函数）

`garden.js` 共 **12 个导出**：常量 5 个（`SEASONS` `ROLE_NODES` `FALLBACK_ANCHORS` `STATUS_TEXT` + 隐含 `BAND_TIERS` 私有）+ 函数 11 个（含 `addNurture`/`getNurture`/`waterCreature`/`waterGarden`/`initGarden`/`initGardenCanvas`）。

| # | 函数 / 常量 | 行号 | 判定 | 理由 |
|:-:|---|:---:|:---:|---|
| 1 | `SEASONS` | 10 | **保留** | 四季常量，V2 仍用（P1-2 季节氛围） |
| 2 | `ROLE_NODES` | 16–21 | **重写** | 当前硬编码 4 节点（self+3），V2 五生态区域须扩为 5+ 并绑定新 `elId/anchorKey`。**本身是「数据驱动锚点」的正确范式，必须沿用，只是数据要换** |
| 3 | `FALLBACK_ANCHORS` | 24–29 | **重写** | 坐标按 V1 三节点布局写死（family 24,30 / partner 52,62 / friend 74,66），五区域布局后全失效；且**缺 child/colleague 兜底**，新增节点无兜底会踩空 |
| 4 | `STATUS_TEXT` | 32–57 | **保留（结构）** | 「档位×季节」二维表结构正确，V2 最多按 PM 文案微调；**结构不动** |
| 5 | `nurtureTier(total)` | 70–76 | **保留** | 纯函数，档位阈值 0/34/67/100，逐节点驱动，V2 完全复用（**唯一依据仍是各节点 total**） |
| 6 | `bandPath(a,b)` | 84–88 | **保留** | 纯函数，二次贝塞尔下垂路径。V2「根脉形态」（见 PM PRD）若改为曲线/树根，**可能需新增 `rootPath()` 兄弟函数**，但 `bandPath` 本身可留作「轻连接」备选 |
| 7 | `getSeasonIndex/Name` | 91–102 | **保留** | 纯函数，无改动理由 |
| 8 | `anchorOf(el, sceneRect)` | 110–116 | **保留** | **V2 复用基石**：DOM 中心 → 百分比坐标换算，与区域数无关，逻辑正交 |
| 9 | `isNodePresent` / `presentNodes` | 122–130 | **重写** | `presentNodes` 硬编码 `['family','partner','friend']`，**扩节点必改**（且应改为从 `ROLE_NODES` 派生，避免二次硬编码） |
| 10 | `ensureGraphSvg` | 136–149 | **保留** | SVG 根节点懒创建，`viewBox 0 0 100 100` + `preserveAspectRatio:none`，V2 沿用（根脉仍是 SVG 路径） |
| 11 | `nodeElId(node)` | 152–155 | **保留** | 已从 `ROLE_NODES` 派生，天然兼容扩节点 |
| 12 | **`renderRelationGraph()`** | 169–228 | **重写（保留防护）** | ⚠️ **函数体须重写以支持五区域 + 根脉形态**，但其中「**读/写两阶段分离（防布局抖动）**」的架构**必须原样保留**：`① READ` 一次性读完 sceneRect+全部锚点 → `② WRITE` 只操作 SVG 不再读 rect。这是比 debounce 更根本的解法，V2 若破坏此结构会引入 layout thrashing |
| 13 | **`updateRelationshipBands()`** | 234–247 | **重写** | 逐节点档位判定逻辑正确（依据 `relations[node].total`），但同样硬编码 `presentNodes`；且 class 名 `.band--xxx` 若 V2 改「根脉」，class 命名需同步 |
| 14 | `renderNoneFallback()` | 252–271 | **保留（小改）** | ≤5 个无名记录兜底视觉，逻辑与节点数无关；仅确认 `z-index` 与新布局层级不冲突 |
| 15 | `getNurture()` | 277–280 | **保留** | 读全局 `zhijian-nurture`，仅顶部卡片用（**不驱动连线**），铁律不变 |
| 16 | `addNurture(n)` | 283–287 | **保留** | 写总量 + 刷新 UI + 刷新带 |
| 17 | `updateNurtureUI()` | 290–311 | **重写** | 顶部总览文案取「所有 present 节点最高档」；`presentNodes` 硬编码 → 须改为派生 |
| 18 | `updateRoleForms()` | 316–333 | **重写** | 硬编码 `['family','partner','friend']` 循环；且 class `form--thin/mid/thick/full/absent` 需与新区域元素对齐 |
| 19 | `waterCreature(creatureId)` | 338–362 | **保留** | 通用浇灌动效，与节点数无关 |
| 20 | `waterGarden()` | 365–372 | **保留（小改）** | 取 `presents[0]` 作为浇灌目标；扩节点后逻辑仍成立，但目标选择策略可优化 |
| 21 | `initGardenCanvas()` | 377–441 | **保留** | Canvas 光斑，25 个粒子 + rAF 循环 + 页面非 active 时空转；**与布局正交**，V2 完全复用 |
| 22 | `bindGardenEvents` | 446–509 | **重写** | 事件绑定区：动物选择、生物点击、**连接带点击**（`{family,partner,friend}` 硬编码 label 映射，505 行）→ 扩节点必改 |
| 23 | `handleResize` / `resetSceneSizeCache` | 520–536 | **保留** | 「场景尺寸无变化短路」是**移动端 resize 抖动的关键防护**（地址栏收放/软键盘），V2 必须保留 |
| 24 | `initGarden()` | 539–561 | **保留（小改）** | 入口编排 + `navigate` 自订阅重绘 + resize 监听；结构正确，只需确认新节点纳入重绘 |

### 2.1 判定统计

| 判定 | 数量 | 函数/常量 |
|:---:|:---:|---|
| **保留** | 14 | `SEASONS` `STATUS_TEXT` `nurtureTier` `bandPath` `getSeasonIndex/Name` `anchorOf` `ensureGraphSvg` `nodeElId` `renderNoneFallback` `getNurture` `addNurture` `waterCreature` `initGardenCanvas` `handleResize/resetSceneSizeCache` |
| **重写** | **7** | `ROLE_NODES` `FALLBACK_ANCHORS` `isNodePresent/presentNodes` `renderRelationGraph` `updateRelationshipBands` `updateNurtureUI` `updateRoleForms` `bindGardenEvents`（连接带部分） |
| **删除** | **0** | 无函数整体删除；`bandPath` 若被根脉取代则降级为「备选/未用」，但**不建议物理删除**（保留可测性） |

> **需重写函数数量 = 7**（对应任务回报要求）。
> **共性根因**：重写项**全部**源于同一问题——**节点集合被硬编码为 `['family','partner','friend']`**。V2 应一次性引入 `PRESENT_NODES = ROLE_NODES.filter(n => n.id !== 'self')` 之类的**单一派生源**，彻底消除二次硬编码。

---

## §3 数据层改造点

### 3.1 新增 child / colleague 两节点的改动面

**核心结论：数据层改动面很小，且是「纯加法」，风险低。**

| 文件 | 位置 | 必改？ | 具体改动 |
|---|:---:|:---:|---|
| `core/relations.js` | `SCENE_KEYWORDS`(14–22) | ✅ | 新增 `child: [...]`、`colleague: [...]` 词条。⚠️ **词典纪律**：只收中性称呼词，新增须产品评审（文件头红线） |
| `core/relations.js` | `PRIORITY`(25) | ✅ | 扩为 5 元优先级链，需**明确定序**（现有：partner>family>friend；新增两类插在哪？→ 见 §6 待确认） |
| `core/relations.js` | `countSceneHits`(46–61) | ✅ | `result` 初始对象写死 3 键 → 扩 5 键；遍历用 `PRIORITY` 驱动，自动跟随 |
| `core/relations.js` | `pickMainAxis`(68–80) | ✅ | 遍历 `PRIORITY`，自动跟随（**无硬编码，改 PRIORITY 即可**） |
| `core/relations.js` | `resolveRelationTarget`(108–166) | ✅ | **5 处硬编码枚举** `['family','partner','friend']`（110、118、124 行等）→ 必须改为从 `PRIORITY`/`SCENE_KEYWORDS` 派生。**这是最容易漏改的地方** |
| `core/state.js` | `emptyStore`(52–59) | ✅ | 加 `child:{total:0,events:[]}`、`colleague:{...}` 两桶 |
| `core/state.js` | `normalizeStore`(63–75) | ✅ | 遍历数组 `['family','partner','friend','none']`(67) → 扩 2 键。**这一步同时承担旧数据兼容（见 3.2）** |
| `core/state.js` | `sceneHint`(138–140) | ✅ | 映射表加 `child:'孩子'`、`colleague:'同事'` |
| `core/state.js` | JSDoc typedef(33–49) | ✅ | 文档同步（非功能，但 lint 干净度） |
| `core/state.js` | `applyAnalysisToGarden`(153–221) | ❌ | **零改动**——它只做 `bucket = store[node]`，`node` 由 `resolveRelationTarget` 产出，**节点无关**。✅ 这是分层设计的胜利 |
| `api/_core.js` | `SYSTEM_PROMPT` | ⚠️ 判断 | 见 3.3 |
| `modules/garden.js` | `ROLE_NODES` / `FALLBACK_ANCHORS` / `presentNodes` | ✅ | 见 §2（这是「视图层」而非数据层） |

### 3.2 localStorage 旧数据前向兼容与迁移（⚠️ 高风险点）

**现状**：老用户 localStorage 里是 `{family,partner,friend,none}`，**没有** `child`/`colleague` 键。

**危险点**：若 V2 的 `emptyStore()` 直接加了两个新桶，而 `normalizeStore()` **沿用当前「以 `base = emptyStore()` 为底、逐键填充」的写法**（63–75 行）：

```js
function normalizeStore(raw) {
  const base = emptyStore();              // ← base 已含 child/colleague（V2 后）
  if (!raw || ...) return base;
  for (const node of ['family','partner','friend','none','child','colleague']) {  // ← V2 扩这行
    const entry = raw[node];
    if (entry && ...) { base[node].total = ...; base[node].events = ...; }
    //          ↑ 老数据里 raw['child'] === undefined → 条件不成立 → 保留 base.child（0/[]）
  }
  return base;
}
```

✅ **好消息：这套 `base` 兜底机制天然实现前向兼容**——老数据读进来，`child`/`colleague` 自动补 0，**不丢任何老数据**（family/partner/friend/none 原样保留），**无需显式迁移脚本、无需版本号字段**。

**但必须满足 3 个前提（否则会丢数据）**：
1. **`normalizeStore` 的节点遍历数组必须与 `emptyStore` 的键集合严格一致**。若只改了 `emptyStore` 忘了改遍历数组(67)，则新桶永远是 0（不丢旧数据但新节点异常）。
2. **`readRelations` 的 try/catch 兜底不许动**(82–89)。JSON.parse 失败仍回落空账本——这是老数据损坏时的最后防线。
3. **不引入 `version` 字段做「不兼容就丢弃」的迁移**。当前设计是「缺什么补什么」的**增量补全**，比版本迁移更安全。**建议 V2 保持此范式，明确禁止写任何 `if (version < 2) { 重建 }` 逻辑**。

**结论**：**前向兼容方案 = 只扩两个数组（`emptyStore` 键 + `normalizeStore` 遍历），零迁移脚本，零数据丢失风险**。这是当前代码结构送来的红利，V2 不要画蛇添足。

### 3.3 `api/_core.js` 的 `analysis` 输出结构与 prompt 判断

**当前 `analysis` 对象字段**（`SYSTEM_PROMPT` 40–92 行定义）：
```
parties[]: {id, label, quote}          ← ⚠️ 无 relation/scene 枚举字段！
coreInsight: {title, summary, conflictType, realTopic, perParty[]}
responsibilityRatio / dualAnalysis / replay / whatIf / emotionAnalysis
/ emotionRelief / icebreakers / behavioralNotes
```

**关键发现（地雷预警）**：
- PRD `resolveRelationTarget` 的 **P2 依赖 `parties[].relation` 或 `analysis.scene`**——**但当前 SYSTEM_PROMPT 输出的 `parties` 只有 `{id,label,quote}`，根本没有 `relation` 字段，也没有顶层 `scene` 字段**！
- 因此**现实运行中 P2 几乎不会命中**，实际判定主要靠 **P3（`parties[].label` + `coreInsight.*` 关键词）** 和 **P4（说话人标签）**。`relations.test.js` 里 P2 的用例是**人工造数据**测的，不代表生产路径。

**V2 若要支持「孩子/同事」场景识别，是否要动 prompt？——判断：**
- **最小改动路径（推荐先走）**：**不动 prompt**。只扩 `SCENE_KEYWORDS`（加「孩子/儿子/女儿」「同事/老板/领导/甲方」等）→ 靠 **P3 关键词命中 + P4 说话人标签** 即可识别新场景。**优点：零 API 成本、零 prompt 风险、可立即测**。
- **增强路径（可选，PM 需拍板）**：在 SYSTEM_PROMPT 的 `parties` schema 中**新增 `"relation": "family|partner|friend|child|colleague|other"` 字段**，让 P2 真正生效。**代价：要改 prompt（风险护栏区）、要重跑平衡检查、AI 可能新增幻觉标签**。
- ⚠️ **绝不可做**：修改 prompt 中任何**风险护栏文字**（人格标签禁令、禁止词汇、责任占比规则）——那是宪法红线（PM PRD §9 + `product-principles.md`）。

> **本文件按任务要求未做任何修改，仅勘察判断。**

---

## §4 测试影响面（`tests/`，74 用例：garden 16 + relations 28 + state 23 + utils 7）

### 4.1 各文件覆盖点

| 文件 | 用例数 | 覆盖断言点 | V2 影响 |
|---|:---:|---|---|
| `garden.test.js` | 16 | `nurtureTier` 四档边界+健壮性；`bandPath` 路径格式；季节映射；`FALLBACK_ANCHORS` 四键；`STATUS_TEXT` 表完整+宪法词快照 | ⚠️ 部分失效 |
| `relations.test.js` | 28 | `normalizeConversation` 字符边界；`countSceneHits` 三轴；`pickMainAxis` 并列优先级；`resolveRelationTarget` P1–P5 全路径；词典宪法快照 | ⚠️ **大量失效** |
| `state.test.js` | 23 | `readRelations` 脏数据守卫；`computeDedupeKey`；`applyAnalysisToGarden` 去重/超时/异常吞/none 兜底 | ⚠️ 部分失效（硬编码 4 桶的用例） |
| `utils.test.js` | 7 | `escapeHtml` XSS；`debounce` | ✅ 完全不受影响 |

### 4.2 **V2 改造后会失效的具体断言**

| 文件:行 | 失效断言 | 原因 |
|:---:|---|---|
| `garden.test.js:89–100` | `FALLBACK_ANCHORS` 断言「含 self/family/partner/friend **四键**」 | 五区域后键集会变（可能新增 child/colleague），此断言需**扩键而非改逻辑** |
| `relations.test.js:62–69` | `countSceneHits(...)`.toEqual(**`{family:0,partner:0,friend:0}`**) 精确结构匹配 | 加 child/colleague 后返回结构多 2 键 → **`toEqual` 严格失败**。⚠️ 共 2 处（63、67–68 行） |
| `relations.test.js:82–102` | `pickMainAxis({family,partner,friend})` 系列 | 若 PRIORITY 扩容后并列规则变化，需补 child/colleague 并列用例；现有 5 条多数仍可过，但**优先级链变了要复核** |
| `relations.test.js:120–124` | P2 `parties[].relation` 用例（造了 `relation` 字段） | 若 V2 走「增强路径」改 prompt schema 则保留；若走「最小路径」不改 prompt，此用例仍能过（测的是纯函数）——**但需确认 §3.3 的「生产 P2 不命中」事实** |
| `state.test.js:21–26` | `readRelations()` 数组 → `.toEqual({family,partner,friend,none})` **四桶** | 扩桶后变 6 桶 → **`toEqual` 严格失败** |
| `state.test.js:97–106` | 「family 写入不增 partner/friend/none」断言三桶为 0 | 逻辑仍成立，但**建议补 child/colleague 也为 0 的断言** |

### 4.3 V2 **需要新增**的测试

| 新增测试 | 位置 | 断言 |
|---|---|---|
| 旧数据前向兼容 | `state.test.js` | 预置 `{family,partner,friend,none}` 老结构 → `readRelations()` 后 `child/colleague` 补 0，**老桶数据零丢失** |
| child/colleague 关键词命中 | `relations.test.js` | `countSceneHits('儿子上学')` → `child≥1`；`countSceneHits('同事领导')` → `colleague≥1` |
| 五元优先级链 | `relations.test.js` | `pickMainAxis` 五轴并列时的定序（依赖 PM §6 确认） |
| 词典宪法快照扩维 | `relations.test.js:71–77` | `[].concat` 从 3 轴扩到 5 轴，禁止词断言仍过 |
| `FALLBACK_ANCHORS` 全键 | `garden.test.js:89` | 断言键集 = `ROLE_NODES` 中所有非 self 节点 + self |
| 五节点 → 五带 | 新 DOM 集成测试（如需） | 若 PM 要求「五生态区域各一条根脉」，需补端到端断言 |
| `STATUS_TEXT` 若扩档位 | `garden.test.js:102` | 保持四档断言即可（除非 PM 改档位） |

> **测试改造原则**：`toEqual` 的**精确结构匹配**是 V2 最大摩擦点——凡是断言「返回对象恰好 N 个键」的用例都会因扩容而红。**改造时优先把这些改为「包含性断言」（`toMatchObject` / 逐键 `expect`），提高对扩容的鲁棒性**。

---

## §5 V2 改造的地雷清单（按风险降序）

| 排名 | 地雷 | 位置 | 为什么会炸 | 规避 |
|:--:|---|---|---|---|
| 🔴 **1** | **击穿「读/写分离」防抖结构** | `renderRelationGraph()` 169–228 | V2 改五区域+根脉时，最自然的写法就是「循环里读一个 rect、画一条路径、再读下一个」——**这正是 layout thrashing**。五节点比三节点更严重（强制重排 ×5）。移动端会看到明显卡顿/抖动 | **强制保留两阶段骨架**：先 map 读完所有 `anchorOf`，再统一进 SVG 写入循环。**新增区域也必须在 READ 阶段一次性测量**，禁止边写边读 |
| 🔴 **2** | **硬编码节点集漏改（二次硬编码）** | `presentNodes`(129)、`updateRoleForms`(320)、`bindGardenEvents` 的 label 映射(505)、`relations.js` 的 5 处枚举(110/118/124…)、`normalizeStore`(67) | 节点集**散落在 6+ 处**。扩 5 区域时**极易漏改某处**，症状是「新节点有数据但花园不显示」或「连接带点击弹错 label」——**静默失败，不易发现** | **建立单一派生源**：`PRESENT_NODES = ROLE_NODES.filter(n=>n.id!=='self')`，所有视图逻辑从它派生。数据层 `relations.js` 的枚举改从 `PRIORITY` 派生。**改完用 grep 搜 `'family'` 复核零残留**（除词典/兜底外） |
| 🟠 **3** | **锚点重叠 / 坐标越界** | `.tree-crowns`(617, `top:-58px`) + `#animal-zone` vs `#eco-flower` | ① 树冠 `top:-58px` 已接近越出 `.garden-midlayer`；② 动物区居中(left:50%)与花(left:46%)水平重叠，`anchorOf` 取中心 → **两条根脉起点几乎重合，视觉纠缠**。五区域（尤其「同事 · 竹」类竖直元素）会加剧 | V2 必须**重新分配五区域锚点**并在 320px/375px/480px 三档实测不重叠；`FALLBACK_ANCHORS` 兜底表要**覆盖全部新节点**（漏一个 → 该节点 DOM 查询失败时坐标 `undefined` → SVG path 出现 `M undefined undefined`，整条带消失） |
| 🟠 **4** | **SVG 坐标系约定被破坏** | `ensureGraphSvg`(143–145) `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"` | 若 V2 有人「优化」成 `viewBox` 按实际像素或去掉 `preserveAspectRatio`，**整个坐标体系与 `anchorOf` 的百分比输出不匹配**，所有带错位/拉伸。`non-scaling-stroke` 去掉则描边被非等比拉伸成椭圆截面 | **把「0–100 百分比坐标系」写进设计文档约束**，V2 不得改动这三个 setAttribute |
| 🟠 **5** | **旧 localStorage 数据丢失** | `normalizeStore`(63–75) `emptyStore`(52–59) | 若 V2 为了「干净」引入版本号或重建账本，**老用户的 family/partner/friend 养分全部清零**——不可逆 | **禁止 version 迁移**，只做增量补全（见 §3.2）。**验收必须含一条「老数据读入不丢」用例** |
| 🟡 **6** | **`!important` 死灰复燃 / 层级 z-index 冲突** | 新增区域 CSS | V1 刚清完历史 `!important`；V2 若因新元素被旧规则覆盖而「顺手加 `!important`」，会重新腐化。且 `z-index`：canvas(2)/midlayer(3)/fore(4)/floor(5)/relation-graph(6) 已排满，**新增生态区域若 z-index 打架会被遮挡** | 新规则**禁止 `!important`**（reduced-motion 除外）；新元素 z-index 明确落在既有层级内（根脉 SVG 恒为顶层 z-index:6） |
| 🟡 **7** | **测试 `toEqual` 精确结构匹配批量爆红** | `relations.test.js:63,67` + `state.test.js:21` | 扩容后返回对象多 2 键 → `toEqual` 严格比较失败。若开发者为了让测试过而**把生产代码 hack 回 3 键**，等于埋雷 | **先改测试再改码**：把结构断言改为包含性断言（见 §4.3） |
| 🟢 8 | 连接带点击 label 文案错位 | `bindGardenEvents:505` | label 映射 `{family,partner,friend}` 硬编码，新节点点击弹「这段关系」兜底文案（不崩但体验降级） | 从 `ROLE_NODES` 的 `label` 派生 |

---

## §6 待产品确认项（PM §7/§10 未覆盖的空白）

> 以下为**勘察中发现、PM 现有 PRD 未见明确覆盖**的开放问题，需 PM 拍板后才能锁定架构。

1. **场景关键词优先级链（PRIORITY）扩容后的定序**：现有 `partner > family > friend`。新增 `child`（孩子，血缘属 family 子集）与 `colleague` 后，并列时谁优先？
   - 隐患：`child` 与 `family` 高度耦合——「儿子/女儿」当前**已经**在 `family` 词条里（relations.js:17）。**是抽出 child 独立成节点，还是保留在 family 内？** 这直接决定数据模型是 5 桶还是 6 桶。**建议：若真要独立成「孩子·××」生态区域，须先从 family 词条里移除 overlap 词，否则同一句话会双轴命中**。
2. **五生态区域与现有 4 角色的映射关系**：PM 说「五生态区域」，但当前是 4 个视觉角色（self+family/partner/friend）。**第五个是谁？** 是 self（自我）算一个区域，还是新增第 5 类关系？若是后者，是否就是 child 或 colleague 之一？—— 需明确「五区域 = {自我 + 4 类关系}」还是「五类关系」。
3. **「根脉形态」的视觉定义缺技术口径**：PRD 提「根脉」，但**未给几何规格**：是每条连接带都变成树根状曲线？还是有统一的「主干 + 分叉」结构？是否仍为「自我为根的星形」（沿用 PRD Q1-A）？—— 需明确，否则 `renderRelationGraph` 重写无靶心。
4. **`api/_core.js` prompt 是否要动**（§3.3）：是走「最小路径（只扩词典，不改 prompt）」还是「增强路径（prompt 新增 `relation` 字段）」？涉及 API 行为与宪法护栏，**必须 PM 拍板**。
5. **旧用户数据是否需要「不回显」承诺延续**：现有设计「只存哈希不存明文」。新增 child/colleague 后，**孩子相关对话的隐私敏感度更高**（涉及未成年人），是否需要额外的本地存储策略（如不落 child 事件详情）？—— 宪法层面问题，建议 PM 确认。

---

## 附：勘察证据索引（文件:行号 可核对）

- DOM：`index.html` 229–331（花园页），324–327（导航图标）
- CSS：`src/style.css` 513–693（花园全段），553–571（星图），589–595（导航几何），688–693（响应式），570（唯一 `!important`）
- garden：`src/modules/garden.js` 全文 528 行（导出 12 个）
- relations：`src/core/relations.js` 全文 147 行（`SCENE_KEYWORDS` 14–22，`PRIORITY` 25，`resolveRelationTarget` 108–166）
- state：`src/core/state.js` 全文 205 行（`emptyStore` 52–59，`normalizeStore` 63–75，`applyAnalysisToGarden` 153–221）
- 写入口调用方：`src/modules/report.js:633`（唯一），`src/main.js:15`（init 编排）
- 测试：`tests/garden.test.js`(16) / `relations.test.js`(28) / `state.test.js`(23) / `utils.test.js`(7) = **74 用例**
- AI 输出结构：`api/_core.js` 40–92（schema），11–103（SYSTEM_PROMPT），**未修改**

**报告完 · 全部数据经实测，可逐行核对。本次勘察为只读，未改动任何源码或已有文档。**
