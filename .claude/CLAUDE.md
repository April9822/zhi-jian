# 知间 InBetween · CLAUDE.md

> 本文件是知间项目的主入口。所有在此项目目录下工作的智能体必须先读此文件。

## 知间是什么

> **知间不是聊天记录分析工具，是「关系成长型产品」。**
>
> 核心价值：帮助用户看见关系、读懂自我、练习高质量沟通、修复亲密关系。

- 🇨🇳 中文名：**知间**
- 🌐 英文名：**InBetween**
- 📢 Slogan：理解人与人之间。Understand what's between.
- 🎭 品牌人格：**智者**（良师益友）——可信任、公平、有温度、不说教
- 🌱 核心隐喻：**关系花园**

## 知间宪法

所有行为和产出必须遵守三大禁止：
1. **禁止评判人格**（不使用人格诊断标签）
2. **禁止定义对错**（不判谁输谁赢、不给责任百分比）
3. **禁止贴负面标签**（只描述行为，不贴标签）

所有分析/页面/功能必须遵循三层结构：
```
看见事实 → 理解关系 → 练习成长
```

详见：[产品核心原则](.claude/rules/product-principles.md)

## 当前状态

| 维度 | 状态 |
|------|:---:|
| 项目编号 | #1（April 的第一个实战项目） |
| 阶段 | 🟡 产品架构设计 |
| 代码 | ❌ 零代码（`index.html`/`src/`/`api/` 待创建） |
| 脚手架 | ✅ Vite + package.json |
| 产品文档 | ✅ 完整的 V1.0 产品说明 + 竞品调研 + HCI评估 + 脑暴 |
| 设计资产 | ✅ 色彩系统 + Welcome V10 动画规范 |
| 产品方案升级 | 🟡 从「冲突解剖师」升级到「关系操作系统」，衔接中 |

## 项目结构

```
zhi-jian/
├── .claude/
│   ├── agents/                # 8个智能体定义
│   │   ├── system-architect.md    # 知间AI系统架构师
│   │   ├── product-designer.md    # 知间产品设计师
│   │   ├── ux-designer.md         # 知间UX设计师
│   │   ├── security-reviewer.md   # 知间安全隐私审查
│   │   ├── ai-engineer.md         # 知间AI工程师
│   │   ├── frontend-engineer.md   # 知间前端工程师
│   │   ├── qa-tester.md           # 知间QA测试员
│   │   └── idea-curator.md        # 知间Idea馆长
│   ├── rules/                 # 4个规则文件（自动加载）
│   │   ├── iteration-workflow.md  # 小步迭代工作约定
│   │   ├── product-principles.md  # 产品核心原则（知间宪法）
│   │   ├── design-system-guard.md # 设计系统守护
│   │   ├── ai-analysis-pipeline.md # AI分析管线规范
│   │   └── code-quality.md        # 代码质量规范
│   ├── workflows/             # 工作流脚本
│   ├── memory/                # 项目记忆
│   └── settings.json          # 权限 + 钩子 + 规则配置
├── src/                       # 前端代码（待创建）
├── api/                       # 后端API（待创建）
├── index.html                 # 首页（待创建）
└── package.json               # Vite 配置
```

## 智能体体系

知间使用 8 个专业化智能体协作工作，按上游→下游顺序：

| # | 智能体 | 类型 | 职责 |
|:--:|------|------|------|
| 1 | 🧠 知间AI系统架构师 | 上游·设计 | 产品定位把关、AI管线设计、技术选型、架构决策 |
| 2 | 📐 知间产品设计师 | 上游·设计 | 信息架构、页面流程、模块体系、6阶段旅程落地 |
| 3 | 🎨 知间UX设计师 | 上游·设计 | 交互细节、视觉调性、动效规范、色彩守护 |
| 4 | 🛡️ 知间安全隐私审查 | 独立·审查 | 数据安全、Prompt风险护栏、合规检查、一票否决权 |
| 5 | 🔧 知间AI工程师 | 下游·实现 | Prompt工程、API实现、Few-shot示例库、禁止词汇库 |
| 6 | 💻 知间前端工程师 | 下游·实现 | 组件开发、动画实现、响应式适配、自包含HTML |
| 7 | 🧪 知间QA测试员 | 下游·验证 | 多场景测试、边界用例、回归测试、禁止词汇扫描 |
| 8 | 📚 知间Idea馆长 | 独立·创意 | April的创业Idea记录完善、对话式打磨、Idea Vault维护 |

## 工作流

完整的「设计→审查→开发→测试」流程：

```
阶段1: 设计（串行）
  架构师 → 产品设计师 → UX设计师
           ↓
阶段2: 审查（独立并行）
  安全隐私审查（一票否决权）
           ↓
阶段3: 开发（并行）
  AI工程师 + 前端工程师
           ↓
阶段4: 测试（独立）
  QA测试员（4场景+边界+回归+禁止词汇扫描）
           ↓
阶段5: 你（April）敲板
```

## 关键文档引用

### 本项目文档
- [产品核心原则](.claude/rules/product-principles.md)
- [设计系统规范](.claude/rules/design-system-guard.md)
- [AI分析管线规范](.claude/rules/ai-analysis-pipeline.md)
- [代码质量规范](.claude/rules/code-quality.md)
- [小步迭代约定](.claude/rules/iteration-workflow.md)
- [色彩系统](DESIGN-COLOR-SYSTEM.md)
- [Welcome V10规范](.claude/memory/welcome-v10-spec.md)
- [QA自检日志](QA-LOG.md)

### 上游研究文档
- [产品说明 V1.0](../idea-vault/product-brief-argument-anatomist.md)
- [竞品与市场调研](../research/2026-07-17-调研报告-竞品与市场.md)
- [头脑风暴](../research/2026-07-17-头脑风暴.md)
- [HCI心理学评估](../research/2026-07-17-HCI分析.md)

### 其他项目
- [Idea Vault 索引](../idea-vault/INDEX.md)

## 工作约定

1. **先设计后编码**：在写任何代码前，先让架构师→产品→UX走完设计流程
2. **小步迭代**：每次只改一个组件/区域，走完「确认→执行→验证」
3. **知间宪法不可违反**：任何智能体产出如果违反三大禁止，视为事故
4. **安全审查一票否决**：未通过安全审查的代码不得上线
5. **中文优先**：代码注释用中文，对April的回复用中文
6. **数据只读**：`data/` 和 `research/` 和 `idea-vault/` 下的原始文件不可修改
7. **不轻易删除**：暂时不用的内容标注 `📝 [已归档-待确认删除]`，确认没影响后再删
