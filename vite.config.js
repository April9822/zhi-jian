import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// 读取 .env.local 中的环境变量（本地开发用）
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  }
}

// 本地 API 代理插件（模拟 Vercel Serverless Function）
function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      loadEnvLocal();

      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end(JSON.stringify({ error: '仅支持 POST' }));
          return;
        }

        // 读取请求体
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        const { conversation, userRole } = JSON.parse(body);

        if (!conversation || conversation.trim().length < 10) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '对话内容太短' }));
          return;
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'API Key 未配置' }));
          return;
        }

        // 使用动态 import 避免顶层 ESM 问题
        try {
          const analysisResult = await runAnalysis(conversation, userRole, apiKey);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(analysisResult));
        } catch (err) {
          console.error('分析失败:', err);
          res.writeHead(502);
          res.end(JSON.stringify({ error: 'AI 服务暂时不可用: ' + err.message }));
        }
      });
    },
  };
}

// ============================================================
// 分析逻辑（与 api/analyze.js 保持一致）
// ============================================================

const SYSTEM_PROMPT = `你是「知间 InBetween」——一位智者。一位值得信赖、公平公正、有大智慧的朋友。

你不是法官，不是心理医生，不是AI判官。你是一个在用户最混乱的时候，帮他/她理清思路的第三方。

## 核心原则
1. **不判对错**——不给百分比分数。不说"你错了65%"。你要做的是翻译双方真正在说什么。
2. **不贴人格标签**——严禁使用以下词汇：回避型人格、NPD、BPD、边缘型、自恋型人格、讨好型人格、控制型人格。如果必须描述行为，说"在这次对话中，你倾向于沉默"而非"你是回避型"。
3. **双侧分析**——即使只有单方提供的对话，也必须为缺席方构建"最佳解释"（principle of charity）。假设TA的动机是善意的。
4. **不劝分、不劝离、不劝辞职**——你不对用户的人生重大决定做任何建议。
5. **建议必须具体可操作**——不说"好好沟通"，说"可以试试这句话：'我不是在指责你，我只是……'"
6. **语气**——像一个有智慧的长辈朋友。不多说，但每句都在点上。接纳但不讨好。理性但不冷漠。

## 输出格式
你必须严格按照以下 JSON 格式返回。不要添加任何 JSON 之外的文字。

{
  "coreInsight": {
    "title": "一句话核心洞察（不超过20字）",
    "summary": "用温暖、有洞察力的语言总结这场冲突的本质。2-3句话。",
    "conflictType": "冲突类型（期待落差 / 翻旧账 / 沟通错位 / 价值观差异）",
    "realTopic": "表面上在吵什么，实际上在吵什么"
  },
  "dualAnalysis": {
    "sideA": {
      "label": "A",
      "said": "A 说的一句代表性的话",
      "heardByB": "这句话被 B 听到的是什么",
      "realMeaning": "A 真正想表达什么",
      "innerVoice": "A 的内心活动"
    },
    "sideB": {
      "label": "B",
      "said": "B 说的一句代表性的话",
      "heardByA": "这句话被 A 听到的是什么",
      "realMeaning": "B 真正想表达什么",
      "innerVoice": "B 的内心活动"
    },
    "gap": "裂缝标注——1-2句话总结。"
  },
  "replay": [
    {
      "round": 1,
      "speaker": "A",
      "text": "原句",
      "annotation": "知间的暂停解说",
      "isTurningPoint": false,
      "alternativeResponse": "如果当时可以这样说……"
    }
  ],
  "whatIf": {
    "originalFlow": "现实中对话的走向",
    "alternativeFlow": "如果用了知间的建议，可能走向",
    "sideBySide": [
      { "round": 1, "speaker": "A", "original": "现实中说的", "alternative": "如果这样说" }
    ]
  },
  "icebreakers": [
    { "style": "柔软风", "text": "一条破冰话术" },
    { "style": "幽默风", "text": "一条破冰话术" },
    { "style": "直接风", "text": "一条破冰话术" }
  ],
  "behavioralNotes": {
    "sideA": "A方行为观察（2-3句）",
    "sideB": "B方行为观察（2-3句）"
  }
}

## 对话分析要点
1. 标注关键转折点——哪句话之后话题开始跑偏
2. 识别"假性投降"——当一个人说"好好好都是我的错"时，常常不是真的认错
3. 关注中国式表达："随便""你看着办吧""呵呵""没事"——这些词在不同上下文中有完全不同的含义
4. 面子损伤节点——什么时候一方感到"丢脸"或不被尊重

现在，请分析以下对话。`;

async function runAnalysis(conversation, userRole, apiKey) {
  const userPrompt = `用户标注自己的身份为：${userRole === 'A' ? 'A' : userRole === 'B' ? 'B' : '未标注（AI自动判断）'}。

对话记录：
${conversation}

请严格按照 System Prompt 要求的 JSON 格式输出七维分析报告。只输出 JSON，不要加任何其他文字。`;

  // 第一次调用：分析
  const resp1 = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!resp1.ok) {
    const err = await resp1.text();
    throw new Error(`DeepSeek API 错误 (${resp1.status}): ${err.substring(0, 200)}`);
  }

  const data1 = await resp1.json();
  let text = data1.choices?.[0]?.message?.content || '';
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch {
    throw new Error('AI 返回格式异常，请重试');
  }

  // 第二次调用：平衡检查
  try {
    const balancePrompt = '请检查你上面的分析。在你的分析中，是否有一方被更严厉地评判？如果是，请重新平衡。如果分析是平衡的，直接返回原来的 JSON，不要修改。只返回 JSON，不要加任何其他文字。';
    const resp2 = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: JSON.stringify(analysis) },
          { role: 'user', content: balancePrompt },
        ],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (resp2.ok) {
      const data2 = await resp2.json();
      let balancedText = data2.choices?.[0]?.message?.content || '';
      balancedText = balancedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        const balanced = JSON.parse(balancedText);
        if (balanced && balanced.coreInsight) {
          analysis = balanced;
        }
      } catch { /* 保留原始分析 */ }
    }
  } catch { /* 保留原始分析 */ }

  return { success: true, analysis };
}

export default defineConfig({
  plugins: [apiProxyPlugin()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});
