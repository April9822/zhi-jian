# 知间 InBetween

> 理解人与人之间。Understand what's between.

---

## 项目结构

```
zhi-jian/
├── index.html          # 主页面（输入 + 五屏报告）
├── src/
│   ├── main.js         # 前端逻辑
│   └── style.css       # 智者品牌调性样式
├── api/
│   └── analyze.js      # AI 分析引擎（Vercel Serverless）
├── vite.config.js      # Vite 配置
├── vercel.json         # Vercel 部署配置
└── package.json
```

## 技术栈

- **前端**：HTML + CSS + 原生 JavaScript（Vite 构建）
- **后端**：Vercel Serverless Function
- **AI**：DeepSeek API（chat/completions）
- **部署**：Vercel

## 本地开发

```bash
npm install
npm run dev
```

## 部署到 Vercel

### 前提条件
1. 注册 [Vercel](https://vercel.com) 账号（用 GitHub 登录）
2. 拥有 DeepSeek API Key

### 步骤

1. **安装 Vercel CLI**（可选）：
   ```bash
   npm i -g vercel
   ```

2. **推送代码到 GitHub**：
   ```bash
   git init
   git add .
   git commit -m "知间 V1.0 初始版本"
   git remote add origin https://github.com/April9822/zhi-jian.git
   git push -u origin main
   ```

3. **在 Vercel 导入项目**：
   - 打开 vercel.com → New Project
   - 选择 `zhi-jian` 仓库
   - Framework: Vite
   - 设置环境变量：`DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - 点击 Deploy

4. **访问**：Vercel 会自动分配一个域名（如 `zhi-jian.vercel.app`）

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

## V1.0 功能

- ✅ 粘贴微信聊天记录
- ✅ AI 标识用户身份（A/B/自动）
- ✅ 五屏冲突分析报告（核心结论 → 双向双栏 → 对话回放 → 如果重来 → 破冰）
- ✅ 风险护栏（不判对错、不贴人格标签、双侧分析）
- ✅ 分享 TA 的那一半（匿名链接）
- ✅ 移动端响应式
