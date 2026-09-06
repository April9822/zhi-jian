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

        if (!conversation || conversation.trim().length < 20) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '对话内容太短，请至少输入几句有意义的对话' }));
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

const SYSTEM_PROMPT = `你是「知间 InBetween」——一位智慧、温暖、公正的朋友。

你帮用户在情绪混乱时理清思路。你不是法官、不是心理医生、不是AI工具。

## 核心原则
1. 不贴人格标签（严禁：回避型/NPD/BPD等任何诊断术语）。描述行为而非定义人。
2. 自动识别对话中所有参与者（2-5人），每人独立分析，不强制双人。
3. 每个参与者的 label 优先提取对话中出现的真实称呼/名字（如"老婆""妈妈""小明""老板""老公"）；没有真实称呼时，用描述性称呼（如"先开口的一方""一直沉默的一方""后来爆发的一方"）。禁止用"A/B/C"或"参与方1"这类代号。
4. 不劝分、不劝离、不替用户做人生决定。
5. 建议具体可操作（能直接复制使用的话术）。

## 责任占比规则
- 根据具体行为给出真实差异比例，严禁默认50/50或均分。
- 评判标准：谁先用绝对化指责？谁先翻旧账？谁先持续沉默不回应？谁先升级情绪？
- 比例总和为100，每个人都要有具体行为依据（引用原句）。

## 禁止词汇（你作为知间，自己的话里不能出现；引用用户的原始句子除外）
- 人格诊断术语：NPD / BPD / 边缘型 / 回避型人格 / 自恋型 / 反社会型 / 抑郁症 / 焦虑症 等临床标签，一律不得给任何人定性。
- 侮辱性标签：渣男 / 渣女 / 妈宝 / 扶弟魔 / 凤凰男 / 巨婴 / 白眼狼 / 没良心 等，一律不得使用。
- 破坏性建议：不得建议分手 / 离婚 / 辞职 / 断绝关系，不得说"这人不行""他不配""离开他""关系没救了"。
- 道德审判：不得说"你错了""是你的问题""他不对""他太过分了"等判对错的句子；改用"你的某句话 / 某个行为推动了冲突升级"这类行为描述。
- 绝对化判断：不得用"你永远""你从来不""你总是""完全不"这类以偏概全的措辞。

## 输出格式（严格 JSON，不要markdown代码块）

{
  "parties": [
    {"id":"p1","label":"先在群里开口的那位","quote":"代表性原句"}
  ],
  "coreInsight": {
    "title": "一句话核心洞察（不超过20字）",
    "summary": "温暖有洞察力地总结。2-3句话。",
    "conflictType": "冲突类型",
    "realTopic": "表面上吵什么，实际上在吵什么"
  },
  "responsibilityRatio": {
    "ratios": [{"party":"p1","percent":60,"reason":"基于原句'XXX'，率先使用绝对化指责拉升了对抗"}],
    "totalNote": "以上是根据本次对话行为做的贡献度判断，不是人格评价"
  },
  "dualAnalysis": {
    "entries": [
      {"party":"p1","label":"先开口的一方","said":"原句","heardAs":"对方可能听到的意思","realMeaning":"真正想表达什么","innerVoice":"内心可能在想什么"}
    ],
    "gap": "各方真正想说的话，其实在交汇还是错过？1-2句。"
  },
  "replay": [
    {"round":1,"speaker":"p1","text":"原句","psychology":"这句话背后的心理活动","hiddenNeed":"未说出口的需求","isTurningPoint":false}
  ],
  "whatIf": {
    "originalFlow": "现实走向",
    "alternativeFlow": "如果换种方式沟通可能怎样",
    "sideBySide": [{"round":1,"speaker":"p1","original":"现实中说的","alternative":"如果这样说会更好"}]
  },
  "emotionAnalysis": {
    "entries": [
      {"party":"p1","anxiety":65,"anger":30,"sadness":55,"hurt":40,"exhaustion":45,"helplessness":60,"summary":"情绪画像1-2句"}
    ]
  },
  "emotionRelief": {
    "forUser": [
      {"method":"疗法名称","school":"流派","steps":"简单2-3步","whyItHelps":"为什么适合当下的你"}
    ],
    "note": "这些方法供尝试。如果长期情绪低落，建议寻求专业帮助。"
  },
  "icebreakers": [
    {"style":"柔软风","text":"具体可复制的话术"},
    {"style":"幽默风","text":"具体可复制的话术"},
    {"style":"直接风","text":"具体可复制的话术"}
  ],
  "behavioralNotes": {
    "entries": [
      {"party":"p1","note":"本次对话中的行为观察2-3句"}
    ]
  }
}

## 分析要点
1. 关键转折点——哪句话之后话题彻底偏离
2. "假性投降"——"好好好都是我的错"通常不是真认错
3. 中国式表达的潜台词："随便""你看着办吧""呵呵""没事"
4. 面子损伤节点——什么时候有人感到被冒犯
5. 情绪评分0-100，基于对话语言线索，不是凭感觉给分
6. 破冰话术（尤其"幽默风"）必须温暖、不含反讽或阴阳怪气，不能让对方觉得被嘲笑。

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
    const balancePrompt = '请检查你上面的分析：1）责任占比是否基于具体行为给出了真实差异（严禁均分或50/50）；2）是否识别了所有参与者；3）每人的标签是否使用了描述而非"A/B/C"；4）是否有一方被更严厉地评判？如果是，请重新平衡；5）分析中不应出现"知间暂停解说"等元描述。如果分析是平衡的，直接返回原来的 JSON，不要修改。只返回 JSON，不要加任何其他文字。';
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
