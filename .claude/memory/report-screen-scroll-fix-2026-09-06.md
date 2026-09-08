# 报告页「看不到」根因修复记录（2026-09-06）

> 结论：上一轮「看不到分析报告」的根因**不是**渲染逻辑，而是 **CSS 滚动缺失**。报告其实一直在渲染，只是被 `body{overflow:hidden}` 裁掉了、且无法滚动，用户只能看到第一屏，误以为「看不到」。

## 三个真 bug（本次全部修复）

### 1. 报告页无法滚动（核心根因）
- `body{overflow:hidden}`（style.css 第 14 行），所有内容滚动都靠**每个屏幕自己** `overflow-y:auto`。
- `#input-screen` / `#space-screen` / `#garden-screen` 都有 `height:100vh;overflow-y:auto`，**唯独 `#report-screen` 没有**。
- 结果：报告渲染成功（scrollHeight 8656px），但只有前 844px 可见、无法滚动。
- 修复：`#report-screen` 补上 `height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch`。

### 2. 花园暖光 canvas 报错 `bgGrad is not defined`
- [src/main.js](src/main.js) 的 `renderWarm()`（暮光暖庭动画）里 `ctx2.fillStyle = bgGrad;` 引用了未定义的变量，每次动画帧抛错、动画中断。
- 修复：删除该行（上面已用 `#FDF0E0` 均匀填充，注释本就写着「整屏均匀暖米色」）。

### 3. 等待页卡片宽度坍缩
- `.loading-msg` 是 `position:absolute`，不参与撑开父容器宽度；`.loading-card` 又只有 `max-width:300px` 没有 `width`。
- 结果：卡片坍缩到只剩图标宽度（114px），等待文案在 66px 里竖排成 119px 高、溢出、排版极丑。
- 修复：`.loading-card` 加 `width:100%;max-width:320px`，`.loading-msg-wrap` 加 `width:100%`。实测卡片 114px→320px。

## 验证方式（headless）
- 用 `puppeteer-core` + Edge headless 驱动 `/`：填对话 → 点分析 → 等角色选择器 → 选「整体结论」→ 断言 `#report-screen.active` + `#core-insight` 有内容 + `scrollTop` 可滚动 + 无 `pageerror`。全绿。
- 唯一残留是 favicon 404（无害，浏览器自动请求 `/favicon.ico`）。

## 架构约定（重要，非显然）
**知间所有页面滚动都靠「每个 `.screen` 自己 `height:100vh;overflow-y:auto`」，因为 `body` 是 `overflow:hidden`。** 以后新增任何全屏 screen，必须记得带这两个属性，否则内容会被裁掉且无法滚动。
