# 知间代码质量规范

> 此规则自动加载。所有代码产出必须遵守。

---

## 一、技术栈约束

### 必须使用
- **构建**：Vite
- **前端**：HTML + CSS + 原生 JavaScript
- **后端**：Vercel Serverless Function
- **AI**：DeepSeek API

### 禁止使用
- **禁止**：任何前端框架（React / Vue / Angular / Svelte）
- **禁止**：任何CSS框架（Bootstrap / Tailwind / Material UI）
- **禁止**：任何JS绘图库（Chart.js / D3.js / ECharts）
- **禁止**：任何第三方追踪/分析/CDN脚本

**原因**：V1.0 需求简单，原生技术足够。不引入框架依赖，保持轻量和可控。

## 二、文件组织规范

```
zhi-jian/
├── index.html              # Welcome 首页（自包含单文件）
├── src/
│   ├── main.js             # 全局状态管理 + 页面路由
│   ├── style.css           # 全局样式 + CSS自定义属性
│   ├── welcome.js          # Welcome动画逻辑
│   ├── input.js            # 输入页逻辑 + 身份标注
│   ├── report.js           # 报告页逻辑 + 分层揭示
│   └── garden.js           # 关系花园逻辑
├── api/
│   └── analyze.js          # AI分析（Vercel Serverless Function）
├── .claude/
│   ├── agents/             # 智能体定义
│   ├── rules/              # 规则文件
│   ├── workflows/          # 工作流脚本
│   └── settings.json       # 钩子配置
├── vite.config.js
├── vercel.json
└── package.json
```

## 三、HTML 规范

### 必须
- 使用 `<!DOCTYPE html>`
- `<meta charset="UTF-8">`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- 语义化标签（`<main>` / `<section>` / `<article>` / `<nav>`）
- 完全自包含（不引入任何外部资源）

### 禁止
- 内联事件处理器（`onclick="..."`）→ 使用 `addEventListener`
- `<br>` 做布局间距
- `<table>` 做布局
- 空标签做装饰（用CSS伪元素）

## 四、CSS 规范

### 必须
- CSS 自定义属性（CSS Variables）定义在 `:root`
- 类名使用 kebab-case（`.emotion-curve` / `.nurture-garden`）
- 移动端优先（基础样式为移动端，`@media (min-width)` 增强桌面端）
- 所有颜色使用 DESIGN-COLOR-SYSTEM 中定义的色值

### 禁止
- `!important`（除非覆盖第三方样式，但知间没有第三方）
- ID 选择器做样式（`#header { }`）→ 使用 class
- 超过3层的嵌套选择器
- 固定像素宽度（使用 max-width / % / vw / rem）
- 内联样式（`style="..."`）

## 五、JavaScript 规范

### 必须
- `'use strict'` 严格模式
- `const` / `let`（禁止 `var`）
- 模板字符串（`` `你好，${name}` ``）替代字符串拼接
- 箭头函数用于回调
- `async/await` 用于异步操作
- `try/catch` 包裹所有 API 调用
- `addEventListener` 而非 `onclick`

### 禁止
- `var` 声明
- `eval()`
- `document.write()`
- 全局变量（所有变量必须有作用域）
- 轮询（`setInterval` 检查状态）→ 使用 `async/await`
- 同步 XHR → 使用 `fetch`

## 六、注释规范

### 必须
- 所有注释使用**中文**
- 每个函数有简要说明
- 复杂逻辑有步骤注释
- API调用的成功/失败路径都有注释

### 示例
```javascript
// 发起AI分析请求
async function analyzeChat(chatText, userRole) {
  try {
    // ① 构建请求体
    const body = { chat: chatText, role: userRole }

    // ② 调用后端API（Vercel Serverless）
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    // ③ 处理响应
    if (!response.ok) {
      throw new Error(`分析失败：${response.status}`)
    }
    return await response.json()
  } catch (error) {
    // ④ 降级处理：展示错误提示
    console.error('AI分析出错:', error)
    throw error
  }
}
```

## 七、错误处理规范

### 必须处理的错误场景
1. **网络错误**：API 无法连接
2. **超时错误**：分析超过 60 秒
3. **内容错误**：API 返回非预期格式
4. **输入验证**：用户输入不符合要求

### 错误展示
- 错误提示用温和的语气（不是冷冰冰的报错）
- 例如："抱歉，分析暂时卡住了。你可以稍等几秒再试试。"
- 而非："Error: API timeout (500)"

## 八、性能规范

- 首屏加载 < 3 秒
- 无渲染阻塞资源
- CSS 动画使用 `transform` 和 `opacity`（GPU加速）
- 避免 `@keyframes` 中动画 `width/height`（触发重排）
- 图片资源不超 100KB（V1 无外部图片所以无此问题）

## 九、安全规范

- 用户输入在展示前必须转义（防XSS）
- API请求不包含用户身份信息（V1无登录所以天然满足）
- 前端不存储任何对话内容（V1策略：分析完成即丢弃）
- 不在控制台输出用户对话内容

## 十、禁止出现的代码模式

```
❌ onclick="analyze()"          → ✅ addEventListener
❌ var x = 1                    → ✅ const x = 1
❌ <div style="color: red">     → ✅ CSS class + :root变量
❌ eval(userInput)              → ✅ 永远不要eval
❌ innerHTML = userInput        → ✅ textContent = userInput
❌ document.write(...)          → ✅ DOM API
❌ fetch().then().catch()       → ✅ async/await + try/catch
❌ setTimeout 模拟等待           → ✅ async/await
❌ #FFFFFF / #000000            → ✅ DESIGN-COLOR-SYSTEM色值
❌ @import url(...)             → ✅ 全内联，不import
```
