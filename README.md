# 知间 InBetween

> 理解人与人之间。Understand what's between.
>
> 🟡 **当前阶段**：可用原型迭代 — V1.0 核心流程已跑通，进入视觉/体验打磨

---

## 项目状态

| 维度 | 状态 |
|------|:---:|
| 产品方案 | 🟡 从 V1.0 升级到「关系操作系统」方案 |
| 代码 | ✅ 前端 8 屏 + 后端 AI 分析 API 已实现 |
| 脚手架 | ✅ Vite + package.json |
| 智能体体系 | ✅ 8个专业智能体已部署 |
| 规则体系 | ✅ 4个规则文件 + 3个hooks |

## 快速开始

```bash
npm install
npm run dev
```

## 当前任务

👉 V1.0 核心流程（倾诉 → 分析 → 报告 → 花园）已跑通，下一步集中在**视觉与体验打磨**：

- 报告页内容顺序与视觉层级梳理
- 花园 / 空间页 P2 视觉重设计（待设计稿）

## 知间智能体体系

知间使用 8 个专业智能体协作工作：

| 智能体 | 角色 |
|--------|------|
| 🧠 知间AI系统架构师 | 产品全局架构决策者 |
| 📐 知间产品设计师 | 信息架构与功能模块设计 |
| 🎨 知间UX设计师 | 交互体验与视觉调性 |
| 🛡️ 知间安全隐私审查 | 数据安全与AI伦理独立审查 |
| 🔧 知间AI工程师 | Prompt工程与AI分析管线 |
| 💻 知间前端工程师 | 前端组件与动画实现 |
| 🧪 知间QA测试员 | 多场景质量测试 |
| 📚 知间Idea馆长 | April的创业Idea记录与完善 |

详见 [.claude/CLAUDE.md](.claude/CLAUDE.md)

## 项目结构

```
zhi-jian/
├── .claude/
│   ├── agents/           # 8个智能体定义
│   ├── rules/            # 4个规则文件（自动加载）
│   ├── workflows/        # 工作流脚本
│   ├── memory/           # 项目记忆
│   ├── settings.json     # 钩子+权限配置
│   └── CLAUDE.md         # 项目主入口（必读）
├── src/                  # 前端代码（main.js + style.css）
├── api/                  # 后端 API（analyze.js，DeepSeek）
├── index.html            # 首页（自包含单文件，8 个全屏 screen）
└── package.json          # Vite 配置
```

## 知间宪法

所有智能体和代码必须遵守：

1. **禁止评判人格**（不使用人格诊断标签）
2. **禁止定义对错**（不判输赢、不给责任百分比）
3. **禁止贴负面标签**（只描述行为，不贴标签）

所有分析/页面/功能遵循：**看见事实 → 理解关系 → 练习成长**

## 相关文档

- [产品说明 V1.0](../idea-vault/product-brief-argument-anatomist.md) 📝 [待升级：融合关系操作系统方案]
- [竞品与市场调研](../research/2026-07-17-调研报告-竞品与市场.md)
- [头脑风暴报告](../research/2026-07-17-头脑风暴.md)
- [HCI心理学评估](../research/2026-07-17-HCI分析.md)
- [色彩系统](DESIGN-COLOR-SYSTEM.md)
- [QA自检日志](QA-LOG.md)

## 技术栈

- **前端**：HTML + CSS + 原生JavaScript（Vite构建）
- **后端**：Vercel Serverless Function
- **AI**：DeepSeek API
- **部署**：Vercel
